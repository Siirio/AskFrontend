import { expect, test, type Page } from "@playwright/test";

/**
 * Platform navigation-menu chrome (app/_components/NavigationMenu). Covers the
 * three session states the bar renders — signed-out, customer, seller — plus the
 * account (profile-card) dropdown from PRODUCT_VISION UF 2.3.
 *
 * The backend is STUBBED with page.route (the harness runs the production build,
 * no live backend). A session is seeded by writing the Bearer token before load
 * (addInitScript) and answering GET /session; stub bodies speak the backend's
 * REAL wire format — snake_case (D20). Selectors key on href / testid, never on
 * translated copy (the ROADMAP parked-fix rule). Locale defaults to ru.
 *
 * Set NAV_SHOTS=<dir> to also capture review screenshots (opt-in; unset in CI).
 */

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

const SELLER_SESSION = {
  access_token: null,
  token_type: "Bearer",
  role: "BUSINESS_OWNER",
  start_route: "OWNER_BRANCHES",
  user: {
    user_id: "33333333-3333-3333-3333-333333333333",
    display_name: "Seller Boss",
    email: "boss@acme.kz",
    status: "ACTIVE",
  },
  business: {
    business_id: "b1",
    business_name: "Acme",
    branch_id: "br1",
    branch_name: "Main",
    membership_id: "m1",
    member_role: "OWNER",
  },
  all_roles: ["BUSINESS_OWNER"],
};

async function seedSession(page: Page, session: unknown) {
  await page.addInitScript(() =>
    localStorage.setItem("ask.accessToken", "nav-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: session }),
  );
  await page.route("**/api/v1/auth/logout", (route) =>
    route.fulfill({ status: 200, json: { success: true } }),
  );
}

async function shoot(page: Page, name: string) {
  if (process.env.NAV_SHOTS) {
    await page.screenshot({ path: `${process.env.NAV_SHOTS}/${name}.png` });
  }
}

test("signed out: the sign-in link shows, not the account menu", async ({
  page,
}) => {
  // No token seeded → restore lands unauthenticated.
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 401, json: { message: "no session" } }),
  );
  await page.goto("/app");
  const nav = page.getByRole("navigation");
  await expect(nav).toBeVisible();
  await expect(nav.locator('a[href="/app/auth/login"]')).toBeVisible();
  await expect(page.getByTestId("user-menu-trigger")).toHaveCount(0);
});

test("customer session: home + chats show, the seller dashboard does not", async ({
  page,
}) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app");
  const nav = page.getByRole("navigation");
  // The mark and the Home link both point home.
  await expect(nav.locator('a[href="/app"]')).toHaveCount(2);
  await expect(nav.locator('a[href="/app/chats"]')).toBeVisible();
  await expect(nav.locator('a[href="/app/business"]')).toHaveCount(0);
  await expect(page.getByTestId("user-menu-trigger")).toBeVisible();
  await shoot(page, "nav-customer-light");
});

test("seller session: the dashboard link appears", async ({ page }) => {
  await seedSession(page, SELLER_SESSION);
  await page.goto("/app");
  await expect(
    page.getByRole("navigation").locator('a[href="/app/business"]'),
  ).toBeVisible();
  await shoot(page, "nav-seller-light");
});

test("the account menu opens the profile card: settings, legal links, sign out", async ({
  page,
}) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app");
  await page.getByTestId("user-menu-trigger").click();

  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator('a[href="/app/profile"]')).toBeVisible(); // Settings
  await expect(page.getByTestId("user-menu-logout")).toBeVisible();
  await shoot(page, "nav-menu-open-light");

  // About + the legal links live under "Learn more": a fly-out submenu on
  // desktop (hover to open), a flat inline group on mobile (already visible).
  // Assert the layout MATCHES the viewport — don't just adapt to whatever
  // rendered — so a mobile build that wrongly shipped the desktop fly-out fails.
  const subTrigger = page.getByTestId("user-menu-learn-more");
  const isMobile = await page.evaluate(
    () => window.matchMedia("(max-width: 639px)").matches,
  );
  if (isMobile) {
    await expect(subTrigger).toHaveCount(0); // flat inline group, no fly-out
  } else {
    await expect(subTrigger).toBeVisible();
    await subTrigger.hover(); // action, not an assertion — verify it opened next
    await expect(subTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.locator('[data-slot="dropdown-menu-sub-content"]'),
    ).toBeVisible(); // the fly-out panel actually opened
  }
  await expect(page.locator('a[href="/?from=app"]')).toBeVisible(); // About ASK
  await expect(page.locator('a[href="/terms"]')).toBeVisible();
  await expect(page.locator('a[href="/privacy"]')).toBeVisible();
  await expect(page.locator('a[href="/cookies"]')).toBeVisible();
  await shoot(page, "nav-submenu-open-light");
});

test("the account menu renders in dark theme", async ({ page }) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app");
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await page.getByTestId("user-menu-trigger").click();
  await expect(page.getByRole("menu")).toBeVisible();
  await shoot(page, "nav-menu-open-dark");
});

test("sign out clears the token and returns to login", async ({ page }) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app");
  await page.getByTestId("user-menu-trigger").click();
  await page.getByTestId("user-menu-logout").click();

  await expect(page).toHaveURL(/\/app\/auth\/login$/);
  const token = await page.evaluate(() =>
    localStorage.getItem("ask.accessToken"),
  );
  expect(token).toBeNull();
});
