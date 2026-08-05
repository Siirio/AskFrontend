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

/**
 * The sort values the vision has a control for (§4: Relevance, Distance, Cost,
 * Unique Offers).
 *
 * **`unique_offers` UNPARKED 2026-08-04 (backend `c56f75c`)** — gate G1's last
 * sort blocker. It was absent from the wire, so the control could not exist
 * without faking it client-side, which the slice lock forbids.
 *
 * `price_desc` also arrived in the same commit and is deliberately NOT here:
 * the vision's §4 names a single "Cost" sort, and `price_asc` already serves
 * it. A wire value with no vision entry is never surfaced (P9.1) — the same
 * call made for `lowest_price`, which this backend version REMOVED, proving the
 * narrower-client-than-wire direction was right.
 */
export const SORT_OPTIONS = [
  "relevance",
  "distance",
  "price_asc",
  "unique_offers",
] as const;
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

/** A map viewport, as `SearchMapAreaRequest`. All four bounds are `@NotNull`
 *  together, and the backend asserts `north > south && east > west` — send the
 *  whole box or none of it. Unparked 2026-08-04 (gate G1). */
export type SearchMapArea = {
  north: number;
  south: number;
  east: number;
  west: number;
};

/**
 * THREE cross-field rules are enforced by the backend. Breaking any is a 400,
 * so each one is a UI constraint, not a suggestion:
 *
 * 1. `radiusMeters` requires `userLocation` (`isRadiusLocationValid`).
 * 2. **`sort: "distance"` requires `userLocation`** (`isDistanceLocationValid`,
 *    NEW in `c56f75c`) — the distance sort must be unavailable, not merely
 *    unhelpful, until a location fix exists.
 * 3. **`city`, `radiusMeters` and `mapArea` are MUTUALLY EXCLUSIVE**
 *    (`isLocationFilterValid`, NEW in `c56f75c`: at most ONE may be set).
 *    They are three answers to one question — *where* — so the UI must present
 *    them as a single choice. Setting a new one CLEARS the other two; offering
 *    them as independent checkboxes would 400 the moment two are ticked.
 */
