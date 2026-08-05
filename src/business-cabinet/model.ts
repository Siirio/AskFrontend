/**
 * Business-cabinet domain types and validation.
 *
 * The DTO shapes below are READ from the AskBackend `business` module
 * (`kz.ask.business.onboarding.api.dto.*`, `kz.ask.business.category.api.dto.*`)
 * — the data authority (D9, P9.4). They are never invented or patched
 * client-side; a mismatch is raised, not faked.
 *
 * Platform-neutral and DOM-free (D5): pure types and pure functions (P5.1), so
 * this file lifts into a React Native package unchanged.
 */

// ── Enums (mirrors of the Java enums, exact spelling) ───────────────────────

/** kz.ask.business.core.domain.enums.BusinessScope — what the business sells. */
export const BUSINESS_SCOPES = ["ITEM", "SERVICE", "BOTH"] as const;
export type BusinessScope = (typeof BUSINESS_SCOPES)[number];

/** kz.ask.business.core.domain.enums.BusinessLegalForm. Kazakhstan-specific by
 *  construction — KZ_IP is an individual entrepreneur, KZ_TOO an LLC, and NONE
 *  is a seller with no registered entity, who must prove themselves with links
 *  instead. This is why `countryCode` is fixed to KZ (see api.ts). */
export const BUSINESS_LEGAL_FORMS = ["KZ_IP", "KZ_TOO", "NONE"] as const;
export type BusinessLegalForm = (typeof BUSINESS_LEGAL_FORMS)[number];

/** kz.ask.business.onboarding.api.dto.CatalogSetupMode. Both values are sent
 *  for real (2026-07-29, owner directive, D29 — see Changelog and
 *  business-cabinet/locks.md's amended note): `ASK_MANAGED_IMPORT` is a valid
 *  value on `SellerOnboardingRequest` by itself. What is STILL missing is a
 *  separate follow-up screen for scoping/pricing the import (roadmap #7) — the
 *  UI is honest about that gap (see catalogSetup.managedImport copy) rather
 *  than promising an instant quote. */
export const CATALOG_SETUP_MODES = ["MANUAL", "ASK_MANAGED_IMPORT"] as const;
export type CatalogSetupMode = (typeof CATALOG_SETUP_MODES)[number];

/** kz.ask.business.profile.domain.enums.DeliveryCoverage — how far the
 *  business ships. Read from the live SellerOnboardingRequest (2026-07-28):
 *  the field is `@NotNull` on the backend, so registration cannot omit it. */
export const DELIVERY_COVERAGES = [
  "NO_DELIVERY",
  "SELECTED_CITIES",
  "KAZAKHSTAN",
  "WORLDWIDE",
] as const;
export type DeliveryCoverage = (typeof DELIVERY_COVERAGES)[number];

/** The verification sources the backend stores, in the order they are offered.
 *  Each maps 1:1 to an optional URL field on SellerOnboardingRequest. */
export const VERIFICATION_SOURCES = [
  "twoGisUrl",
  "kaspiUrl",
  "ozonUrl",
  "wildberriesUrl",
  "websiteUrl",
  "instagramUrl",
  "telegramUrl",
] as const;
export type VerificationSource = (typeof VERIFICATION_SOURCES)[number];

// ── Request / response DTOs ─────────────────────────────────────────────────

/** POST /api/v1/business/onboarding (Bearer). Either `categoryId` OR a non-blank
 *  `categoryName` must be present — the backend asserts it. */
export type SellerOnboardingRequest = {
  businessName: string;
  categoryId?: string;
  categoryName?: string;
  countryCode: string;
  legalForm: BusinessLegalForm;
  legalIdentifier?: string;
  legalName?: string;
  catalogSetupMode: CatalogSetupMode;
  businessScope: BusinessScope;
  deliveryCoverage: DeliveryCoverage;
  deliveryCities?: string[];
  pickupAvailable: boolean;
  /** Confirmed live 2026-07-29 against backend commit 9a90f5c: `pickupAvailable:
   *  true` with this empty/absent now 400s (`@AssertTrue`, "At least one pickup
   *  branch is required when pickup is enabled") — branches are created in the
   *  SAME transaction as the business, not via a follow-up `createBranch` call. */
  pickupBranches?: CreateBranchRequest[];
  /** Both land DIRECTLY on the business profile (`SellerOnboardingProcessor`),
   *  which is what `SearchCardResponse.businessProfile.{number, email}`
   *  surfaces on every result card. Optional on the DTO, but leaving them
   *  unsent shipped every business a card with no way to reach it (AUDIT_1 B2). */
  phone?: string;
  corporateEmail?: string;
} & Partial<Record<VerificationSource, string>>;

