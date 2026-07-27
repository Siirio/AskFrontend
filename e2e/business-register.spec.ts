import { expect, test, type Page } from "@playwright/test";

/**
 * Seller registration — /app/business/register (PRODUCT_VISION UF 3.1).
 *
 * This route exists to close a gap the role modal had shipped with: choosing
 * "I'm selling" pointed at /app/business, where RequireDashboardAccess bounced
 * the customer-only session that had just chosen it, so the fork silently did
 * nothing. The tests below pin the two halves of the fix — the page is reachable
 * BY a customer (it sits outside the cabinet's guard group), and completing it
 * is what makes the cabinet reachable (the session is re-read, so the role the
 * backend just changed is the role the guard sees).
 *
 * The form is THREE STEPS (2026-07-28) — identity+proof, what you sell,
 * delivery+pickup — sharing one `button[type="submit"]` that reads "Next" on
 * steps 1–2 and "Create business" on step 3 (BusinessRegisterPage.tsx). Tests
 * below drive the whole sequence rather than filling one page of inputs.
 *
 * The backend is STUBBED with page.route (the harness runs the production build,
 * no live backend). Stub bodies speak the real snake_case wire (D20).
 */

const CUSTOMER = {
  user_id: "22222222-2222-2222-2222-222222222222",
  display_name: "Test Customer",
  email: "t@example.com",
  status: "ACTIVE",
};

const CUSTOMER_SESSION = {
  access_token: null,
  token_type: "Bearer",
  role: "CUSTOMER",
  start_route: "CLIENT_SEARCH",
  user: CUSTOMER,
  all_roles: ["CUSTOMER"],
};

/** What GET /session answers AFTER onboarding: the same person, now an owner.
 *  `business` is required, not decoration — toAuthUser degrades a business role
 *  to `customer` when no business context came with it (P9.4), and the guard
 *  would then still bounce. */
const SELLER_SESSION = {
  access_token: null,
  token_type: "Bearer",
  role: "BUSINESS_OWNER",
  start_route: "OWNER_BRANCHES",
  user: CUSTOMER,
  business: {
    business_id: "b1",
    business_name: "Aigul Flowers",
    branch_id: "br1",
    branch_name: "Main",
    membership_id: "m1",
    member_role: "OWNER",
  },
  all_roles: ["CUSTOMER", "BUSINESS_OWNER"],
};

/**
 * Seed a session whose ROLE CHANGES after onboarding — the whole point of the
 * flow. GET /session answers customer until POST /business/onboarding is seen,
 * and seller afterwards, exactly as the real backend does.
 */
async function seedCustomerBecomingSeller(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("ask.accessToken", "onboarding-test-token"),
  );
  let onboarded = false;

  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 200,
      json: onboarded ? SELLER_SESSION : CUSTOMER_SESSION,
    }),
  );
  await page.route("**/api/v1/business/onboarding", async (route) => {
    onboarded = true;
    await route.fulfill({
      status: 201,
      json: {
        business_id: "b1",
        catalog_setup_mode: "MANUAL",
        start_route: "BUSINESS_CABINET",
      },
    });
  });
  await page.route("**/api/v1/categories**", (route) =>
    route.fulfill({
      status: 200,
      json: {
        suggestions: [
          {
            category_id: "44444444-4444-4444-4444-444444444444",
            label: "Flowers",
            type: "BUSINESS",
            source: "SYSTEM",
          },
        ],
      },
    }),
  );
}

/** Fill the fields step 1 needs regardless of legal form. */
async function fillIdentity(page: Page) {
  await page.locator("#business-name").fill("Aigul Flowers");
  await page.locator("#business-category").fill("Flowers");
}

/** From step 1, submit twice (step 1 → 2 → 3) — step 2's businessScope always
 *  has a default, so nothing to fill there. Assumes step 1 already validates. */
async function advanceToDeliveryStep(page: Page) {
  await page.locator('button[type="submit"]').click();
  await expect(page.getByTestId("business-scope-ITEM")).toBeVisible();
  await page.locator('button[type="submit"]').click();
  await expect(
    page.getByTestId("business-delivery-coverage-KAZAKHSTAN"),
  ).toBeVisible();
}

test("a customer can open seller registration (it is outside the cabinet guard)", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");

  // The exact case RequireDashboardAccess would have bounced. Reaching the form
  // IS the assertion.
  await expect(page).toHaveURL(/\/app\/business\/register$/);
  await expect(page.locator("#business-name")).toBeVisible();
});