export type SearchFilterRequest = {
  category?: string;
  city?: string;
  /** Exactly 2 chars (`@Size(min=2,max=2)`) — tightened in `c56f75c`. */
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  radiusMeters?: number;
  /** The Companies filter — up to 100 business ids (gate G1, unparked
   *  2026-08-04). Options come from `SearchResponse.companyFacets`, NEVER from
   *  the loaded cards (backend lock + our own server-capability lock). */
  businessIds?: string[];
  mapArea?: SearchMapArea;
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

/**
 * `PurchaseDestinationResponse` — one seller-published place to buy this exact
 * item or service. **The G3 contract, delivered by backend `c56f75c`.**
 *
 * Stored as an `@ElementCollection` with `@OrderColumn(display_order)` on BOTH
 * `Item` and `Service`, so the order is the seller's and is stable — render it
 * as given, never re-sort. `label` is what the chooser modal shows; `url` is
 * where it goes.
 *
 * Two rules travel with this field, and both are LOCKS on the backend side as
 * well as ours (PRODUCT_VISION UF 2.1, `item/locks.md`, `service/locks.md`):
 * a destination belongs to the item or service and **never to a branch**, and
 * a link collected to VERIFY a business (`kaspiUrl`/`ozonUrl`/`wildberriesUrl`
 * on `BusinessVerification`) is **never** reused as one.
 */
export type PurchaseDestination = {
  label: string;
  url: string;
};

/**
 * `SearchCompanyFacetResponse` — the option list for the Companies filter.
 *
 * **Computed by the backend over the full current query with every active
 * filter EXCEPT `businessIds`** (their lock, added with the feature). That
 * exception is the whole point and is easy to lose: counting *with*
 * `businessIds` applied would collapse the list to whatever is already
 * selected, so a multi-select could never gain a second company. Counts cover
 * the entire matching set, not the loaded page.
 *
 * Already sorted by `resultCount` desc, then name — render in the given order.
 */
export type SearchCompanyFacet = {
  businessId: string;
  businessName: string;
  resultCount: number;
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
  /** Ordered seller-published places to buy — `[]` when the seller listed none.
   *  **This is what gate G3's "Proceed to Purchase" button reads** (backend
   *  `c56f75c`): none → open chat with an editable, never-auto-sent draft; one
   *  → go there; several → the chooser modal. Built with the Product Card
   *  (roadmap #3), which is the only surface the vision puts the button on. */
  purchaseDestinations: PurchaseDestination[];
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
  // `openingSummary` is GONE from the wire as of backend `c56f75c` — it was
  // declared but never assigned, we raised "populate it or remove it", and
  // they removed it. Never modelled here, so its deletion costs nothing: that
  // is the payoff for not modelling a field that could never arrive.
  // `component` is likewise omitted — mapping the card kind from `resultType`
  // ourselves, never from a backend-named frontend component (contracts.md).
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
  /** Option list + counts for the Companies filter (backend `c56f75c`).
   *  Server-computed over the whole result set — this is what makes the
   *  control possible without deriving options from loaded cards. */
  companyFacets: SearchCompanyFacet[];
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
 * The backend emits three STABLE TOKENS plus a free-text offer label. Only the
 * three known tokens map to an i18n key; everything else (including a future
 * backend addition) is DROPPED, never rendered raw (contracts.md, slice lock).
 *
 * **Renamed 2026-08-04 to match backend `c56f75c`.** These were lowercase
 * English prose — `"official channel"`, `"complete card"`, `"pickup"` — because
 * that is literally what `resolveBadges()` used to `badges.add(...)`. It now
 * adds `OFFICIAL_CHANNEL` / `COMPLETE_CARD` / `PICKUP`, which is the stable
 * token contract this repo asked for on 2026-08-02.
 *
 * **This rename was a silent live regression, and it is worth understanding
 * why it was silent.** Our own drop-unknown rule is what hid it: the day the
 * backend deployed, every token would have failed the lookup and been filtered
 * out, so every badge simply vanished from every card — no error, no English
 * leaking, nothing for CI to catch. The rule did its job (a ru/kk product never
 * shipped raw English) and in doing so removed the symptom that would have
 * reported the breakage. A closed token set needs its spellings verified
 * against the emitter on every backend bump, precisely because failure is
 * invisible; the e2e stubs are built from `resolveBadges()` for that reason.
 */
const BADGE_I18N_KEYS: Record<string, string> = {
  OFFICIAL_CHANNEL: "badges.officialChannel",
  COMPLETE_CARD: "badges.completeCard",
  PICKUP: "badges.pickup",
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
  /** The Companies filter, as a COMMA-SEPARATED list of business ids. One param
   *  rather than a repeated `businessIds=` so `useUpdateCatalogParams` — which
   *  works in `set`/`delete` pairs over `URLSearchParams` — needs no special
   *  case, and so the catalog remount key (a flat string) stays comparable. */
  businessIds?: string;
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
    businessIds: firstValue(raw.businessIds),
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
  const minPrice = toNumber(params.minPrice);
  const maxPrice = toNumber(params.maxPrice);
  if (minPrice !== undefined) explicitFilters.minPrice = minPrice;
  if (maxPrice !== undefined) explicitFilters.maxPrice = maxPrice;

  const lat = toNumber(params.lat);
  const lng = toNumber(params.lng);
  const hasLocation = lat !== undefined && lng !== undefined;
  const radiusMeters = toNumber(params.radiusMeters);

  // ── WHERE: at most ONE of city / radiusMeters / mapArea ────────────────────
  // `isLocationFilterValid` on the backend rejects any two at once, so sending
  // both is a 400 rather than a narrower search. `FilterPanel` cannot produce
  // that combination — the control is a radio group — but this route is
  // reachable DIRECTLY with a typed, bookmarked or pre-rework URL, which is the
  // same reason the route file guards a blank `rawQuery`. A UI that cannot
  // express an invalid state does not make the state unreachable.
  //
  // Radius wins when both are present: it is the more specific answer, and it
  // is the one that needed an explicit permission grant to exist at all.
  // Cross-field rule two: radiusMeters requires userLocation, so a radius with
  // no coordinate fix is dropped rather than sent.
  // The Companies filter. Capped at 100 to match `@Size(max = 100)` — a longer
  // list is a 400, and silently truncating is the honest degrade here because
  // the cap is far beyond any list a person assembles by clicking.
  const businessIds = (params.businessIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (businessIds.length > 0) explicitFilters.businessIds = businessIds;

  const useRadius = radiusMeters !== undefined && hasLocation;
  if (useRadius) {
    explicitFilters.radiusMeters = radiusMeters;
  } else if (params.city) {
    explicitFilters.city = params.city;
  }

  const request: SearchRequest = {
    rawQuery: params.query?.trim() ?? "",
    mode: isSearchMode(params.mode) ? params.mode : "ITEM",
    locale,
    page: toNumber(params.page) ?? 0,
  };
  // Third cross-field rule (`isDistanceLocationValid`, backend c56f75c): the
  // distance SORT requires userLocation, so a `distance` with no fix is dropped
  // to the default rather than sent as a 400 that would lose the whole search.
  //
  // **This is a LAST-RESORT guard, not the mechanism.** An earlier version made
  // it the mechanism, and it produced a live-looking control that did nothing:
  // the tab rendered selected while the results came back by relevance. The
  // real fix is in `SortControl`, which asks for the fix before it ever sets
  // `sort=distance` — so in the UI this branch is unreachable. It stays for the
  // case the UI cannot cover: a typed, bookmarked or shared URL carrying
  // `sort=distance` with no coordinates, the same class the `rawQuery` guard in
  // the route file exists for.
  if (isSortOption(params.sort)) request.sort = params.sort;
  if (request.sort === "distance" && !hasLocation) delete request.sort;
  if (hasLocation) request.userLocation = { lat, lng };
  if (Object.keys(explicitFilters).length > 0) {
    request.explicitFilters = explicitFilters;
  }
  return request;
}