export type SellerOnboardingResponse = {
  businessId: string;
  catalogSetupMode: CatalogSetupMode;
  /**
   * "BUSINESS_CABINET" | "MANAGED_IMPORT" — set from the submitted
   * `catalogSetupMode` (`SellerOnboardingProcessor`). Modelled because it is on
   * the wire; **nothing branches on it**, because both values mean the same
   * destination today (see `POST_ONBOARDING_PATH`).
   */
  startRoute?: string;
};

/**
 * Where a new seller lands once onboarding succeeds: the cabinet (D26 — the
 * register → land-in-cabinet loop).
 *
 * A constant rather than a mapper, corrected 2026-08-01. This was a switch over
 * `SellerOnboardingResponse.startRoute` whose `MANAGED_IMPORT`,
 * `BUSINESS_CABINET` and `default` arms all returned this same string — a
 * decision with one answer, kept explicit "so the day the other screen lands
 * this is the one line that changes". That day is roadmap #7 (the managed-import
 * scoping screen), and writing the branch then costs exactly as much as it does
 * now, minus the years of reading a switch that cannot switch (P8.1, P7.4).
 *
 * NOT the same rule as auth's `POST_AUTH_PATH` (= Home, UF 1 step 3). This is
 * the one flow that deliberately lands elsewhere.
 */
export const POST_ONBOARDING_PATH = "/app/business";

/** Mirrors `kz.ask.business.branch.api.dto.CreateBranchRequest` exactly —
 *  `latitude`/`longitude` are `@NotNull` on the backend, so the map picker in
 *  the registration wizard is not decorative: it is how this request gets
 *  built. Used both inline in `SellerOnboardingRequest.pickupBranches` (during
 *  registration) and standalone at POST /api/v1/businesses/{businessId}/branches
 *  (OWNER, Bearer — adding a branch later from the cabinet's Branches tab). */
export type CreateBranchRequest = {
  name: string;
  address?: string;
  addressDetails?: string;
  cityId?: string;
  latitude: number;
  longitude: number;
  pickupAvailable?: boolean;
};

export type BranchResponse = {
  id: string;
  businessId: string;
  cityId?: string;
  cityName?: string;
  name: string;
  address?: string;
  addressDetails?: string;
  latitude: number;
  longitude: number;
  pickupAvailable?: boolean;
};

/** A branch drafted during registration, before the business (and therefore
 *  `businessId`) exists. Submitted inline as `SellerOnboardingRequest.pickupBranches`
 *  (2026-07-29, backend commit 9a90f5c) — business, membership, profile,
 *  verification, and every drafted branch commit in ONE transaction. */
export type DraftBranch = {
  /** Client-only key for list rendering/removal; never sent to the backend. */
  draftId: string;
  name: string;
  address: string;
  addressDetails: string;
  /**
   * The branch's narrowest KATO level, in RUSSIAN — the lookup key for
   * `resolveCityId`, never shown to anyone.
   *
   * Carried separately from `address` because `address` is a composed,
   * seller-editable line ("Акмолинская область, г. Кокшетау, Абая 10") and
   * cannot be parsed back into a place. Russian specifically: the backend's
   * `city` table is seeded in Russian, so `nameKaz` resolves only 8 of 23
   * cities where `nameRus` resolves 22 — and `kk` is our default locale
   * (`KzPlace.placeNameRu`).
   */
  cityNameRu: string;
  /**
   * Resolved from `cityNameRu` via `resolveCityId` at submit when the backend
   * knows that city, `undefined` otherwise (AUDIT_1 B3, closed 2026-08-04).
   *
   * Optional on purpose and it must stay that way: most KATO places are
   * districts and villages that the 23-row `city` table does not contain, and
   * an unresolved city is a real, valid branch — not a validation failure. The
   * cost of leaving it unset is only that the branch is invisible to the
   * catalog's city filter.
   */
  cityId?: string;
  latitude: number;
  longitude: number;
};

/** GET /api/v1/categories?q=&type= — flat, no trees (backend contracts.md). */
export type CategorySuggestion = {
  categoryId: string;
  label: string;
  type: string;
  source: string;
};

export type CategoryAutocompleteResponse = {
  suggestions: CategorySuggestion[];
};

// ── Form view model ─────────────────────────────────────────────────────────

