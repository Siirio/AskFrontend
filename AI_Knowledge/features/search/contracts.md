# Search — Consumed Backend Contracts

Source: `../Ask_Backend` module `search/basic` (`kz.ask.search.basic.api.*`).

> ## ⚠ 2026-07-28 — RECONCILED against backend `dev` @ `ee542d9`
>
> The previous version of this file (reconciled 2026-07-18) was stale in **nearly every
> field name**. Between 2026-07-26 and 2026-07-27 the backend rewrote search four times
> ("Major Refactor V10–V13 Search, 1st–4th iteration"), and the module moved to
> `search/basic`. Everything below is read from the **Java DTOs**, not from the backend's
> prose docs and not inferred from the old shape — the lock that governs e2e stubs
> (`Locks.md`, 2026-07-27) applies to this file for the same reason.
>
> **Do not build against the pre-2026-07-28 shape.** For the record, what changed:
> `scope`→`mode` (and it became REQUIRED), `intent_match`→`relevance`,
> `filters`+`overrides`→a single `explicitFilters`, and `contactActions` is gone.

**Wire format (D20):** the JSON is **snake_case** on the wire (`raw_query`, `page_size`,
`explicit_filters`, `has_next`, …). Field names below are camelCase — what slice code sees
after `shared/api` transforms keys at the transport boundary.

