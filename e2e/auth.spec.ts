import { expect, test, type Page } from "@playwright/test";

/**
 * Auth slice smoke tests (roadmap Phase 1 #1). Two standalone pages (no app nav):
 * /app/auth/login (email + password) and /app/auth/register (email + code), plus
 * the theme toggle and language switch in the shell. The backend is STUBBED with
 * page.route (the harness runs the production build, no live backend). Locale
 * defaults to kk.
 *
 * Stub bodies speak the backend's REAL wire format — snake_case keys (D20) —
 * so httpClient's case boundary is exercised by every scenario here.
 */

const CHALLENGE = {
  auth_challenge_id: "11111111-1111-1111-1111-111111111111",
  role: "CUSTOMER",
  purpose: "REGISTER",
  channel: "EMAIL",
  masked_destination: "t***@example.com",
  expires_at: "2099-01-01T00:00:00Z",
};

const USER = {
  user_id: "22222222-2222-2222-2222-222222222222",
  display_name: "Test Customer",
  email: "t@example.com",
  status: "ACTIVE",
};

const SESSION_SUGGEST = {
  access_token: "test-token-abc",
  token_type: "Bearer",
  role: "ROLE_CUSTOMER",
  start_route: "CLIENT_SEARCH",
  user: USER,
  all_roles: ["CUSTOMER"],
  suggest_role_expansion: true,
};

const SESSION_PLAIN = {
  access_token: "test-token-def",
  token_type: "Bearer",
  role: "ROLE_CUSTOMER",
  start_route: "CLIENT_SEARCH",
  user: USER,
  all_roles: ["CUSTOMER"],
};

/** Keep session-restore deterministic once a token is stored (no live backend). */
async function stubNoRestore(page: Page) {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 401, json: { message: "no session" } }),
  );
}

test("the login and register pages render; /app/auth redirects to login", async ({
  page,
}) => {
  await page.goto("/app/auth");
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();

  await page.goto("/app/auth/register");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#register-email")).toBeVisible();
});

test("the auth pages have no app navigation", async ({ page }) => {
  await page.goto("/app/auth/login");
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("the cross-link goes from login to register", async ({ page }) => {
  await page.goto("/app/auth/login");
  // Keyed by href, not by translated copy (the ROADMAP parked-fix rule).
  await page.locator('a[href="/app/auth/register"]').click();
  await expect(page).toHaveURL(/\/app\/auth\/register$/);
  await expect(page.locator("#register-email")).toBeVisible();
});

test("the theme toggle sets data-theme on <html>", async ({ page }) => {
  await page.goto("/app/auth/login");
  await page.getByTestId("theme-dark").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-light").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the language switch changes the copy (kk → en)", async ({ page }) => {
  await page.goto("/app/auth/login");
  // The on-page heading (login.title) and the tab title (login.pageTitle) are
  // deliberately DIFFERENT strings.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Қайта келдіңіз",
  );
  await page.getByTestId("locale-en").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Welcome back",
  );
  // The tab title follows the client locale too (document.title sync).
  await expect(page).toHaveTitle("Sign in - Ask");

  // And it must SURVIVE a reload: the switch wrote the ask.locale cookie
  // (D19), so the server now renders body AND title in the stored language.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Welcome back",
  );
  await expect(page).toHaveTitle("Sign in - Ask");
});

test("log in with email + password lands on search", async ({ page }) => {
  await stubNoRestore(page);
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({ status: 200, json: SESSION_PLAIN }),
  );

  await page.goto("/app/auth/login");
  await page.locator("#login-email").fill("t@example.com");
  await page.locator("#login-password").fill("password123");
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/app$/);
  const token = await page.evaluate(() =>
    localStorage.getItem("ask.accessToken"),
  );
  expect(token).toBe("test-token-def");
});

test("wrong credentials show an error and do not navigate", async ({
  page,
}) => {
  await stubNoRestore(page);
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: { error_code: "INVALID_CREDENTIALS", message: "bad" },
    }),
  );

  await page.goto("/app/auth/login");
  await page.locator("#login-email").fill("t@example.com");
  await page.locator("#login-password").fill("wrongpass");
  await page.locator('button[type="submit"]').click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
});

