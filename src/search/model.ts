/**
 * Search domain types and DTO→view-model mappers.
 *
 * The DTO shapes below are READ from the AskBackend `search/basic` module
 * (`kz.ask.search.basic.api.*`) — the data authority (D9, P9.4). Reconciled
 * against `dev` `ee542d9` on 2026-07-28; see `features/search/contracts.md`
 * for the full field-by-field notes this file must stay in sync with.
 * DTOs are never invented or patched client-side; a mismatch is raised, not
 * faked.
 *
 * Platform-neutral and DOM-free (D5): this file runs during SSR (the Catalog
 * Page route file calls `api.search()` directly, D7) and lifts into a React
 * Native package later. Mappers are pure functions (P5.1).
 */

// ── Enums ────────────────────────────────────────────────────────────────────

/** kz.ask.search.basic.api.dto.SearchScope — every search picks exactly ONE;
 *  there is no "all" (slice lock, PRODUCT_VISION UF 2.1). */
export const SEARCH_MODES = ["ITEM", "SERVICE"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** The sort values the vision has a control for (§4: Relevance, Distance,
 *  Cost). `lowest_price` exists on the wire but has no vision entry — never
 *  surfaced (P9.1). Unique-Offers has no backend sort — parked (gate G1). */
export const SORT_OPTIONS = ["relevance", "distance", "price_asc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export type SectionKind = "EXACT" | "ALTERNATIVE";

export type Availability = "UNKNOWN" | "AVAILABLE" | "UNAVAILABLE";

// ── Request DTOs ─────────────────────────────────────────────────────────────

/** POST /api/v1/search — anonymous, creates nothing. */
export type SearchRequest = {
  rawQuery: string;
  mode: SearchMode;
  sort?: SortOption;
  userLocation?: { lat: number; lng: number };
  locale?: string;
  page?: number;
  pageSize?: number;
  explicitFilters?: SearchFilterRequest;
};

/** Cross-field rule enforced by the backend: `radiusMeters` requires
 *  `userLocation` — never offer the radius control without a location fix
 *  (contracts.md). */
export type SearchFilterRequest = {
  category?: string;
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  radiusMeters?: number;
};

// ── Response DTOs ────────────────────────────────────────────────────────────

export type SearchCardResponse = {
  resultId: string;
  resultType: "ITEM" | "SERVICE";
  businessId: string;
  businessName: string;
  brandColor: string;
  brandLogoUrl: string | null;
  title: string;
  summary: string | null;
  categoryLabel: string | null;
  price: number | null;
  currency: string | null;
  businessProfile: {
    logoUrl: string | null;
    coverUrl: string | null;
    description: string | null;
    number: string | null;
    email: string | null;
    instagramUrl: string | null;
    telegramUrl: string | null;
    websiteUrl: string | null;
  } | null;
  availability: Availability;
  /** Server-localized prose, populated ONLY when availability is UNKNOWN. */
  availabilityWarning: string | null;
  /** Server-localized "why this matched" prose — safe to render as-is. */
  matchReasons: string[];
  /** Hardcoded-English tokens — map through BADGE_I18N_KEYS, drop unknown. */
  badges: string[];
  distanceMeters: number | null;
  branchName: string | null;
  branchAddress: string | null;
  branchCity: string | null;
  // `openingSummary` deliberately NOT modelled — declared on the Java DTO but
  // never assigned (toCard() has no .openingSummary() call), always null on
  // the wire. Reading it would invite a control gated on a value that can
  // never arrive (slice lock). `component` is likewise omitted — mapping the
  // card kind from `resultType` ourselves, never from a backend-named
  // frontend component (contracts.md).
};

export type SearchSectionResponse = {
  type: "exact" | "alternatives";
  kind: SectionKind;
  /** Server-localized title — IGNORED. Section headings use client i18n keys
   *  (contracts.md "Strings — the split"). */
  title: string;
  /** ALTERNATIVE only — which constraints were relaxed. */
  relaxedConstraints: string[] | null;
  /** ALTERNATIVE only — server-localized prose explaining why. Render it. */
  reason: string | null;
  cards: SearchCardResponse[];
};

export type SearchResponse = {
  rawQuery: string;
  mode: SearchMode;
  understoodQuery: string | null;
  sections: SearchSectionResponse[];
  interpretedConstraints: { key: string; value: string; source: string }[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  ambiguity: string | null;
  suggestions: string[];
};

export type CitySuggestion = {
  city: string;
};

export type CityResolveResponse = {
  city: string | null;
};

// ── Badges — closed token set (slice lock) ──────────────────────────────────

/**
 * The backend emits three hardcoded-English tokens plus a free-text offer
 * label. Only the three known tokens map to an i18n key; everything else
 * (including a future backend addition) is DROPPED, never rendered raw —
 * shipping raw English into a ru/kk product the day the backend adds a
 * fourth token is exactly the failure this map prevents (contracts.md,
 * slice lock).
 */
const BADGE_I18N_KEYS: Record<string, string> = {
  "official channel": "badges.officialChannel",
  "complete card": "badges.completeCard",
  pickup: "badges.pickup",
};

/** Map a card's raw badge tokens to i18n keys, dropping anything unrecognised. */
export function knownBadgeKeys(badges: string[]): string[] {
  return badges
    .map((badge) => BADGE_I18N_KEYS[badge])
    .filter((key): key is string => Boolean(key));
}

/**
 * Split a card's raw `badges[]` into the closed token set (mapped to i18n
 * keys) and the one free-text offer label the business supplies (passed
 * through as data, never mapped through i18n — contracts.md). The token
 * spellings live in `BADGE_I18N_KEYS` alone (P6.2) — this is the one place
 * that decides "known token vs. offer label", so a UI component never needs
 * its own copy of the token set.
 */
export function separateBadges(badges: string[]): {
  badgeKeys: string[];
  offerLabel: string | null;
} {
  const badgeKeys: string[] = [];
  let offerLabel: string | null = null;
  for (const badge of badges) {
    const key = BADGE_I18N_KEYS[badge];
    if (key) badgeKeys.push(key);
    else offerLabel = badge;
  }
  return { badgeKeys, offerLabel };
}

// ── URL ⇄ request mapping (pure, P5.1) ───────────────────────────────────────

/** The Catalog Page's own query-param vocabulary — the ONE place a param name
 *  is spelled, so the route file and the client controls agree (P6.2). */
export type CatalogSearchParams = {
  query?: string;
  mode?: string;
  sort?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  radiusMeters?: string;
  lat?: string;
  lng?: string;
  page?: string;
};

/** Next.js's `searchParams` values may be `string | string[] | undefined` —
 *  collapse a repeated param to its first occurrence, matching how a browser
 *  URL naturally reads (last-write-wins on a form navigation, never an array
 *  a slice control would ever produce). */
function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse the raw Next.js `searchParams` into the Catalog Page's own param
 *  vocabulary (P6.2 — the one place a param name is spelled). */
export function parseCatalogSearchParams(
  raw: Record<string, string | string[] | undefined>,
): CatalogSearchParams {
  return {
    query: firstValue(raw.query),
    mode: firstValue(raw.mode),
    sort: firstValue(raw.sort),
    city: firstValue(raw.city),
    minPrice: firstValue(raw.minPrice),
    maxPrice: firstValue(raw.maxPrice),
    radiusMeters: firstValue(raw.radiusMeters),
    lat: firstValue(raw.lat),
    lng: firstValue(raw.lng),
    page: firstValue(raw.page),
  };
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function isSearchMode(value: string | undefined): value is SearchMode {
  return SEARCH_MODES.includes(value as SearchMode);
}

function isSortOption(value: string | undefined): value is SortOption {
  return SORT_OPTIONS.includes(value as SortOption);
}

/**
 * Build the outbound SearchRequest from the Catalog Page's URL params. `mode`
 * defaults to ITEM only as a URL-parsing fallback (an unset/garbled param),
 * never as a product default — the toggle on Home always sends an explicit
 * value (slice lock: the customer chooses).
 */
export function toSearchRequest(
  params: CatalogSearchParams,
  locale: string,
): SearchRequest {
  const explicitFilters: SearchFilterRequest = {};
  if (params.city) explicitFilters.city = params.city;
  const minPrice = toNumber(params.minPrice);
  const maxPrice = toNumber(params.maxPrice);
  if (minPrice !== undefined) explicitFilters.minPrice = minPrice;
  if (maxPrice !== undefined) explicitFilters.maxPrice = maxPrice;
  const radiusMeters = toNumber(params.radiusMeters);
  // Cross-field rule (contracts.md): radiusMeters requires userLocation. Drop
  // the radius silently if a coordinate fix never arrived rather than send a
  // request the backend rejects.
  const lat = toNumber(params.lat);
  const lng = toNumber(params.lng);
  const hasLocation = lat !== undefined && lng !== undefined;
  if (radiusMeters !== undefined && hasLocation) {
    explicitFilters.radiusMeters = radiusMeters;
  }

  const request: SearchRequest = {
    rawQuery: params.query?.trim() ?? "",
    mode: isSearchMode(params.mode) ? params.mode : "ITEM",
    locale,
    page: toNumber(params.page) ?? 0,
  };
  if (isSortOption(params.sort)) request.sort = params.sort;
  if (hasLocation) request.userLocation = { lat, lng };
  if (Object.keys(explicitFilters).length > 0) {
    request.explicitFilters = explicitFilters;
  }
  return request;
}
