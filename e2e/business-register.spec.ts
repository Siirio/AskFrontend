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
 * The form is FIVE STEPS since 2026-07-29 (was three) — identity; what you
 * sell; delivery & branches; proof of trade (SKIPPED unless legalForm: NONE);
 * review & confirm — sharing one `button[type="submit"]` that reads "Next" on
 * steps 1–4 and "Create business" on step 5 (BusinessRegisterPage.tsx). Tests
 * below drive the whole sequence rather than filling one page of inputs.
 *
 * The backend is STUBBED with page.route (the harness runs the production build,
 * no live backend). Stub bodies speak the real snake_case wire (D20). The branch
 * map picker's OpenStreetMap calls (tiles, Nominatim) are stubbed too — a real
 * network dependency inside a deterministic e2e run would be a flake source,
 * not a feature under test.
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
async function seedCustomerBecomingSeller(
  page: Page,
  // Lets a test inspect the actual POST body without registering a SECOND
  // page.route for the same pattern — Playwright runs the most-recently
  // registered matching handler FIRST, so a second `page.route` for this URL
  // would shadow this one entirely and `onboarded` would never flip, which is
  // exactly the bug this parameter exists to avoid.
  onOnboard?: (body: Record<string, unknown>) => void,
) {
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
    onOnboard?.(route.request().postDataJSON());
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

/** Blocks the map picker's real network dependencies (OSM tiles, Nominatim) —
 *  a deterministic e2e run must not depend on the internet being reachable.
 *  Tile requests are aborted outright (cosmetic only, clicking the map pane
 *  still fires Leaflet's click handler regardless of whether a tile loaded);
 *  Nominatim reverse-geocode is made to fail so the modal's own catch leaves
 *  the address field for the test to fill directly, deterministically. */
async function stubMapNetwork(page: Page) {
  await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
  await page.route("**/nominatim.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 500, body: "" }),
  );
}

/** Fill the fields step 1 needs regardless of legal form. */
async function fillIdentity(page: Page) {
  await page.locator("#business-name").fill("Aigul Flowers");
  await page.locator("#business-category").fill("Flowers");
}

async function fillKzIp(page: Page) {
  await page.getByTestId("business-legal-form-KZ_IP").click();
  await page.locator("#business-legal-identifier").fill("123456789012");
  await page.locator("#business-legal-name").fill("IP Aigul Nurlankyzy");
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

/** Confirms step 5's agreement checkbox and submits — the shared tail of every
 *  successful-registration test regardless of how many steps preceded it. */
async function confirmAndSubmit(page: Page) {
  await expect(page.getByTestId("business-agreement")).toBeVisible();
  await page.getByTestId("business-agreement").click();
  await page.locator('button[type="submit"]').click();
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

test("the cabinet itself still bounces that same customer — to registration, not Home (D27)", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business");
  // D27 (2026-07-28) changed RequireDashboardAccess's redirect target from
  // /app to /app/business/register — this assertion was stale against that
  // change (found while re-verifying this suite, 2026-07-29) and belongs to
  // the pre-existing staleness the 2026-07-28 Changelog entry already flagged
  // for this file's customer-bounce assertions, not a new regression.
  await expect(page).toHaveURL(/\/app\/business\/register$/);
});

test("registering a business (KZ_IP, step 4 skipped) opens the cabinet", async ({
  page,
}) => {
  // Capture the actual POST body — SellerOnboardingRequest carries fields
  // (deliveryCoverage, pickupAvailable) that are easy to drop silently if the
  // form's own state ever stops reaching the request builder. Passed as a
  // callback INTO the seed rather than a second page.route for the same URL
  // (see seedCustomerBecomingSeller's own note on why that shadows the seed).
  let postedBody: Record<string, unknown> | null = null;
  await seedCustomerBecomingSeller(page, (body) => {
    postedBody = body;
  });

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  await page.locator('button[type="submit"]').click();

  // legalForm: KZ_IP does not need verification — step 4 is skipped straight
  // to step 5's review/confirm page.
  await confirmAndSubmit(page);

  // The session was re-read, so the role the guard sees is the role the backend
  // just granted — no bounce, no reload needed.
  await expect(page).toHaveURL(/\/app\/business$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(postedBody).toMatchObject({
    delivery_coverage: "KAZAKHSTAN",
    pickup_available: false,
  });
});

test('picking "Order catalog import from Ask" on step 2 submits catalogSetupMode for real', async ({
  page,
}) => {
  // D29 (2026-07-29): the card went from disabled/decorative to a real,
  // submitted choice. This pins the reversal — picking it must change the
  // actual wire value, not just the card's own visual state.
  let postedBody: Record<string, unknown> | null = null;
  await seedCustomerBecomingSeller(page, (body) => {
    postedBody = body;
  });

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByTestId("business-scope-ITEM")).toBeVisible();

  await page.getByTestId("catalog-setup-ASK_MANAGED_IMPORT").click();
  await expect(
    page.getByTestId("catalog-setup-ASK_MANAGED_IMPORT"),
  ).toHaveAttribute("aria-checked", "true");

  await page.locator('button[type="submit"]').click();
  await expect(
    page.getByTestId("business-delivery-coverage-KAZAKHSTAN"),
  ).toBeVisible();
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);

  await expect(page).toHaveURL(/\/app\/business$/);
  expect(postedBody).toMatchObject({
    catalog_setup_mode: "ASK_MANAGED_IMPORT",
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

test("an unregistered seller must supply at least one verification link on step 4", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);

  // NONE has nothing else required on step 1 (verification moved to step 4,
  // 2026-07-29) — advancing must succeed immediately.
  await page.getByTestId("business-legal-form-NONE").click();
  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  await page.locator('button[type="submit"]').click();

  // Step 4 (proof of trade) is NOT skipped for legalForm: NONE.
  await expect(page.getByTestId("source-instagramUrl")).toBeVisible();

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
  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);
  await expect(page).toHaveURL(/\/app\/business$/);
});

test("selected-cities delivery requires at least one city", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-pickup-NO").click();
  await page.getByTestId("business-delivery-coverage-SELECTED_CITIES").click();

  // No city added yet: submitting must be refused client-side, the same rule
  // as the verification-link requirement above.
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/business\/register$/);
  await expect(page.getByRole("alert").first()).toBeVisible();

  // No visible "Add" button since 2026-07-29 — Enter commits the chip.
  await page.locator("#business-delivery-cities").fill("Almaty");
  await page.locator("#business-delivery-cities").press("Enter");
  await expect(page.getByText("Almaty")).toBeVisible();

  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);
  await expect(page).toHaveURL(/\/app\/business$/);
});

