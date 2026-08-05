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
 *
 * ⚠ **These stubs speak the backend's `dev` branch** — the client's target
 * (owner decision 2026-07-27). `master`, which :2020 still runs today, calls the
 * challenge id `auth_challenge_id`; `dev` calls it `verification_id`. Both were
 * confirmed by curling the running server, not by reading a checkout.
 *
 * So a green suite here does NOT mean sign-up works against the box on your desk
 * until that box redeploys from `dev`. That is intended, and it is the honest
 * arrangement: the tests pin the contract we are shipping to.
 *
 * "REAL" IS STILL THE LOAD-BEARING WORD. A stub written from the client's own
 * assumptions proves only that the client agrees with itself — that is how a
 * broken field name survived here for weeks. But a stub written from a CHECKOUT
 * is not automatically safe either, because the checkout and the running server
 * can be different branches. Confirm against a real response, and write down
 * WHICH branch you confirmed against.
 */

const CHALLENGE = {
  verification_id: "11111111-1111-1111-1111-111111111111",
  role: "CUSTOMER",
  // VerificationPurpose.REGISTER. The live server really does return this
  // (probed), and it is what arms the role modal — the backend has since
  // deleted `suggest_role_expansion` from the DTO outright (2026-07-30).
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

/**
 * What `POST /auth/verify` really answers for a fresh sign-up.
 *
 * `suggest_role_expansion` is deliberately ABSENT — the backend has deleted the
 * field from `AuthSessionResponse` outright (2026-07-30). Its absence here is
 * what makes these tests prove the real trigger: the REGISTER purpose on the
 * challenge above.
 */
const SESSION_SUGGEST = {
  access_token: "test-token-abc",
  token_type: "Bearer",
  role: "ROLE_CUSTOMER",
  start_route: "CLIENT_SEARCH",
  user: USER,
  all_roles: ["CUSTOMER"],
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

/* These two pages are the ONLY `/app/*` surface a crawler can reach (the D23
 * lock's one exception), so they are the only ones whose `noindex` has to be
 * stated per-route rather than implied by the auth gate. The tag went missing
 * once, because the "everything under /app is gated" reasoning was generalised
 * over the subtree it does not cover (AUDIT_2 N9) — asserting it here is what
 * makes a silent removal fail instead of shipping. */
for (const path of ["/app/auth/login", "/app/auth/register"]) {
  test(`${path} is noindex — it is crawlable, unlike the rest of /app`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });
}

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
  let legalAcceptanceBody: unknown = null;
  await page.route("**/api/v1/legal/registration-acceptances", (route) => {
    const body = route.request().postDataJSON();
    legalAcceptanceBody = body;
    // VALIDATES like the backend instead of answering 204 to anything.
    // `AcceptLegalDocumentsRequest` marks all three fields required
    // (`documentCodes` @NotEmpty, `countryCode` @NotBlank @Size(2,2), `locale`
    // @NotBlank), and a stub that accepts any body can only prove the client
    // agrees with itself — the e2e-stub lock. It did exactly that until
    // 2026-08-05: `country_code` was never sent, the real backend 400'd every
    // consent write this product ever made, and this test stayed green because
    // the assertion below checked only `document_codes`.
    const valid =
      Array.isArray(body?.document_codes) &&
      body.document_codes.length > 0 &&
      typeof body?.country_code === "string" &&
      body.country_code.length === 2 &&
      typeof body?.locale === "string" &&
      body.locale.length > 0;
    return route.fulfill({ status: valid ? 204 : 400 });
  });

  await page.goto("/app/auth/register");
  await page.locator("#register-name").fill("Test Customer");
  await page.locator("#register-email").fill("t@example.com");
  await page.locator("#register-password").fill("password123");
  await page.locator("#register-password-confirm").fill("password123");
  await page.locator("#register-agreement").check();
  await page.locator('button[type="submit"]').click();

  await expect(page.locator("#verify-code")).toBeVisible();
  // CodeInput submits on its own once the 6th digit lands (ux-ui-flow.md
  // "Filling the last cell submits") — a follow-up click here raced the
  // navigation it triggers and clicked whatever landed underneath on /app
  // (found while adding the legal-acceptance assertions below).
  await page.locator("#verify-code").fill("123456");

  // The page navigates to /app FIRST; the modal follows the session there.
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  const token = await page.evaluate(() =>
    localStorage.getItem("ask.accessToken"),
  );
  expect(token).toBe("test-token-abc");

  // Consent is recorded at VERIFY, and asserting it HERE — with the modal still
  // open and unanswered — is the whole point (2026-08-01). It used to fire from
  // the modal's "Continue", so this same assertion at the END of the test passed
  // either way and could not tell the two apart.
  // The WHOLE required shape, not just the codes. Checking `document_codes`
  // alone is what let a body the backend rejects pass here for weeks.
  expect(legalAcceptanceBody).toMatchObject({
    document_codes: ["USER_TERMS", "PRIVACY_POLICY"],
    country_code: "KZ",
    // `kk` because this spec does not pin a locale and kk is the product
    // default (D18/D19) — which is the point of asserting it: the ACTIVE locale
    // travels, rather than a hardcoded "ru" (AUDIT_1 A2). Pin a locale in this
    // test and this value must change with it.
    locale: "kk",
  });

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
  // Registration consent is recorded at VERIFY, for EVERY sign-up, whichever
  // role is answered afterwards (moved there 2026-08-01). This test used to
  // assert the call never happened at all, because the old implementation fired
  // it from the modal's customer branch only — so choosing "business" recorded
  // nothing, ever. Exactly ONE call is expected, before the modal is answered.
  //
  // What must still NOT happen is a SECOND call on the "business" answer:
  // SELLER_TERMS / PERSONAL_DATA_CONSENT belong to the onboarding wizard's own
  // completion (business-cabinet), not to this modal.
  let legalAcceptanceCount = 0;
  await page.route("**/api/v1/legal/registration-acceptances", (route) => {
    legalAcceptanceCount += 1;
    return route.fulfill({ status: 204 });
  });

  await page.goto("/app/auth/register");
  await page.locator("#register-name").fill("Test Customer");
  await page.locator("#register-email").fill("t@example.com");
  await page.locator("#register-password").fill("password123");
  await page.locator("#register-password-confirm").fill("password123");
  await page.locator("#register-agreement").check();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#verify-code")).toBeVisible();
  // CodeInput submits on its own once the 6th digit lands — see the sibling
  // customer-choice test above for why the follow-up click was removed.
  await page.locator("#verify-code").fill("123456");

  await expect(page).toHaveURL(/\/app$/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Already recorded — at verify, before any role was chosen.
  expect(legalAcceptanceCount).toBe(1);

  // No dismissal: no close button, ESC ignored, outside click ignored.
  await expect(dialog.locator('[data-slot="dialog-close"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();

  // And it survives a full reload while unanswered.
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Answering is the only way out. "I'm selling" routes to seller REGISTRATION
  // (2026-07-27) — it used to point at /app/business, which for the fresh
  // customer this modal actually shows to was a silent no-op. This session is
  // stubbed as an existing seller, so the register page hands straight on to the
  // cabinet; the customer's path through the form is covered in
  // business-register.spec.ts.
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
  // Still one: answering "I'm selling" adds no consent record of its own.
  expect(legalAcceptanceCount).toBe(1);
});

test("Google OAuth first-signup arms the role modal AND records the consent (?registration=1)", async ({
  page,
}) => {
  // OAuthCallbackPage's ONE call is exchangeOAuthSession() → GET /session
  // (credentials:'include'); AuthProvider's own restore short-circuits with no
  // stored token yet, so this single stub covers the whole page.
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: SESSION_PLAIN }),
  );
  let legalAcceptanceBody: unknown = null;
  await page.route("**/api/v1/legal/registration-acceptances", (route) => {
    legalAcceptanceBody = route.request().postDataJSON();
    return route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/oauth/callback?registration=1");

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  const pending = await page.evaluate(() =>
    localStorage.getItem("ask.roleSelectionPending"),
  );
  expect(pending).toBe("1");

  // A Google sign-up creates the account (CustomOAuth2UserService:
  // registrationRequired = user == null → createUser), so it accepts the same
  // two documents an email sign-up does — legal for the client to record only
  // because OAuthOptions shows the consent copy beside the button. The call is
  // fire-and-forget on this transient page, so poll rather than assume it
  // landed before the redirect.
  await expect
    .poll(() => legalAcceptanceBody)
    .toMatchObject({ document_codes: ["USER_TERMS", "PRIVACY_POLICY"] });
});

test("a returning Google sign-in (no registration param) arms nothing and records nothing", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: SESSION_PLAIN }),
  );
  let legalAcceptanceCount = 0;
  await page.route("**/api/v1/legal/registration-acceptances", (route) => {
    legalAcceptanceCount += 1;
    return route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/oauth/callback");

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Signing in is not registering — consent is recorded once, at registration.
  expect(legalAcceptanceCount).toBe(0);
});

test("both auth pages state the Google consent, because either can register", async ({
  page,
}) => {
  await stubNoRestore(page);

  // The copy is NOT Sign-up-only: an unknown Google email creates an account
  // from the Log-in page too (CustomOAuth2UserService), so the log-in button is
  // a registration door and must carry the same agreement.
  for (const path of ["/app/auth/login", "/app/auth/register"]) {
    await page.goto(path);
    const consent = page.getByTestId("oauth-consent");
    await expect(consent).toBeVisible();

    // Assert the DESTINATIONS, not just that two links exist. Consent is only
    // meaningful if it points at the documents it names, and the codes sent to
    // /legal/registration-acceptances are USER_TERMS + PRIVACY_POLICY — these
    // two routes are what the user was shown for them. Counting links would
    // still pass if both pointed at the same page, or at neither.
    await expect(consent.locator('a[href="/terms"]')).toHaveCount(1);
    await expect(consent.locator('a[href="/privacy"]')).toHaveCount(1);
  }
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
