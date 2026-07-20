import { expect, test, type Page } from "@playwright/test";

/**
 * The platform route guard (owner rules 1 + 2). The token lives in localStorage,
 * not a cookie, so the guard is CLIENT-SIDE: the server renders the page, the
 * session restores on mount, and the guard reveals or redirects. These tests
 * drive the production build and stub GET /session (no live backend); stub
 * bodies speak the real snake_case wire (D20).
 *
 * Rule 2 — a logged-out visitor cannot enter /app/*: they are sent to login.
 * Rule 1 — a customer-only session cannot open the Dashboard: it is sent to /app.
 * The auth pages (/app/auth/*) are the sanctioned exception — reachable
 * logged-out, since they ARE the sign-in entry (covered in auth.spec.ts).
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
    localStorage.setItem("ask.accessToken", "guard-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: session }),
  );
}

/** No token seeded → the session restore lands unauthenticated. */
async function stubNoSession(page: Page) {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 401, json: { message: "no session" } }),
  );
}

test("rule 2: a logged-out visit to /app redirects to login", async ({
  page,
}) => {
  await stubNoSession(page);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("rule 2: a logged-out visit to a deeper /app route also redirects to login", async ({
  page,
}) => {
  await stubNoSession(page);
  await page.goto("/app/chats");
  await expect(page).toHaveURL(/\/app\/auth\/login$/);
});

test("rule 1: a customer-only session is redirected away from the Dashboard", async ({
  page,
}) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app/business");
  // The customer cannot open the cabinet — bounced to Home.
  await expect(page).toHaveURL(/\/app$/);
});

test("rule 1: a seller session opens the Dashboard", async ({ page }) => {
  await seedSession(page, SELLER_SESSION);
  await page.goto("/app/business");
  await expect(page).toHaveURL(/\/app\/business$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("an authenticated customer reaches Home (no wrongful redirect)", async ({
  page,
}) => {
  await seedSession(page, CUSTOMER_SESSION);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("navigation")).toBeVisible();
});
