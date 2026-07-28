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
 *  separate follow-up screen for scoping/pricing the import (roadmap #8) — the
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
} & Partial<Record<VerificationSource, string>>;

export type SellerOnboardingResponse = {
  businessId: string;
  catalogSetupMode: CatalogSetupMode;
  /** "BUSINESS_CABINET" | "MANAGED_IMPORT". Deliberately NOT consumed: the
   *  client re-reads GET /auth/session after onboarding and follows THAT
   *  startRoute, because the session is the authority on where a role lands
   *  (auth slice lock) and it is the value that is now stale. */
  startRoute?: string;
};

/** POST /api/v1/businesses/{businessId}/branches (OWNER, Bearer). Mirrors
 *  `kz.ask.business.branch.api.dto.CreateBranchRequest` exactly — `latitude`/
 *  `longitude` are `@NotNull` on the backend, so the map picker in the
 *  registration wizard is not decorative: it is how this request gets built. */
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
 *  `businessId`) exists. Submitted for real via `api.createBranch` right
 *  after `onboardSeller` resolves — never part of `SellerOnboardingRequest`. */
export type DraftBranch = {
  /** Client-only key for list rendering/removal; never sent to the backend. */
  draftId: string;
  name: string;
  address: string;
  addressDetails: string;
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
   *  own; only the SEPARATE follow-up scoping dialog (roadmap #8) is missing,
   *  not this field. */
  catalogSetupMode: CatalogSetupMode;
  legalForm: BusinessLegalForm | null;
  legalIdentifier: string;
  legalName: string;
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
  /** Drafted during step 3's map modal, submitted individually via
   *  `api.createBranch` once `businessId` exists (see hooks.ts `submit`). */
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
