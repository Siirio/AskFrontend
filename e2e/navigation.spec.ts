import { expect, test, type Page } from "@playwright/test";

/**
 * Platform navigation-menu chrome (app/_components/NavigationMenu). The bar
 * renders ONLY for an authenticated session — it lives inside the platform guard
 * (owner rule 2), so a logged-out visitor is redirected to login and never sees
 * it (there is no signed-out "sign in" entry, owner rule 4; the redirect itself
 * is proven in guard.spec.ts). These tests cover the two authenticated states —
 * customer and seller — plus the account (profile-card) dropdown from
 * PRODUCT_VISION UF 2.3.
 *
 * THE NAV IS TWO DIFFERENT COMPONENTS, not one that reflows, and every spec here
 * runs in both viewports (chromium + mobile-chromium). Desktop: a sticky top bar
 * carrying brand mark + destinations + an account DropdownMenu. Phone: no top bar
 * at all — destinations in a fixed bottom bar, account behind a floating burger
 * opening a Sheet (owner decision 2026-07-28). So the brand mark and `role=menu`
 * exist ONLY on desktop. Assertions that differ branch on `isPhone()` and assert
 * the shape that viewport is SUPPOSED to have, never whichever one rendered.
 *
 * The backend is STUBBED with page.route (the harness runs the production build,
 * no live backend). A session is seeded by writing the Bearer token before load
 * (addInitScript) and answering GET /session; stub bodies speak the backend's
 * REAL wire format — snake_case (D20). Selectors key on href / testid, never on
 * translated copy (the ROADMAP parked-fix rule). Locale defaults to kk.
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
  // `CLIENT_SEARCH` for every account, business owners included — because
  // PRODUCT_VISION UF 1 step 3 lands every role on Home, and both
  // AuthProcessor.resolveStartRoute() and LoginProcessor.resolveStartRoute()
  // implement exactly that as a constant. This stub said "OWNER_BRANCHES" until
  // 2026-08-01, a value no backend path produces — the e2e-stub lock, in the
  // exact shape it names. The client no longer branches on this field at all
  // (auth `POST_AUTH_PATH`); it stays here because it IS on the DTO, and a stub
  // that drops a live field stops mirroring the contract it claims to cover.
  start_route: "CLIENT_SEARCH",
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

/**
 * The one viewport check in this file (P6.1 — decided once, not per test). The
 * query MUST stay identical to `lib/useIsMobile.ts`, which is what the component
 * actually branches on; a spec asking a different question than the code would
 * pass or fail for reasons unrelated to the layout it claims to cover.
 */
async function isPhone(page: Page) {
  return page.evaluate(
    () => window.matchMedia("(max-width: 639px)").matches, // === lib/useIsMobile
  );
}

test("signed out: /app redirects to login and shows no nav (rules 2 + 4)", async ({
  page,
}) => {
  // No token seeded → restore lands unauthenticated. The guard redirects to
  // login before the bar mounts, so there is no signed-out nav — and therefore
  // no signed-out "sign in" entry to render (rule 4).
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 401, json: { message: "no session" } }),
  );
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByTestId("user-menu-trigger")).toHaveCount(0);
});

test("customer session: home + chats show, the seller dashboard does not", async ({
  page,
}) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app");
  const nav = page.getByRole("navigation");
  // Two shapes, asserted per viewport rather than adapted to (see the fly-out
  // note below for why). DESKTOP: a sticky top bar where the brand mark AND the
  // Home destination both point home — 2 links. PHONE: there is no top bar at
  // all (owner decision 2026-07-28, NavigationMenu §isMobile) — destinations
  // move to a bottom bar and the mark has nowhere to live, so Home is the only
  // one. A phone build that grew a second `/app` link would mean the top bar
  // came back, which is the regression this count exists to catch.
  await expect(nav.locator('a[href="/app"]')).toHaveCount(
    (await isPhone(page)) ? 1 : 2,
  );
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

  // The account entry point resolves to a different WIDGET per viewport, not
  // just a different layout: a Radix DropdownMenu on desktop (role=menu) and a
  // Sheet — the same Radix Dialog underneath — behind the burger on phones
  // (role=dialog). Asserted per viewport for the same reason as the fly-out
  // below: shipping the desktop dropdown to a phone must fail here.
  const isMobile = await isPhone(page);
  const panel = isMobile ? page.getByRole("dialog") : page.getByRole("menu");
  await expect(panel).toBeVisible();
  await expect(panel.locator('a[href="/app/profile"]')).toBeVisible(); // Settings
  await expect(page.getByTestId("user-menu-logout")).toBeVisible();
  await shoot(page, "nav-menu-open-light");

  // About + the legal links live under "Learn more": a fly-out submenu on
  // desktop (hover to open), a flat inline group on mobile (already visible).
  // Assert the layout MATCHES the viewport — don't just adapt to whatever
  // rendered — so a mobile build that wrongly shipped the desktop fly-out fails.
  const subTrigger = page.getByTestId("user-menu-learn-more");
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
  // Same per-viewport widget split as the light-theme test above.
  await expect(
    (await isPhone(page)) ? page.getByRole("dialog") : page.getByRole("menu"),
  ).toBeVisible();
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