export type SellerOnboardingValues = {
  businessName: string;
  /** Set only when a suggestion was PICKED; free text leaves it null and travels
   *  as `categoryName` instead — the backend accepts either (contracts.md). */
  categoryId: string | null;
  categoryLabel: string;
  businessScope: BusinessScope;
  /** Step 2's choice, submitted for real (2026-07-29, D29 — see Changelog).
   *  `ASK_MANAGED_IMPORT` is a valid `SellerOnboardingRequest` value on its
   *  own; only the SEPARATE follow-up scoping dialog (roadmap #7) is missing,
   *  not this field. */
  catalogSetupMode: CatalogSetupMode;
  legalForm: BusinessLegalForm | null;
  legalIdentifier: string;
  legalName: string;
  /** How a customer reaches this business. Both are OPTIONAL on the backend and
   *  optional here — a seller may decline both — but they are the ONLY contact
   *  channels a result card can show (`businessProfile.{number, email}`), so
   *  the form asks rather than silently shipping a card with none (B2). */
  phone: string;
  corporateEmail: string;
  /** Which link fields the seller opted to fill. The backend's UX contract asks
   *  for a source TYPE before rendering its field, so an unregistered seller is
   *  not faced with seven empty boxes. */
  sources: VerificationSource[];
  links: Partial<Record<VerificationSource, string>>;
  deliveryCoverage: DeliveryCoverage | null;
  /** Only meaningful when deliveryCoverage is SELECTED_CITIES; the backend
   *  requires at least one non-blank entry in that case. */
  deliveryCities: string[];
  /** UI-only shortcut: forces `pickupAvailable: false` and hides the branch
   *  section. Never sent to the backend as its own field. */
  onlineOnly: boolean;
  pickupAvailable: boolean | null;
  /** Drafted during step 3's map modal, submitted inline as
   *  `pickupBranches` on the same onboarding request (see hooks.ts `submit`). */
  branches: DraftBranch[];
  /** Step 5's "I confirm this information is accurate" gate. UI-only. */
  agreementConfirmed: boolean;
};

export type SellerOnboardingErrors = Partial<
  Record<
    | "businessName"
    | "categoryLabel"
    | "legalForm"
    | "legalIdentifier"
    | "legalName"
    | "phone"
    | "corporateEmail"
    | "sources"
    | "deliveryCoverage"
    | "deliveryCities"
    | "pickupAvailable"
    | "agreementConfirmed",
    string
  >
> & { links?: Partial<Record<VerificationSource, string>> };

export const EMPTY_ONBOARDING_VALUES: SellerOnboardingValues = {
  businessName: "",
  categoryId: null,
  categoryLabel: "",
  businessScope: "ITEM",
  catalogSetupMode: "MANUAL",
  legalForm: null,
  phone: "",
  corporateEmail: "",
  legalIdentifier: "",
  legalName: "",
  sources: [],
  links: {},
  deliveryCoverage: null,
  deliveryCities: [],
  onlineOnly: false,
  pickupAvailable: null,
  branches: [],
  agreementConfirmed: false,
};

/** IIN (KZ_IP) and BIN (KZ_TOO) are both exactly 12 digits — the backend's
 *  LEGAL_IDENTIFIER pattern, mirrored so the form never sends a 400 it could
 *  have caught. */
const LEGAL_IDENTIFIER_RE = /^\d{12}$/;
/** Deliberately permissive: "something@something.tld", nothing cleverer. The
 *  backend applies NO validation to `corporateEmail`, so this exists to catch a
 *  typo in a channel customers will use, not to police address syntax — the
 *  strict RFC-shaped regexes reject real addresses, and this field is optional. */
const CORPORATE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits with the punctuation people actually type, 7–20 of them. KZ numbers
 *  are +7 XXX XXX XX XX, but a business may publish a short city or service
 *  number, so the shape is checked and the country is not assumed. */
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
/** The backend accepts an EMPTY link or an http(s) one. Blank is filtered out
 *  before send, so what is left must be a real absolute URL. */
const HTTP_URL_RE = /^https?:\/\/\S+$/;

export function legalFormNeedsIdentifier(
  legalForm: BusinessLegalForm | null,
): boolean {
  return legalForm === "KZ_IP" || legalForm === "KZ_TOO";
}

export function legalFormNeedsVerification(
  legalForm: BusinessLegalForm | null,
): boolean {
  return legalForm === "NONE";
}

/**
 * Validate the form against the SAME rules the backend asserts
 * (SellerOnboardingRequest's three @AssertTrue methods), so a rejection is
 * phrased in the field it belongs to instead of arriving as an opaque 400.
 *
 * Pure and translation-free: it returns message KEYS, and the hook resolves them
 * through next-intl. A pure function that had to hold a `t` would stop being
 * platform-neutral (D5) and stop being testable without a provider.
 */