test("sign-up validates before calling the API", async ({ page }) => {
  let registerCalled = false;
  await page.route("**/api/v1/auth/customer/register", (route) => {
    registerCalled = true;
    return route.fulfill({ status: 201, json: CHALLENGE });
  });

  await page.goto("/app/auth/register");
  await page.locator("#register-email").fill("not-an-email");
  await page.locator("#register-password").fill("short");
  await page.locator("#register-password-confirm").fill("different");
  // agreement left unchecked
  await page.locator('button[type="submit"]').click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  expect(registerCalled).toBe(false);
});

test("sign-up → verify → the role modal over /app → continue searching", async ({
  page,
}) => {
  await stubNoRestore(page);
  await page.route("**/api/v1/auth/customer/register", (route) =>
    route.fulfill({ status: 201, json: CHALLENGE }),
  );
  await page.route("**/api/v1/auth/verify", (route) =>
    route.fulfill({ status: 200, json: SESSION_SUGGEST }),
  );

  await page.goto("/app/auth/register");
  await page.locator("#register-name").fill("Test Customer");
  await page.locator("#register-email").fill("t@example.com");
  await page.locator("#register-password").fill("password123");
  await page.locator("#register-password-confirm").fill("password123");
  await page.locator("#register-agreement").check();
  await page.locator('button[type="submit"]').click();

  await expect(page.locator("#verify-code")).toBeVisible();
  await page.locator("#verify-code").fill("123456");
  await page.locator('button[type="submit"]').click();

  // The page navigates to /app FIRST; the modal follows the session there.
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  const token = await page.evaluate(() =>
    localStorage.getItem("ask.accessToken"),
  );
  expect(token).toBe("test-token-abc");

  // Search is the mission: the customer card is preselected.
  await expect(page.getByTestId("role-card-customer")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByTestId("role-continue").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/app$/);
  const pending = await page.evaluate(() =>
    localStorage.getItem("ask.roleSelectionPending"),
  );
  expect(pending).toBeNull();
});

test("the role modal cannot be dismissed and survives a reload until answered", async ({
  page,
}) => {
  // The reload path restores the session, so /session answers 200 here
  // (the real wire: access_token null, bare-enum role).
  //
  // The restored session is a SELLER, and that is load-bearing rather than
  // incidental. This test ends by choosing "I'm selling" and asserting the
  // modal routes to /app/business. With a customer-only session that assertion
  // can never hold: RequireDashboardAccess is DESIGNED to bounce a customer off
  // the cabinet, so the URL sat at /app/business for 8–25ms before snapping
  // back to /app, and the test passed only when a poll happened to land inside
  // that window — a coin flip CI eventually lost (2026-07-27). Stubbing a
  // seller removes an unrelated guard from a test about the ROLE MODAL; guard
  // behaviour is covered on its own in guard.spec.ts.
  //
  // `business` is REQUIRED here, not decoration: toAuthUser (auth/model.ts)
  // degrades any business role to `customer` when the backend sent no business
  // context, rather than fabricating one (P9.4). Omit it and the role silently
  // stays customer — which is exactly how the first attempt at this fix failed.
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 200,
      json: {
        access_token: null,
        token_type: "Bearer",
        role: "BUSINESS_OWNER",
        start_route: "CLIENT_SEARCH",
        user: USER,
        business: {
          business_id: "b1",
          business_name: "Acme",
          branch_id: "br1",
          branch_name: "Main",
          membership_id: "m1",
          member_role: "OWNER",
        },
        all_roles: ["CUSTOMER", "BUSINESS_OWNER"],
      },
    }),
  );
  await page.route("**/api/v1/auth/customer/register", (route) =>
    route.fulfill({ status: 201, json: CHALLENGE }),
  );
  await page.route("**/api/v1/auth/verify", (route) =>
    route.fulfill({ status: 200, json: SESSION_SUGGEST }),
  );

  await page.goto("/app/auth/register");
  await page.locator("#register-name").fill("Test Customer");
  await page.locator("#register-email").fill("t@example.com");
  await page.locator("#register-password").fill("password123");
  await page.locator("#register-password-confirm").fill("password123");
  await page.locator("#register-agreement").check();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#verify-code")).toBeVisible();
  await page.locator("#verify-code").fill("123456");
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/app$/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // No dismissal: no close button, ESC ignored, outside click ignored.
  await expect(dialog.locator('[data-slot="dialog-close"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();

  // And it survives a full reload while unanswered.
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Answering is the only way out: business → /app/business, flag cleared.
  await page.getByTestId("role-card-business").click();
  await expect(page.getByTestId("role-card-business")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByTestId("role-continue").click();
  await expect(page).toHaveURL(/\/app\/business$/);
  const pending = await page.evaluate(() =>
    localStorage.getItem("ask.roleSelectionPending"),
  );
  expect(pending).toBeNull();
});

test("a wrong verification code shows an error and does not navigate", async ({
  page,
}) => {
  await stubNoRestore(page);
  await page.route("**/api/v1/auth/customer/register", (route) =>
    route.fulfill({ status: 201, json: CHALLENGE }),
  );
  await page.route("**/api/v1/auth/verify", (route) =>
    route.fulfill({
      status: 400,
      json: { error_code: "CHALLENGE_INVALID_CODE", message: "bad code" },
    }),
  );

  await page.goto("/app/auth/register");
  await page.locator("#register-name").fill("Test Customer");
  await page.locator("#register-email").fill("t@example.com");
  await page.locator("#register-password").fill("password123");
  await page.locator("#register-password-confirm").fill("password123");
  await page.locator("#register-agreement").check();
  await page.locator('button[type="submit"]').click();

  await expect(page.locator("#verify-code")).toBeVisible();
  await page.locator("#verify-code").fill("000000");
  await page.locator('button[type="submit"]').click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).toHaveURL(/\/app\/auth\/register$/);
});

