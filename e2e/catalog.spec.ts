import { expect, test, type Page } from "@playwright/test";

import { pinLocale } from "./helpers";

// The catalog slice (roadmap Phase 1 #3): the Product Card modal, opened by
// clicking a result card on the Catalog Page (`search`'s own surface). The
// card renders from the SAME `SearchCardResponse` the Catalog Page already
// fetched (D7, server-side, via `e2e/mock-backend.mjs` — see `search.spec.ts`'s
// header for why `page.route` cannot reach that call).

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
    localStorage.setItem("ask.accessToken", "catalog-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: CUSTOMER_SESSION }),
  );
  await pinLocale(page, "en");
}

test("clicking a result card opens the Product Card modal with its details", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses&mode=ITEM");

  await page.getByText("Aigul Flowers").first().click();

  const dialog = page.getByRole("dialog", { name: "Fresh rose bouquet" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("12000 KZT")).toBeVisible();
  await expect(dialog.getByText("Main branch")).toBeVisible();

  // Regression guard for the 2026-08-06 owner reversal: match reasons are
  // modelled but never rendered, anywhere — not on the card, not in the modal.
  await expect(
    page.getByText("Matches your query for fresh flowers"),
  ).toHaveCount(0);
});

test("zero purchase destinations renders no Proceed to Purchase control", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-purchase-none&mode=ITEM");

  await page.getByText("Aigul Flowers").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Omitted, not disabled — the zero-destination chat fallback is slice #4's
  // (project lock: a reachable control must DO something).
  await expect(
    page.getByRole("link", { name: "Proceed to Purchase" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Proceed to Purchase" }),
  ).toHaveCount(0);
});

test("one purchase destination renders a direct external link", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-purchase-one&mode=ITEM");

  await page.getByText("Aigul Flowers").first().click();
  const link = page.getByRole("link", { name: "Proceed to Purchase" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://aigul.example/roses");
  await expect(link).toHaveAttribute("target", "_blank");
});

test("two or more purchase destinations open a chooser instead of a direct link", async ({
  page,
}) => {
  await seedSession(page);
  // The default `roses` scenario's card carries TWO destinations on purpose
  // (Kaspi + Website) — this is the case the chooser modal exists for.
  await page.goto("/app/catalog?query=roses&mode=ITEM");

  await page.getByText("Aigul Flowers").first().click();
  await page.getByRole("button", { name: "Proceed to Purchase" }).click();

  const chooser = page.getByRole("dialog", { name: "Choose where to buy" });
  const kaspi = chooser.getByRole("link", { name: "Kaspi" });
  const website = chooser.getByRole("link", { name: "Website" });
  await expect(kaspi).toHaveAttribute(
    "href",
    "https://kaspi.kz/shop/p/rose-bouquet",
  );
  await expect(website).toHaveAttribute("href", "https://aigul.example/roses");
});

test("closing the modal removes it from the DOM", async ({ page }) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses&mode=ITEM");

  await page.getByText("Aigul Flowers").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a card with no images shows no gallery, and the click target still works", async ({
  page,
}) => {
  await seedSession(page);
  await page.goto("/app/catalog?query=roses-noimages&mode=ITEM");

  await page.getByText("Aigul Flowers").first().click();
  const dialog = page.getByRole("dialog", { name: "Fresh rose bouquet" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveCount(0);
});
