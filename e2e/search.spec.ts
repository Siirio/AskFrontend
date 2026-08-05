import { expect, test, type Page } from "@playwright/test";

import { pinLocale } from "./helpers";

// The search slice (roadmap Phase 1 #2): Home's search form + mode toggle,
// and the Catalog Page's sectioned results, sort, and filters.
//
// The Catalog Page fetches `POST /api/v1/search` SERVER-SIDE (D7) — a
// request made by the Next.js process itself, never the browser — so
// `page.route` cannot intercept it (that only sees the browser's own
// requests, which is why it still works for the client-side `/auth/session`
// call below). `e2e/mock-backend.mjs` stands in for the real backend
// instead (wired in playwright.config.ts); its scenarios are selected by the
// query text — see that file's header for why.

const CUSTOMER_SESSION = {
  access_token: null,
  token_type: "Bearer",
  role: "CUSTOMER",
  start_route: "CLIENT_SEARCH",
  user: {
    user_id: "22222222-2222-2222-2222-222222222222",
    display_name: "Test Customer",
    email: "t@example.com",
    status: "ACTIVE",
  },
  all_roles: ["CUSTOMER"],
};

async function seedSession(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("ask.accessToken", "search-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: CUSTOMER_SESSION }),
  );
  // The default locale is kk (shared/i18n/locales.ts) — pin `ask.locale` (D19)
  // to `en` so assertions read stable English strings. Derived from baseURL by
  // the shared helper, never a literal origin (AUDIT_2 D-6).
  await pinLocale(page, "en");
}

test("Home renders the query input and the mode toggle, and submitting navigates to Catalog", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app");

  await expect(
    page.getByRole("textbox", { name: "Search query" }),
  ).toBeVisible();
  const serviceOption = page.getByTestId("mode-card-service");
  await expect(serviceOption).toBeVisible();
  await serviceOption.click();

  await page.getByRole("textbox", { name: "Search query" }).fill("roses");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/app\/catalog\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("query")).toBe("roses");
  expect(url.searchParams.get("mode")).toBe("SERVICE");
});

test("Home refuses to submit an empty query, and never navigates", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app");

  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("Enter what you're looking for.")).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
});

test("a blank/missing query on the Catalog URL renders validation, not a search attempt", async ({
  page,
}) => {
  await seedSession(page);

  // No `query` param at all — a typed/bookmarked/hand-edited URL. The route
  // file's own guard (never call `search()` with a known-invalid request,
  // P9.4) is what this proves: if it were bypassed, the mock backend would
  // answer as a normal search (see `sectionsResponse`'s echoed `raw_query`)
  // instead of this validation state ever appearing.
  await page.goto("/app/catalog?mode=ITEM");

  await expect(page.getByText("Enter what you're looking for.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible();
});

test("Catalog Page renders sectioned results with the ALTERNATIVE reason", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-sections&mode=ITEM");

  await expect(page.getByText("Aigul Flowers").first()).toBeVisible();
  await expect(page.getByText(/relaxed constraints: max_price/i)).toBeVisible();
});

test("the sort control updates the URL and re-fetches with the new sort", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-sort&mode=ITEM");
  await expect(page.getByText("Aigul Flowers").first()).toBeVisible();

  await page.getByRole("button", { name: "Distance" }).click();
  await expect(page).toHaveURL(/[?&]sort=distance/);

  await expect
    .poll(async () => {
      const res = await page.request.get(
        "http://localhost:4100/__last-sort?query=roses-sort",
      );
      return (await res.json()).sort;
    })
    .toBe("distance");
});

