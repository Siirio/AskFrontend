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

/**
 * `CatalogImageResponse` — one ASK-managed catalog image (`kz.ask.offer.media`).
 *
 * Both fields are server-generated: `url` points at ASK's own media storage and
 * a client NEVER submits an external media URL (backend `item/contracts.md`).
 * The gallery holds at most three images and the FIRST is primary.
 */
export type CatalogImage = {
  id: string;
  url: string;
};

export type SearchCardResponse = {
  resultId: string;
  resultType: "ITEM" | "SERVICE";
  businessId: string;
  businessName: string;
  brandColor: string;
  brandLogoUrl: string | null;
  title: string;
  summary: string | null;
  /** Ordered catalog gallery, first entry primary; `[]` when the seller
   *  uploaded none. Landed on the wire 2026-08-02 (backend `b02105a`).
   *  **Modelled, deliberately NOT rendered** — PRODUCT_VISION describes no
   *  image on a result card, and inventing UI is forbidden (P9.1). The backend
   *  ALSO shipped a result-presentation contract in the same commit (primary
   *  image on the row, desktop hover-preview panel, mobile modal, match reasons
   *  no longer displayed) that our `ux-ui-flow.md` does not describe. Both are
   *  raised for an owner decision, not inferred — see `contracts.md`
   *  § *Catalog images* and AUDIT_2 N11/N12. */
  images: CatalogImage[];
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
  /** Hardcoded-English tokens — map through BADGE_I18N_KEYS, drop unknown.
   *  When `hasActiveOffer` is true the FIRST entry is the offer LABEL, not a
   *  token: `resolveBadges()` adds `activeOfferLabel` before the three known
   *  tokens. Always separate them with `separateBadges`, never by guessing. */
  badges: string[];
  /** The authority for the Unique-Offer tint (TINT IS INFORMATION lock).
   *  Backend: `hasActiveOffer = activeOfferLabel != null && !isBlank()`, and
   *  that same label is `badges[0]` — the two are derived from ONE value in
   *  one call, so "true" guarantees `badges[0]` is the label. */
  hasActiveOffer: boolean | null;
  distanceMeters: number | null;
  /** Branch coordinates. Modelled because they are ON the wire; nothing reads
   *  them yet — the map-area filter that wants them is parked behind G1. */
  latitude: number | null;
  longitude: number | null;
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

/**
 * `CityDto` — the WHOLE shape `GET /api/v1/cities` returns (`{id, name}`).
 *
 * Corrected 2026-08-02 (AUDIT_1 S1). This was `{ city: string }`, a shape that
 * exists nowhere on the backend: every option row rendered blank, every React
 * key was `undefined`, and picking one set the filter to `undefined`. Invented
 * client-side, which is precisely what the Data Lock forbids.
 *
 * `id` is unused today — the filter travels as a NAME (`explicitFilters.city`
 * is a `String`). It is modelled because it is what the endpoint returns, and
 * it is the stable React key.
 */
export type CitySuggestion = {
  id: string;
  name: string;
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

// `knownBadgeKeys()` was deleted 2026-08-02: exported, called from nowhere
// (P8.1), and once `separateBadges` below did its own map-and-drop it was a
// second implementation of one concern (P6.1). The mapping lives in exactly
// one function now.

/**
 * Split a card's raw `badges[]` into the closed token set (mapped to i18n keys)
 * and the free-text offer label, using `hasActiveOffer` as the authority.
 *
 * **Rewritten 2026-08-02 (AUDIT_2 N8) — the previous version inverted the slice
 * lock it claimed to implement.** It treated any UNRECOGNISED token as the
 * offer label (`else offerLabel = badge`), so the first badge the backend ever
 * added would have rendered raw English inside `bg-offer` — a fake discount
 * signal, breaking both "an unrecognised badge is DROPPED" and TINT IS
 * INFORMATION. It was an assignment too, so with two unknowns the LAST won,
 * silently overwriting the genuine label that `resolveBadges()` puts first.
 *
 * The offer label is passed through as data, never through i18n (contracts.md):
 * it is the business's own words. The token spellings live in
 * `BADGE_I18N_KEYS` alone (P6.2), so no component carries its own copy.
 */
export function separateBadges(
  badges: string[],
  hasActiveOffer: boolean | null,
): {
  badgeKeys: string[];
  offerLabel: string | null;
} {
  // `hasActiveOffer` is the AUTHORITY, and `badges[0]` is where the label sits
  // when it is true — both come from `activeOfferLabel` inside one call to
  // `resolveBadges()`, so this is a guarantee rather than an ordering guess.
  const offerLabel = hasActiveOffer === true ? (badges[0] ?? null) : null;
  const tokens = offerLabel === null ? badges : badges.slice(1);

  // Unknown token → DROPPED (slice lock). It is the backend's hardcoded English
  // and this is a ru/kk product, so rendering it raw ships English; the badge
  // set is closed on purpose and a new one waits for an i18n key.
  const badgeKeys = tokens
    .map((token) => BADGE_I18N_KEYS[token])
    .filter((key): key is string => key !== undefined);

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
function firstValue(value: string | string[] | undefined): string | undefined {
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