export function validateOnboarding(
  values: SellerOnboardingValues,
): SellerOnboardingErrors {
  const errors: SellerOnboardingErrors = {};

  if (!values.businessName.trim()) errors.businessName = "errors.nameRequired";
  if (!values.categoryId && !values.categoryLabel.trim()) {
    errors.categoryLabel = "errors.categoryRequired";
  }
  if (!values.legalForm) errors.legalForm = "errors.legalFormRequired";

  // Both are OPTIONAL (the backend declares them plain `String`, no @Email, no
  // @NotBlank), so an empty field is valid and NOT an error. A filled one is
  // format-checked here only: these become the public contact channels on every
  // result card, and a typo there is unreachable-for-good rather than merely
  // wrong. Deliberately loose — an over-strict e-mail or phone regex rejects
  // real addresses and real numbers, which is the worse failure for a field
  // nobody is required to fill.
  const corporateEmail = values.corporateEmail.trim();
  if (corporateEmail && !CORPORATE_EMAIL_RE.test(corporateEmail)) {
    errors.corporateEmail = "errors.corporateEmailFormat";
  }
  const phone = values.phone.trim();
  if (phone && !PHONE_RE.test(phone)) errors.phone = "errors.phoneFormat";

  if (legalFormNeedsIdentifier(values.legalForm)) {
    if (!LEGAL_IDENTIFIER_RE.test(values.legalIdentifier.trim())) {
      errors.legalIdentifier = "errors.legalIdentifierFormat";
    }
    if (!values.legalName.trim()) errors.legalName = "errors.legalNameRequired";
  }

  if (legalFormNeedsVerification(values.legalForm)) {
    const linkErrors: Partial<Record<VerificationSource, string>> = {};
    let hasValidLink = false;
    for (const source of values.sources) {
      const value = (values.links[source] ?? "").trim();
      if (!value) {
        linkErrors[source] = "errors.linkRequired";
      } else if (!HTTP_URL_RE.test(value)) {
        linkErrors[source] = "errors.linkFormat";
      } else {
        hasValidLink = true;
      }
    }
    if (Object.keys(linkErrors).length > 0) errors.links = linkErrors;
    // The backend only counts non-blank links; the UX contract additionally
    // blocks while every supplied link is invalid. Both are one condition here.
    if (!hasValidLink) errors.sources = "errors.verificationRequired";
  }

  if (!values.deliveryCoverage) {
    errors.deliveryCoverage = "errors.deliveryCoverageRequired";
  } else if (
    values.deliveryCoverage === "SELECTED_CITIES" &&
    !values.deliveryCities.some((city) => city.trim())
  ) {
    // Mirrors SellerOnboardingRequest.isDeliveryCoverageValid — the backend's
    // own rule, not a UI preference (D9).
    errors.deliveryCities = "errors.deliveryCitiesRequired";
  }

  // `onlineOnly` forces pickupAvailable to false before this ever runs
  // (hooks.ts `setOnlineOnly`), so the pickup question only blocks the form
  // when the seller has NOT taken the online-only shortcut.
  if (!values.onlineOnly && values.pickupAvailable === null) {
    errors.pickupAvailable = "errors.pickupRequired";
  }

  if (!values.agreementConfirmed) {
    errors.agreementConfirmed = "errors.agreementRequired";
  }

  return errors;
}

export function hasOnboardingErrors(errors: SellerOnboardingErrors): boolean {
  return (
    Object.keys(errors).filter((key) => key !== "links").length > 0 ||
    Object.keys(errors.links ?? {}).length > 0
  );
}

/** The registration form's five steps — who you are; what you sell; delivery
 *  and branches; proof links; review and confirm. Numbered rather than named
 *  so `step + 1`/`step - 1` stays simple arithmetic at the call sites
 *  (hooks.ts) that step through them. */
export const ONBOARDING_STEP_COUNT = 5;
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

/** Step 4 (proof links) only has anything to validate — or show — when the
 *  legal form requires verification. `goNext`/`goBack` (hooks.ts) use this to
 *  skip the step entirely rather than render a page with nothing on it. */
export function stepIsSkippable(
  values: SellerOnboardingValues,
  step: OnboardingStep,
): boolean {
  return step === 4 && !legalFormNeedsVerification(values.legalForm);
}