## Public search
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/search | **No** (in the backend's `permitAll` list, verified in `SecurityConfig`) | Home search form → Catalog Page results |

Anonymous. It **creates nothing** — no requests, chats, notifications, or supplier outreach.
`rawQuery` is required and returned unchanged.

## SearchRequest

| Field | Type | Required | Notes |
|---|---|---|---|
| `rawQuery` | string, ≤500 | **yes** (`@NotBlank`) | The complete visible customer query — any language, slang, typos. Sent unmodified (slice lock) |
| `mode` | `ITEM` \| `SERVICE` | **yes** (`@NotNull`) | **There is no `ALL`.** Every search picks one. Driven by the search-form toggle (PRODUCT_VISION UF 2.1, added 2026-07-28) |
| `sort` | string | no | `relevance` \| `distance` \| `price_asc` \| `price_desc` \| `unique_offers`. Regex-validated. **`unique_offers` added 2026-08-04 — gate G1's sort, now buildable.** `lowest_price` was REMOVED the same day (we never sent it); `price_desc` is new and NOT surfaced — §4 names one "Cost" sort and `price_asc` serves it (P9.1) |
| `userLocation` | `{ lat, lng }` | no | `lat` −90..90, `lng` −180..180, both `@NotNull` when the object is present. Enables `distance` sort + `distanceMeters` on cards |
| `locale` | string, ≤16 | no | `^[A-Za-z]{2}([_-][A-Za-z]{2})?$`. **Load-bearing** — the server localizes prose in the response from it (see “Strings” below) |
| `page` | int ≥0 | no | Zero-based. **The `@Max(20)` ceiling was REMOVED 2026-08-04** — together with `MAX_CANDIDATES`, which is gone entirely (the gateway now returns a real `Page<SearchHitDto>` with a true `hasNext`). **This is what makes infinite scroll possible** |
| `pageSize` | int 1–50 | no | |
| `explicitFilters` | `SearchFilterRequest` | no | ONE object. The old `filters` + `overrides` pair no longer exists — these are the user's explicit constraints and they win |

**THREE cross-field rules, all backend-asserted — each is a UI constraint, not advice.**
Breaking any is a 400:

1. `explicitFilters.radiusMeters` requires `userLocation` (`isRadiusLocationValid`). Never
   offer the radius control without a location fix.
2. **`sort: "distance"` requires `userLocation`** (`isDistanceLocationValid`, **new 2026-08-04**).
   The distance sort must be *unavailable* until a fix exists, not merely unhelpful.
3. **`city`, `radiusMeters` and `mapArea` are MUTUALLY EXCLUSIVE** (`isLocationFilterValid`,
   **new 2026-08-04** — at most ONE may be set). They are three answers to one question, *where*,
   so the UI presents them as a single choice and setting one CLEARS the other two. Three
   independent controls would 400 the moment a user ticked two.

### SearchFilterRequest
| Field | Type | Notes |
|---|---|---|
| `category` | string ≤255 | |
| `city` | string ≤255 | |
| `country` | string, **exactly 2** | Tightened from `≤2` to `@Size(min=2,max=2)` on 2026-08-04 — a 1-char value now 400s |
| `minPrice` / `maxPrice` | decimal ≥0 | Backend asserts `minPrice ≤ maxPrice` (`isPriceRangeValid`) |
| ~~`openNow`~~ | **REMOVED 2026-08-04.** Backend capability with no vision entry; never sent, so its deletion costs nothing |
| `radiusMeters` | int 1–100000 | The vision's "search within 100 km" filter. 100 000 m is exactly the cap. **Mutually exclusive with `city` and `mapArea`** |
| `businessIds` | `UUID[]`, max 100 | **The Companies filter — gate G1, delivered 2026-08-04.** Options come from `SearchResponse.companyFacets`, NEVER from the loaded cards |
| `mapArea` | `{ north, south, east, west }` | **The map-area filter — gate G1, delivered 2026-08-04.** All four `@NotNull` together; backend asserts `north > south && east > west`. **Mutually exclusive with `city` and `radiusMeters`** |

## SearchResponse

| Field | Notes |
|---|---|
| `rawQuery`, `mode` | Request context preserved. Note `mode`, not `scope` |
| `understoodQuery` | Human explanation of how the query was read. Render as intent feedback, **never as a control** |
| `sections` | `SearchSectionResponse[]` — see below. **The result list is sectioned, not flat** |
| `companyFacets` | `{ businessId, businessName, resultCount }[]` — the Companies filter's option list, **new 2026-08-04**. Computed server-side over the full current query with **every active filter EXCEPT `businessIds`**, so selecting a company never shrinks the list; counts cover the whole matching set, not the page. Pre-sorted by count desc then name — render as given. A backend LOCK forbids deriving these options from loaded cards |
| `interpretedConstraints` | `{ key, value, source }[]` — each effective constraint WITH its source, so the UI can say "we filtered by X" and let the user override |
| `page`, `pageSize`, `total`, `hasNext` | Drive the pager off these; never count client-side |
| `ambiguity` | string — set when the query was ambiguous |
| `suggestions` | `string[]` — alternative query suggestions |

`diagnostics` **no longer exists** on the DTO. Nothing to suppress.

### SearchSectionResponse
| Field | Notes |
|---|---|
| `type` | `"exact"` \| `"alternatives"` — lowercase |
| `kind` | `"EXACT"` \| `"ALTERNATIVE"` — uppercase. Both are emitted; **key the UI off `kind`** |
| `title` | **Server-localized prose** ("Совпадения" / "Сәйкестіктер" / "Matches") |
| `relaxedConstraints` | `string[]` — ALTERNATIVE only. Constraint keys: `max_price`, `min_price`, `city`, or a lowercased warning |
| `reason` | **Server-localized prose** — ALTERNATIVE only ("No additional exact matches were found; relaxed constraints: …") |
| `cards` | `SearchCardResponse[]` |

Sectioning is derived server-side: a result with no warnings lands in EXACT, a result with
any warning lands in ALTERNATIVE. A section is **omitted entirely when empty** — never
assume two sections exist.

### SearchCardResponse
| Field | Notes |
|---|---|
| `component` | `"ItemCard"` \| `"ServiceCard"`. The backend naming a frontend component is a layering smell — **map from `resultType` ourselves** and ignore this field |
| `resultId` | UUID — the item/service aggregate id |
| `resultType` | `"ITEM"` \| `"SERVICE"` |
| `businessId`, `businessName` | Brand layer |
| `brandColor` | Always populated (backend falls back to a default) |
| `brandLogoUrl` | Nullable |
| `title`, `summary`, `categoryLabel` | |
| `purchaseDestinations` | `PurchaseDestinationResponse[]` = `{ label, url }`, **ordered** (`@OrderColumn(display_order)` on both `Item` and `Service`), `[]` when the seller published none. **Gate G3's answer, delivered 2026-08-04 (`c56f75c`).** Read by the Product Card's "Proceed to Purchase" (roadmap #3): none → chat draft, one → go, several → chooser modal. A destination belongs to the item/service, never a branch; a verification link is never one (both are backend LOCKS as well as ours) |
| `images` | `CatalogImageResponse[]` = `{ id, url }` — ordered, **at most three, first is primary**, `[]` when none (`toCard()` defaults to `List.of()`, so never null). Server-generated ASK-managed media; a client never submits an external media URL. **Landed 2026-08-02 (`b02105a`). `images[0]` rendered on the result card since 2026-08-04**; the rest of the gallery renders in the Product Card modal (`@/catalog`, roadmap #3) — see § *Catalog images* |
| `price`, `currency` | `price` nullable — render nothing when absent, never "0" |
| `businessProfile` | `{ logoUrl, coverUrl, description, number, email, instagramUrl, telegramUrl, websiteUrl }` |
| `availability` | `UNKNOWN` \| `AVAILABLE` \| `UNAVAILABLE` |
| `availabilityWarning` | **Server-localized prose**, non-null ONLY when `availability = UNKNOWN`. An honest caveat — availability is never invented (P9.4) |
| `matchReasons` | `string[]` — **server-localized prose**, "why this matched". **Modelled, NOT rendered** (owner reversal 2026-08-06) — see § *Catalog images* below, which now also covers this field |
| `badges` | `string[]` — **stable UPPER_SNAKE tokens** (`OFFICIAL_CHANNEL`, `COMPLETE_CARD`, `PICKUP`) since 2026-08-04; they were lowercase English prose before. See below |
| `distanceMeters` | Nullable int. Renders only from this value (slice lock) — never derived from a city name |
| `branchName`, `branchAddress`, `branchCity` | Branch context |
| ~~`openingSummary`~~ | **REMOVED from the wire 2026-08-04 (`c56f75c`).** We raised "populate it or drop it"; they dropped it. Never modelled here, so its deletion cost nothing — the payoff for refusing to model a field that could never arrive |

`contactActions` is **GONE** — the whole `contact` module and its `contactActionId` privacy
pattern were deleted 2026-07-21. See ROADMAP gate **G3**.

## Strings — the split (decided 2026-07-28)

The backend returns two different kinds of string and they are handled differently. This is
a deliberate, owner-approved narrowing of slice DONE-criterion #3.

- **Badges are a closed token set → map each to a client i18n key.** The backend emits
  `OFFICIAL_CHANNEL` (business profile has a website/telegram/instagram), `COMPLETE_CARD` (the
  item has a summary), `PICKUP` (the branch has an address), plus the **active offer label**
  (free text from the business, e.g. "-30%"). Map the three known tokens; pass the offer label
  through as data. Badges render as METADATA — never a score, never a traffic light
  (project lock).

  > **⚠ RENAMED 2026-08-04 (`c56f75c`), and the rename was a SILENT regression.** These were
  > lowercase English prose — `"official channel"`, `"complete card"`, `"pickup"` — which is why
  > this repo asked for stable tokens on 2026-08-02. The backend delivered them. **Our own
  > drop-unknown rule then hid the break:** every token would have failed the lookup and been
  > filtered out, so every badge simply vanished from every card — no error, no English leaking,
  > nothing for CI to see. The rule worked exactly as designed and, in doing so, removed the
  > symptom that would have reported the breakage. **A closed token set must be re-verified
  > against the emitter on every backend bump**, because its failure mode is invisible by
  > construction.
- **Prose renders as server copy.** `matchReasons`, section `title`/`reason`, and
  `availabilityWarning` are assembled server-side from `request.locale` (ru/kk/en) and cannot
  be reconstructed client-side. Send `locale` correctly and render what comes back.
- **Section headings use client keys** — `EXACT`/`ALTERNATIVE` are fixed, so they get real
  i18n keys and the server `title` is ignored.

An unknown badge token is dropped, not rendered raw — a new backend badge must be added
here deliberately.

**`badges[0]` is the OFFER LABEL, not a token, whenever `hasActiveOffer` is true.**
`resolveBadges()` adds `activeOfferLabel` before the three known tokens, and
`hasActiveOffer` is computed from that same value in the same call — so the flag is the
authority for the Unique-Offer tint and the position of the label is a guarantee, not an
ordering guess. Split them with `separateBadges(badges, hasActiveOffer)`; never infer the
offer from badge text. *(Corrected 2026-08-02, AUDIT_2 N8 — the client used to treat any
unrecognised token as the offer label, which would have rendered the next backend badge as
raw English inside the offer tint.)*

**Three fields corrected on `SearchCardResponse` the same day (AUDIT_1 S5):** `hasActiveOffer`,
`latitude` and `longitude` are on the wire and are now modelled. The coordinates are read by
nothing yet — the map-area filter that wants them is parked behind G1 — but a field we receive
is modelled honestly rather than discovered later.

## Catalog images and match reasons — where this landed, and how it changed twice

Backend `b02105a` (2026-08-02) added `images` to `SearchCardResponse` and, in the same commit,
rewrote its own § *Result presentation* to describe a richer card (image, hover-preview panel,
mobile detail modal) and to say match reasons are metadata, not displayed. At the time, NEITHER
side of that matched what this client shipped, and three of the four statements were flagged as
direct conflicts (AUDIT_2 N11/N12) pending an owner decision. Two owner rulings have landed
since, on different days, and this section now reflects the CURRENT state rather than that
original audit snapshot:

| Backend describes | What ships today | Status |
|---|---|---|
| Primary catalog image on the row | `images[0]` renders on `ResultCard`; the rest of the gallery (up to 3) renders in the Product Card modal | **Adopted**, owner append 2026-08-04 (`PRODUCT_VISION.md` UF 2.1) |
| Desktop hover → gallery in a right panel; mobile row-tap → detail modal | Neither — the Product Card is a modal opened by a click/tap on the card (roadmap #3), not a hover panel | **Not adopted.** A different interaction model than the backend's own reference UI; ours is the one `PRODUCT_VISION.md` and D10/D33 describe |
| Match reasons NOT displayed | `matchReasons` is modelled, never rendered | **Adopted, as of 2026-08-06** — reverses the OPPOSITE 2026-08-02 ruling recorded below, which had rendered them as the intent-match signal. The client now agrees with the backend's own stance |
| Business avatar/chat do not open result details | The card itself opens the modal (avatar/chat are not separate triggers) | Compatible |

**History, kept because the reversal is the interesting part (P9.4 — the backend is the
authority for DATA, the vision for INTENT, and an intent call was made twice).** The 2026-08-02
owner ruling (`ROADMAP.md` cross-repo table) explicitly OVERRODE the backend's "not displayed"
stance and kept `matchReasons` rendered as "the intent layer's core affordance." The 2026-08-06
owner ruling reverses that override outright — match reasons are not shown to the customer.
`src/search/ui/ResultCard.tsx` no longer renders them (deleted the same day); the field stays
typed in `model.ts` because it is still on the wire and the backend remains the data authority —
only the rendering decision changed, twice, in opposite directions. See `PRODUCT_VISION.md`'s
2026-08-06 correction and `ROADMAP.md`'s cross-repo table for the full paper trail.

The data is modelled (`CatalogImage` in `model.ts`) because it is on the wire and the backend
is the data authority — a field we receive is modelled honestly rather than discovered later,
the same call made for `latitude`/`longitude`.

## Filter reference data
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/cities | No | Location filter. **NO parameters** — `CityController.listAll()` returns the WHOLE table as `CityDto { id: UUID, name: String }`. The client fetches once and filters in memory |
| GET | /api/v1/cities/resolve?**name**= | No | **Not consumed by `search`, and NOT usable for B3 as intended.** Resolves a NAME to `CityDto`; 404 `CITY_NOT_FOUND` on a miss. The plan was for `business-cabinet` to resolve a KATO `placeName` here — **measured 2026-08-02: 0 of 11 954 KATO names match any of the 23 seeded city rows, in either language.** See `features/business-cabinet/contracts.md` § *B3* |
| GET | /api/v1/categories?q=&type=ITEM\|SERVICE | No | Category filter. Flat — `{ suggestions: [{ categoryId, label, type, source }] }` |

## Retrieval behaviour (backend-owned — context, not a client control)
- **Meilisearch** is the primary engine, now with a multilingual **semantic lane** fused with
  two lexical lanes through RRF (2026-07-27). **PostgreSQL** hydrates canonical data and is the
  fallback. The client never depends on which lane answered.
- **AI query interpretation is optional** — deterministic interpretation always runs, explicit
  request values win, and any provider error falls back to deterministic.
- `SEARCH_PROJECTION_INVALID` is thrown for an unknown document type (500). Treat as a generic
  search failure.

## Gaps (P9.4 — never fake client-side)
- **Default sort is `relevance`** and stays that way (slice lock). Offer `distance`,
  `price_asc` and `unique_offers` only as explicit user choices. `price_desc` exists on the
  wire and has no vision entry — do not surface it (P9.1). (`lowest_price` used to be the
  example here; the backend REMOVED it on 2026-08-04.)
- Never re-sort or re-filter a rendered page client-side to fake a server capability.
- ~~**Still missing for the vision's §4 controls (gate G1)**~~ — **ALL THREE DELIVERED
  2026-08-04.** `unique_offers` joined the `sort` regex, `explicitFilters.businessIds`
  (`List<UUID>`, max 100) is the Companies filter, and `explicitFilters.mapArea` is the
  bounding box. **Gate G1 is fully unparked** and infinite scroll is buildable: `MAX_CANDIDATES`
  is gone (real `Page<SearchHitDto>` paging with a true `hasNext`) and `page` no longer carries
  `@Max(20)`.
- **`openNow` and `lowest_price` are GONE** from the wire (`c56f75c`) — both were backend
  capability with no vision entry, and we never sent either. `price_desc` arrived in the same
  commit and is the same case: §4 names ONE "Cost" sort and `price_asc` already serves it, so it
  is not surfaced (P9.1). A client narrower than the wire keeps being the right direction.
