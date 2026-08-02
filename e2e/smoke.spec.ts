import { expect, test, type Page } from "@playwright/test";

// Structural smoke tests for the Phase 0a skeleton. They assert roles and
// routes, not copy — the visual layer and real content arrive in Phase 0b/1.
//
// The platform (/app/*) is GATED (owner rule 2): a logged-out visitor is
// redirected to login, so the tests that reach the platform shell/routes seed a
// session first — a Bearer token via addInitScript plus a stubbed GET /session,
// the nav-spec pattern. Stub bodies speak the backend's REAL wire format
// (snake_case, D20). The guard REDIRECT behavior itself is proven in
// guard.spec.ts. A seller session is used so every route — the dashboard
// included — is reachable.

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
    localStorage.setItem("ask.accessToken", "smoke-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: session }),
  );
}

test("the marketing landing renders at /", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link")).toHaveAttribute("href", "/app");
});

test("the platform shell renders at /app with the navigation menu", async ({
  page,
}) => {
  await seedSession(page, SELLER_SESSION);
  await page.goto("/app");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("every V1 route from the vision responds", async ({ page }) => {
  await seedSession(page, SELLER_SESSION);
  for (const path of [
    "/app/auth",
    "/app/catalog",
    "/app/product/e2e-smoke",
    "/app/chats",
    "/app/profile",
    "/app/business",
  ]) {
    const response = await page.goto(path);
    expect(response, path).not.toBeNull();
    expect(response!.status(), path).toBe(200);
    // Heading present for the document outline...
    await expect(page.getByRole("heading", { level: 1 }), path).toBeAttached();
    // ...and something a HUMAN can see. These two used to be one assertion,
    // which stopped meaning anything on 2026-08-02: the not-open routes moved
    // their <h1> to `sr-only`, and an sr-only element still has a 1px box, so
    // `toBeVisible()` on the heading alone would now pass on a blank page.
    await expect(page.locator("main"), path).toBeVisible();
    await expect(page.locator("main"), path).not.toBeEmpty();
  }
});

test("the four not-open sections say so, rather than looking unfinished", async ({
  page,
}) => {
  // AUDIT_2 N4 / AUDIT_1 B1: all four are reachable today — Chats is a
  // permanent nav destination, Settings is one tap inside the account menu, and
  // a seller lands on the cabinet the moment registration completes. Each used
  // to render a bare <h1> + "Section under construction" inside a neumorphic
  // product, which reads as a broken build rather than as a message.
  await seedSession(page, SELLER_SESSION);
  for (const path of [
    "/app/chats",
    "/app/profile",
    "/app/business",
    "/app/product/e2e-smoke",
  ]) {
    await page.goto(path);
    await expect(page.locator('[data-slot="empty-state"]'), path).toBeVisible();
  }
});

test("the legal pages render outside /app (owner rule 3)", async ({ page }) => {
  for (const path of ["/terms", "/privacy", "/cookies"]) {
    const response = await page.goto(path);
    expect(response, path).not.toBeNull();
    expect(response!.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
  }
});