/**
 * Validate only ONE step's fields, so `goNext` never surfaces an error for a
 * step the person has not reached yet. Reuses `validateOnboarding` (the one
 * place the backend's rules are encoded) and filters its result down — never
 * a second, parallel set of rules that could drift from the full validator
 * (P6.1). Step 2 (what you sell) always has a default, so it never blocks.
 *
 * Copies keys only when SET — a destructured `{ businessName } = full` would
 * put `businessName: undefined` on the result even when step 1 is clean,
 * and `hasOnboardingErrors` counts `Object.keys`, so an all-undefined object
 * still reads as "has errors". Object.keys doesn't know the difference
 * between absent and undefined; this function has to.
 */
export function validateOnboardingStep(
  values: SellerOnboardingValues,
  step: OnboardingStep,
): SellerOnboardingErrors {
  const full = validateOnboarding(values);
  const errors: SellerOnboardingErrors = {};
  if (step === 1) {
    if (full.businessName) errors.businessName = full.businessName;
    if (full.categoryLabel) errors.categoryLabel = full.categoryLabel;
    if (full.legalForm) errors.legalForm = full.legalForm;
    if (full.legalIdentifier) errors.legalIdentifier = full.legalIdentifier;
    if (full.legalName) errors.legalName = full.legalName;
    if (full.phone) errors.phone = full.phone;
    if (full.corporateEmail) errors.corporateEmail = full.corporateEmail;
  } else if (step === 3) {
    if (full.deliveryCoverage) errors.deliveryCoverage = full.deliveryCoverage;
    if (full.deliveryCities) errors.deliveryCities = full.deliveryCities;
    if (full.pickupAvailable) errors.pickupAvailable = full.pickupAvailable;
  } else if (step === 4) {
    if (full.sources) errors.sources = full.sources;
    if (full.links) errors.links = full.links;
  } else if (step === 5) {
    if (full.agreementConfirmed) {
      errors.agreementConfirmed = full.agreementConfirmed;
    }
  }
  return errors;
}

/**
 * Build the wire body from the form. Blank optional fields are DROPPED rather
 * than sent as "" — the backend's URL pattern tolerates empty strings, but its
 * verification record would then store a blank source as if one were supplied.
 */
export function toOnboardingRequest(
  values: SellerOnboardingValues,
  countryCode: string,
): SellerOnboardingRequest {
  const body: SellerOnboardingRequest = {
    businessName: values.businessName.trim(),
    countryCode,
    // Non-null by validation; the form cannot submit without a legal form.
    legalForm: values.legalForm as BusinessLegalForm,
    catalogSetupMode: values.catalogSetupMode,
    businessScope: values.businessScope,
    // Non-null by validation; the form cannot submit without a coverage choice.
    deliveryCoverage: values.deliveryCoverage as DeliveryCoverage,
    // Non-null by validation; the form cannot submit without an answer.
    pickupAvailable: values.pickupAvailable as boolean,
  };

  // Optional on the DTO and optional in the form — omitted rather than sent
  // blank, so a seller who declines both leaves no empty strings on their
  // public profile.
  const phone = values.phone.trim();
  if (phone) body.phone = phone;
  const corporateEmail = values.corporateEmail.trim();
  if (corporateEmail) body.corporateEmail = corporateEmail;

  // The backend rejects pickupAvailable: true with no branches (`@AssertTrue`
  // on SellerOnboardingRequest) — every drafted branch travels inline, created
  // atomically with the business rather than via a follow-up call.
  if (values.pickupAvailable && values.branches.length > 0) {
    body.pickupBranches = values.branches.map((branch) => ({
      name: branch.name,
      address: branch.address.trim() || undefined,
      addressDetails: branch.addressDetails.trim() || undefined,
      // Omitted entirely when unresolved — never sent as null or "". Without
      // it `branch_city` stays null and the branch is invisible to the
      // catalog's city filter (AUDIT_1 B3).
      cityId: branch.cityId || undefined,
      latitude: branch.latitude,
      longitude: branch.longitude,
      pickupAvailable: true,
    }));
  }

  if (values.deliveryCoverage === "SELECTED_CITIES") {
    const cities = values.deliveryCities
      .map((city) => city.trim())
      .filter(Boolean);
    if (cities.length > 0) body.deliveryCities = cities;
  }

  // A picked suggestion travels as an identity; anything else as free text,
  // which the backend turns into a USER category itself.
  if (values.categoryId) body.categoryId = values.categoryId;
  else body.categoryName = values.categoryLabel.trim();

  if (legalFormNeedsIdentifier(values.legalForm)) {
    body.legalIdentifier = values.legalIdentifier.trim();
    body.legalName = values.legalName.trim();
  }

  if (legalFormNeedsVerification(values.legalForm)) {
    for (const source of values.sources) {
      const value = (values.links[source] ?? "").trim();
      if (value) body[source] = value;
    }
  }

  return body;
}
