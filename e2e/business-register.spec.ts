import { expect, test, type Page } from "@playwright/test";

import { pinLocale } from "./helpers";

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
  // `CLIENT_SEARCH` for every account, business owners included — because
  // PRODUCT_VISION UF 1 step 3 lands every role on Home, and both
  // AuthProcessor.resolveStartRoute() and LoginProcessor.resolveStartRoute()
  // implement exactly that as a constant. This stub said "OWNER_BRANCHES" until
  // 2026-08-01, a value no backend path produces — the e2e-stub lock, in the
  // exact shape it names. The client no longer branches on this field at all
  // (auth `POST_AUTH_PATH`); it stays here because it IS on the DTO, and a stub
  // that drops a live field stops mirroring the contract it claims to cover.
  start_route: "CLIENT_SEARCH",
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

// `pinLocale` moved to ./helpers 2026-08-02 so search.spec.ts stops carrying a
// literal origin (AUDIT_2 D-6). Its rationale is corrected there too: a
// different PORT never dropped the cookie — cookies are keyed on host, not port.

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
  // Corrected 2026-07-31. This test used to stub `POST /businesses/*/branches`
  // and assert it was called — a shape the client abandoned on 2026-07-29
  // (commit 41c7506, backend `9a90f5c`: branches are `pickupBranches` on the
  // onboarding body, committed in ONE transaction). The spec was not updated in
  // that commit, so it had been asserting a request that can no longer happen.
  // It now reads the onboarding body itself, which is where the branch actually
  // is — the same lesson as the e2e-stub lock, one level up: a test may only
  // assert the call the code makes.
  let onboardingBody: Record<string, unknown> | null = null;
  await seedCustomerBecomingSeller(page, (body) => {
    onboardingBody = body;
  });
  await stubMapNetwork(page);

  // Pin the locale: the branch address now carries KATO registry names (D30),
  // and those are language-dependent. `kk` is the product default, so this
  // pins what the assertion below already assumed rather than changing it.
  await pinLocale(page, "kk");

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();

  // Answering Yes opens the branch modal automatically (RegisterStepDelivery).
  // Assert the DIALOG, not the map: since the 2026-07-31 reorder the map is not
  // rendered until the KATO place is settled, so a `branch-map` assertion here
  // contradicts the `toHaveCount(0)` one a few lines below. Both were present
  // for a while — the stale one is why this spec was failing.
  await page.getByTestId("business-pickup-YES").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.locator("#branch-name").fill("Aigul Flowers — Abay Ave");

  // The KATO cascade (D30) comes FIRST — the map and the street line describe a
  // point inside the chosen place, so neither is rendered until the place is
  // settled. Almaty is a city of REPUBLICAN significance, so the place is
  // complete at the first level, which also keeps this test off the
  // lazily-imported locality chunk an oblast would pull.
  await expect(page.getByTestId("branch-map")).toHaveCount(0);
  await page.getByTestId("address-region").fill("Алматы");
  await page.getByTestId("address-region-option").first().click();
  await expect(page.getByTestId("branch-map")).toBeVisible();

  // Wait for Leaflet itself to mount (next/dynamic, ssr:false) before
  // clicking — the container exists immediately, but its click handler only
  // attaches once `.leaflet-container` renders inside it.
  await page.getByTestId("branch-map").locator(".leaflet-container").waitFor();
  // Reverse-geocode is stubbed to fail, so the address field stays empty for
  // the test to fill directly — deterministic, no dependency on Nominatim.
  await page.getByTestId("branch-map").click({ position: { x: 150, y: 120 } });

  await page.locator("#branch-address").fill("Абай даңғылы 10");
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
        // Registry level + street line, composed widest-first into the ONE
        // `address` string CreateBranchRequest has (formatKzAddress, D30).
        address: "Алматы қ., Абай даңғылы 10",
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

test("changing the registry place clears the pin and street it belonged to", async ({
  page,
}) => {
  // Found by review 2026-07-31: the cascade, the map pin and the street line
  // are three descriptions of ONE location, and only the first was resettable.
  // A seller could pick Almaty, drop a pin, then switch to Astana and submit a
  // branch whose address said Astana and whose coordinates said Almaty --
  // silently, because handleAdd only checked that each field was non-empty.
  await seedCustomerBecomingSeller(page);
  await stubMapNetwork(page);
  await pinLocale(page, "kk");

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);
  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-YES").click();

  await page.locator("#branch-name").fill("Aigul Flowers");
  await page.getByTestId("address-region").fill("Алматы");
  await page.getByTestId("address-region-option").first().click();

  await page.getByTestId("branch-map").locator(".leaflet-container").waitFor();
  await page.getByTestId("branch-map").click({ position: { x: 150, y: 120 } });
  await page.locator("#branch-address").fill("Абай даңғылы 10");
  await expect(page.locator("#branch-address")).toHaveValue("Абай даңғылы 10");

  // Move the branch to a different city. Everything narrower than the place
  // described the old one, so it must be gone.
  await page.getByTestId("address-region").fill("Астана");
  await page.getByTestId("address-region-option").first().click();
  await expect(page.locator("#branch-address")).toHaveValue("");

  // ...and the branch cannot be added on the strength of the old pin alone.
  // Assert the REASON, not just the absence: "no branch was drafted" is also
  // what a broken selector, a crashed modal or a renamed testid would produce,
  // so an absence-only assertion passes for all the wrong reasons too.
  await page.getByTestId("branch-modal-add").click();
  await expect(page.getByTestId("branch-modal-error")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Aigul Flowers", { exact: true }),
  ).toHaveCount(0);
});

