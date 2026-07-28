import { expect, test, type Page } from "@playwright/test";

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
  // The default locale is kk (shared/i18n/locales.ts) — pin the server-read
  // `ask.locale` cookie (D19) to `en` so assertions read stable English
  // strings instead of juggling three languages of text matchers.
  await page.context().addCookies([
    { name: "ask.locale", value: "en", url: "http://localhost:3000" },
  ]);
}

test("Home renders the query input and the mode toggle, and submitting navigates to Catalog", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app");

  await expect(
    page.getByRole("textbox", { name: "Search query" }),
  ).toBeVisible();
  const serviceOption = page.getByRole("button", { name: "Services" });
  await expect(serviceOption).toBeVisible();
  await serviceOption.click();

  await page.getByRole("textbox", { name: "Search query" }).fill("roses");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/app\/catalog\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("query")).toBe("roses");
  expect(url.searchParams.get("mode")).toBe("SERVICE");
});

test("Catalog Page renders sectioned results with the ALTERNATIVE reason", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-sections&mode=ITEM");

  await expect(page.getByText("Aigul Flowers").first()).toBeVisible();
  await expect(
    page.getByText(/relaxed constraints: max_price/i),
  ).toBeVisible();
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

test("an empty result set renders the empty state, not a dead end", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-empty&mode=ITEM");

  await expect(
    page.getByText("Did you mean roses or rose plants?"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "rose plants" }),
  ).toBeVisible();
});

test("a search failure renders the error state with a retry", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-error&mode=ITEM");

  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
});