test("only-online forces pickup to No and hides the branch section", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-online-only").click();

  // The pickup question and branch picker disappear entirely once online-only
  // is checked — there is nothing left to answer about a physical location.
  await expect(page.getByTestId("business-pickup-YES")).toHaveCount(0);

  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);
  await expect(page).toHaveURL(/\/app\/business$/);
});

test("back returns to an earlier step without losing what was already typed", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

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

test("PickUp available: Yes opens the branch map picker, and drafted branches travel INLINE with the business", async ({
  page,
}) => {
  // This test used to stub `POST /businesses/*/branches` and assert it was
  // called. The client abandoned that shape on 2026-07-29 (commit 41c7506,
  // against backend `9a90f5c`): drafted branches are now `pickupBranches` on
  // the onboarding body, created in ONE transaction with the business. The
  // spec was not updated in that commit, so it has been asserting a request
  // that can no longer happen — `branchBusinessId` could only ever be null.
  //
  // Same lesson as the e2e-stub lock, one level up: a stub proves nothing if it
  // answers a call the code does not make. A submit-shape change updates its
  // spec in the same commit, exactly as docs do.
  let onboardingBody: Record<string, unknown> | null = null;
  await seedCustomerBecomingSeller(page, (body) => {
    onboardingBody = body;
  });
  await stubMapNetwork(page);

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();

  // Answering Yes opens the map modal automatically (RegisterStepDelivery).
  await page.getByTestId("business-pickup-YES").click();
  await expect(page.getByTestId("branch-map")).toBeVisible();

  await page.locator("#branch-name").fill("Aigul Flowers — Abay Ave");
  // Wait for Leaflet itself to mount (next/dynamic, ssr:false) before
  // clicking — the container exists immediately, but its click handler only
  // attaches once `.leaflet-container` renders inside it.
  await page.getByTestId("branch-map").locator(".leaflet-container").waitFor();
  // Reverse-geocode is stubbed to fail, so the address field stays empty for
  // the test to fill directly — deterministic, no dependency on Nominatim.
  await page.getByTestId("branch-map").click({ position: { x: 150, y: 120 } });
  await page.locator("#branch-address").fill("Abay Ave 10, Almaty");
  await page
    .locator("#branch-address-details")
    .fill("2nd floor, entrance from the courtyard");

  await page.getByTestId("branch-modal-add").click();
  // Shows in the modal's own list immediately.
  await expect(
    page.getByRole("dialog").getByText("Aigul Flowers — Abay Ave"),
  ).toBeVisible();

  await page.getByTestId("branch-modal-done").click();
  await expect(page.getByTestId("branch-map")).toBeHidden();
  // ...and stays visible in step 3's own list once the modal closes.
  await expect(page.getByText("Aigul Flowers — Abay Ave")).toBeVisible();

  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);

  await expect(page).toHaveURL(/\/app\/business$/);
  expect(onboardingBody).toMatchObject({
    pickup_available: true,
    pickup_branches: [
      {
        name: "Aigul Flowers — Abay Ave",
        address: "Abay Ave 10, Almaty",
        address_details: "2nd floor, entrance from the courtyard",
        pickup_available: true,
      },
    ],
  });
  // Coordinates are @NotNull on CreateBranchRequest — the map click is what
  // supplies them, and a branch that lost them would 400 at the backend.
  const branch = (
    onboardingBody as unknown as {
      pickup_branches: { latitude: number; longitude: number }[];
    }
  ).pickup_branches[0];
  expect(typeof branch.latitude).toBe("number");
  expect(typeof branch.longitude).toBe("number");
});