test("the cabinet itself still bounces that same customer", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business");
  // Splitting the guard into the (cabinet) group must not have weakened it.
  await expect(page).toHaveURL(/\/app$/);
});

test("registering a business opens the cabinet the customer could not reach before", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);

  // Capture the actual POST body — SellerOnboardingRequest carries fields
  // (deliveryCoverage, pickupAvailable) that are easy to drop silently if the
  // form's own state ever stops reaching the request builder.
  let postedBody: Record<string, unknown> | null = null;
  await page.route("**/api/v1/business/onboarding", async (route) => {
    postedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        business_id: "b1",
        catalog_setup_mode: "MANUAL",
        start_route: "BUSINESS_CABINET",
      },
    });
  });

  await page.goto("/app/business/register");
  await fillIdentity(page);

  // KZ_IP: a registered entity proves itself with a 12-digit IIN + its name.
  await page.getByTestId("business-legal-form-KZ_IP").click();
  await page.locator("#business-legal-identifier").fill("123456789012");
  await page.locator("#business-legal-name").fill("IP Aigul Nurlankyzy");

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  await page.locator('button[type="submit"]').click();

  // The session was re-read, so the role the guard sees is the role the backend
  // just granted — no bounce, no reload needed.
  await expect(page).toHaveURL(/\/app\/business$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(postedBody).toMatchObject({
    delivery_coverage: "KAZAKHSTAN",
    pickup_available: false,
  });
});

test("step 1 refuses to advance without a legal form answer", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);

  // No legal form chosen yet: "Next" must be refused client-side, the same
  // rule the backend's own isCategorySupplied/isLegalDetailsValid assert.
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business\/register$/);
  await expect(page.getByRole("alert").first()).toBeVisible();
});

test("an unregistered seller must supply at least one verification link", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);

  await page.getByTestId("business-legal-form-NONE").click();
  // Nothing picked yet: advancing must be refused, not sent for the backend to
  // reject — the same rule, phrased where the person can act on it.
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business\/register$/);
  await expect(page.getByRole("alert").first()).toBeVisible();

  // Choosing a source reveals its field; a non-URL is still refused.
  await page.getByTestId("source-instagramUrl").click();
  await page.locator("#link-instagramUrl").fill("not-a-url");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business\/register$/);

  await page.locator("#link-instagramUrl").fill("https://instagram.com/aigul");
  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business$/);
});

test("selected-cities delivery requires at least one city", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);
  await page.getByTestId("business-legal-form-KZ_IP").click();
  await page.locator("#business-legal-identifier").fill("123456789012");
  await page.locator("#business-legal-name").fill("IP Aigul Nurlankyzy");

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-pickup-NO").click();
  await page.getByTestId("business-delivery-coverage-SELECTED_CITIES").click();

  // No city added yet: submitting must be refused client-side, the same rule
  // as the verification-link requirement above.
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business\/register$/);
  await expect(page.getByRole("alert").first()).toBeVisible();

  await page.locator("#business-delivery-cities").fill("Almaty");
  await page.getByTestId("delivery-city-add").click();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business$/);
});

test("back returns to an earlier step without losing what was already typed", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);
  await page.getByTestId("business-legal-form-KZ_IP").click();
  await page.locator("#business-legal-identifier").fill("123456789012");
  await page.locator("#business-legal-name").fill("IP Aigul Nurlankyzy");

  await page.locator('button[type="submit"]').click();
  await expect(page.getByTestId("business-scope-ITEM")).toBeVisible();

  await page.getByTestId("register-back").click();
  await expect(page.locator("#business-name")).toHaveValue("Aigul Flowers");
  await expect(page.locator("#business-legal-identifier")).toHaveValue(
    "123456789012",
  );
});

test("an existing seller is sent to the cabinet instead of registering twice", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("ask.accessToken", "onboarding-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: SELLER_SESSION }),
  );
  // A second POST would create a second business — the page must never offer it.
  let posted = false;
  await page.route("**/api/v1/business/onboarding", (route) => {
    posted = true;
    return route.fulfill({ status: 201, json: { business_id: "b2" } });
  });

  await page.goto("/app/business/register");
  await expect(page).toHaveURL(/\/app\/business$/);
  expect(posted).toBe(false);
});