test("the contact channels reach the wire, and a typo is caught before they do", async ({
  page,
}) => {
  // AUDIT_1 B2: `phone` and `corporateEmail` were never collected, so every
  // business onboarded through this UI shipped a result card with no way to
  // reach it — `SearchCardResponse.businessProfile.{number, email}` reads
  // exactly these two fields off the business profile.
  let onboardingBody: Record<string, unknown> | null = null;
  await seedCustomerBecomingSeller(page, (body) => {
    onboardingBody = body;
  });
  await pinLocale(page, "en");

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);

  // Both are OPTIONAL, so an invalid value is the only thing that may block —
  // and it must block HERE, not become an unreachable phone number on a
  // published card.
  await page.locator("#business-corporate-email").fill("info@company");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/Enter an email address/)).toBeVisible();

  await page.locator("#business-corporate-email").fill("info@company.kz");
  await page.locator("#business-phone").fill("+7 700 000 00 00");

  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  // legalForm KZ_IP skips step 4 (proof of trade) — one submit reaches review.
  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);

  await expect(page).toHaveURL(/\/app\/business$/);
  expect(onboardingBody).toMatchObject({
    phone: "+7 700 000 00 00",
    corporate_email: "info@company.kz",
  });
});

test("declining both contact fields sends neither, rather than empty strings", async ({
  page,
}) => {
  let onboardingBody: Record<string, unknown> | null = null;
  await seedCustomerBecomingSeller(page, (body) => {
    onboardingBody = body;
  });
  await pinLocale(page, "en");

  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);
  await advanceToDeliveryStep(page);
  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-NO").click();
  // legalForm KZ_IP skips step 4 (proof of trade) — one submit reaches review.
  await page.locator('button[type="submit"]').click();
  await confirmAndSubmit(page);

  await expect(page).toHaveURL(/\/app\/business$/);
  // Absent, not "" — a blank string would publish an empty contact channel as
  // though one had been supplied (the same reason the verification links are
  // dropped when blank).
  expect(onboardingBody).not.toHaveProperty("phone");
  expect(onboardingBody).not.toHaveProperty("corporate_email");
});

// Leaflet stacks its own internals at z-index 400 (panes) and 800 (controls),
// which are absolute numbers, not relative to us. Our overlays sit at z-50, so
// an open dropdown near the map was painted UNDERNEATH the tiles. Reported from
// a real browser, invisible to every other check we run: the dropdown is in the
// DOM, visible, and clickable by Playwright's own hit-testing — it is simply
// covered. Only a paint-order question answers it, so this asks the browser
// which element is actually on top at that point.
// ⚠ HONEST SCOPE: this asserts the dropdown is not covered IN THIS FLOW, and it
// passes both with and without the `isolation: isolate` fix on `.neu-map-frame`
// — verified by removing that line and re-running. So it does NOT reproduce the
// overlap reported from a real browser on 2026-08-05 (Shymkent selected, the
// city-district list painted under the tiles), and it must not be read as proof
// that the fix works. It is kept as a weak guard on a real property; the actual
// repro is still owed, and the isolation stands on its mechanism — Leaflet
// stacks panes at z-index 400 and controls at 800 against our overlays' z-50 —
// not on this test.
test("an open dropdown paints ABOVE the branch map, not under it", async ({
  page,
}) => {
  await seedCustomerBecomingSeller(page);
  await stubMapNetwork(page);
  await page.goto("/app/business/register");
  await fillIdentity(page);
  await fillKzIp(page);
  await advanceToDeliveryStep(page);

  await page.getByTestId("business-delivery-coverage-KAZAKHSTAN").click();
  await page.getByTestId("business-pickup-YES").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Almaty is a republican city, so the cascade's second question is the city
  // district — a Select that opens directly over the map.
  await page.getByTestId("address-region").fill("Алматы");
  await page.getByTestId("address-region-option").first().click();
  await page.getByTestId("branch-map").locator(".leaflet-container").waitFor();

  await page.getByTestId("address-city-district").click();
  await expect(page.getByRole("option").first()).toBeVisible();

  // Probe where the list and the map actually OVERLAP, not the list's first
  // option. The bug covered the list's LOWER part while its top stayed visible,
  // so a probe at the first option lands in the visible region and passes even
  // while the map paints over everything below it — which is exactly how an
  // earlier version of this test passed with the fix removed.
  const probe = await page.evaluate(() => {
    const list = document.querySelector('[role="listbox"]');
    const map = document.querySelector(".leaflet-container");
    if (!list || !map) return { overlaps: false, covered: false, hit: "" };
    const l = list.getBoundingClientRect();
    const m = map.getBoundingClientRect();
    const top = Math.max(l.top, m.top);
    const bottom = Math.min(l.bottom, m.bottom);
    const left = Math.max(l.left, m.left);
    const right = Math.min(l.right, m.right);
    if (bottom <= top || right <= left) {
      return { overlaps: false, covered: false, hit: "" };
    }
    const el = document.elementFromPoint(
      (left + right) / 2,
      (top + bottom) / 2,
    );
    return {
      overlaps: true,
      covered: !list.contains(el) && el !== list,
      hit: (el?.className ?? "").toString().slice(0, 60),
    };
  });

  // Without an overlap the assertion below proves nothing, so fail loudly
  // rather than pass quietly.
  expect(
    probe.overlaps,
    "the list and the map do not overlap — this test is not exercising the bug",
  ).toBe(true);
  expect(
    probe.covered,
    `the map painted over the dropdown — topmost element was "${probe.hit}"`,
  ).toBe(false);
});