test("the offer tint comes from has_active_offer, and an unknown badge is DROPPED", async ({
  page,
}) => {
  await seedSession(page);
  // Driven through the MOCK BACKEND, not page.route: the Catalog Page fetches
  // its results SERVER-SIDE (D7), so the browser never issues this request and
  // page.route could not see it. `roses-badges` returns an offer label, a known
  // token, and one token the client does not recognise.
  await page.goto("/app/catalog?query=roses-badges&mode=ITEM");

  // The label the business supplied renders as data, in the offer tint.
  await expect(page.getByText("-30%").first()).toBeVisible();
  // A known token renders through i18n...
  await expect(page.getByText("Official channel").first()).toBeVisible();
  // ...and an unrecognised one is dropped, NEVER shown raw. Before AUDIT_2 N8
  // "VERIFIED" would have replaced "-30%" as the offer label and rendered as
  // English inside bg-offer — a fake discount signal.
  await expect(page.getByText("VERIFIED")).toHaveCount(0);
});

test("no offer flag means no offer tint, even with an unmapped badge", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-nooffer&mode=ITEM");

  await expect(page.getByText("Pickup").first()).toBeVisible();
  await expect(page.getByText("SURPRISE")).toHaveCount(0);
});

test("the city filter lists real cities from GET /cities and picks one", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses&mode=ITEM");

  // `GET /cities` takes no parameters and answers CityDto {id, name}. Before
  // AUDIT_1 S1 the client read `.city`, so every row rendered blank and
  // picking one set the filter to `undefined`.
  // Keyed by the field's accessible name (its <Field label>), not by position.
  const city = page.getByRole("combobox", { name: "City" });
  await city.fill("Al");

  const option = page.getByRole("option", { name: "Almaty" });
  await expect(option).toBeVisible();
  await option.click();

  await expect(city).toHaveValue("Almaty");
});

test("an empty result set renders the empty state, not a dead end", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-empty&mode=ITEM");

  await expect(
    page.getByText("Did you mean roses or rose plants?"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "rose plants" })).toBeVisible();
});

test("a search failure renders the error state with a retry", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-error&mode=ITEM");

  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
});

// Infinite scroll (PRODUCT_VISION §4, owner 2026-08-02). `roses-paged` is the
// ONLY mock scenario with `has_next: true` — every other one returns a single
// page, which is why the suite could be green while testing none of this.
test("scrolling appends the next page instead of replacing it, and stops at the end", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-paged&mode=ITEM");

  // Page 0 arrives SERVER-rendered — it is in the HTML before any scrolling.
  await expect(page.getByText("Paged bouquet page 0")).toBeVisible();
  await expect(page.getByText("Paged bouquet page 1")).toHaveCount(0);

  // Two appends to exhaust the set. Scrolling to the bottom brings the sentinel
  // into view, which is what the observer is watching for.
  for (const expected of [1, 2]) {
    await page.mouse.wheel(0, 20000);
    await expect(
      page.getByText(`Paged bouquet page ${expected}`),
    ).toBeVisible();
  }

  // APPENDED, not replaced — the earlier pages are still on screen. This is the
  // assertion that separates infinite scroll from pagination.
  await expect(page.getByText("Paged bouquet page 0")).toBeVisible();
  await expect(page.getByText("Paged bouquet page 1")).toBeVisible();

  // The server said `has_next: false` on page 2, so the list ends and says so.
  await expect(page.getByText("No more results")).toBeVisible();
});

test("changing the sort discards the accumulated pages rather than appending to them", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-paged&mode=ITEM");
  // Wait for page 0 BEFORE scrolling. The sentinel's IntersectionObserver is
  // attached by a client effect, so a wheel event sent before hydration is
  // simply lost — the observer does not exist yet to see it. This assertion is
  // the hydration proxy, not decoration; without it the test fails outright.
  await expect(page.getByText("Paged bouquet page 0")).toBeVisible();

  await page.mouse.wheel(0, 20000);
  await expect(page.getByText("Paged bouquet page 1")).toBeVisible();

  // A new sort is a NEW query. The vision requires the list to reset, which the
  // params-derived remount key enforces structurally — page 1's card must be
  // gone, not merely pushed further down.
  await page.getByRole("button", { name: "Distance" }).click();
  await expect(page.getByText("Paged bouquet page 0")).toBeVisible();
  await expect(page.getByText("Paged bouquet page 1")).toHaveCount(0);
});