test("the password eye reveals both register fields together; login has its own", async ({
  page,
}) => {
  await page.goto("/app/auth/register");
  await page.locator("#register-password").fill("password123");
  await page.locator("#register-password-confirm").fill("password123");
  await expect(page.locator("#register-password")).toHaveAttribute(
    "type",
    "password",
  );

  // One connected state: either eye flips BOTH fields.
  await page.getByTestId("register-password-toggle").click();
  await expect(page.locator("#register-password")).toHaveAttribute(
    "type",
    "text",
  );
  await expect(page.locator("#register-password-confirm")).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByTestId("register-password-confirm-toggle").click();
  await expect(page.locator("#register-password")).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.locator("#register-password-confirm")).toHaveAttribute(
    "type",
    "password",
  );

  await page.goto("/app/auth/login");
  await page.getByTestId("login-password-toggle").click();
  await expect(page.locator("#login-password")).toHaveAttribute("type", "text");
});

test("a multi-role account (role selection) shows an error, never a silent sign-in", async ({
  page,
}) => {
  await stubNoRestore(page);
  // The backend's role-selection intermediate: 200 OK, but NO user, NO token,
  // NO startRoute. select-role is deferred (roadmap #7) — this must surface as
  // an error, not navigate to /app signed out.
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      json: {
        requires_role_selection: true,
        available_roles: [
          { user_id: USER.user_id, role: "CUSTOMER", display_name: "Test" },
          {
            user_id: "33333333-3333-3333-3333-333333333333",
            role: "BUSINESS_OWNER",
            display_name: "Test",
          },
        ],
        all_roles: ["CUSTOMER", "BUSINESS_OWNER"],
      },
    }),
  );

  await page.goto("/app/auth/login");
  await page.locator("#login-email").fill("t@example.com");
  await page.locator("#login-password").fill("password123");
  await page.locator('button[type="submit"]').click();

  await expect(
    page
      .getByText("Кіру кезінде рөл таңдау әзірге қолжетімсіз", { exact: false })
      .first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
  const token = await page.evaluate(() =>
    localStorage.getItem("ask.accessToken"),
  );
  expect(token).toBeNull();
});

test("an inactive account shows its own message, not the network fallback", async ({
  page,
}) => {
  await stubNoRestore(page);
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 403,
      json: { error_code: "ACCOUNT_NOT_ACTIVE", message: "не активен" },
    }),
  );

  await page.goto("/app/auth/login");
  await page.locator("#login-email").fill("t@example.com");
  await page.locator("#login-password").fill("password123");
  await page.locator('button[type="submit"]').click();

  await expect(
    page.getByText("Аккаунт белсенді емес", { exact: false }).first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
});
