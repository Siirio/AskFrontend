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
| `sort` | string | no | `relevance` \| `distance` \| `price_asc` \| `lowest_price`. Regex-validated — **`intent_match` is now REJECTED** |
| `userLocation` | `{ lat, lng }` | no | `lat` −90..90, `lng` −180..180, both `@NotNull` when the object is present. Enables `distance` sort + `distanceMeters` on cards |
| `locale` | string, ≤16 | no | `^[A-Za-z]{2}([_-][A-Za-z]{2})?$`. **Load-bearing** — the server localizes prose in the response from it (see “Strings” below) |
| `page` | int 0–20 | no | Zero-based |
| `pageSize` | int 1–50 | no | |
| `explicitFilters` | `SearchFilterRequest` | no | ONE object. The old `filters` + `overrides` pair no longer exists — these are the user's explicit constraints and they win |

**Cross-field rule:** `explicitFilters.radiusMeters` requires `userLocation` — the backend
asserts it (`isRadiusLocationValid`). Never offer the radius control without a location fix.

### SearchFilterRequest
| Field | Type | Notes |
|---|---|---|
| `category` | string ≤255 | |
| `city` | string ≤255 | |
| `country` | string ≤2 | **new 2026-07-27** |
| `minPrice` / `maxPrice` | decimal ≥0 | Backend asserts `minPrice ≤ maxPrice` (`isPriceRangeValid`) |
| `openNow` | boolean | **new 2026-07-27** — no vision entry yet (P9.1); do not surface a control until there is one |
| `radiusMeters` | int 1–100000 | **new 2026-07-27 — this is the vision's "search within 100 km" filter.** 100 000 m is exactly the cap |

## SearchResponse

| Field | Notes |
|---|---|
| `rawQuery`, `mode` | Request context preserved. Note `mode`, not `scope` |
| `understoodQuery` | Human explanation of how the query was read. Render as intent feedback, **never as a control** |
| `sections` | `SearchSectionResponse[]` — see below. **The result list is sectioned, not flat** |
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
| `price`, `currency` | `price` nullable — render nothing when absent, never "0" |
| `businessProfile` | `{ logoUrl, coverUrl, description, number, email, instagramUrl, telegramUrl, websiteUrl }` |
| `availability` | `UNKNOWN` \| `AVAILABLE` \| `UNAVAILABLE` |
| `availabilityWarning` | **Server-localized prose**, non-null ONLY when `availability = UNKNOWN`. An honest caveat — availability is never invented (P9.4) |
| `matchReasons` | `string[]` — **server-localized prose**, "why this matched". Safe to render; this is the intent layer's core signal |
| `badges` | `string[]` — **hardcoded English tokens**, see below |
| `distanceMeters` | Nullable int. Renders only from this value (slice lock) — never derived from a city name |
| `branchName`, `branchAddress`, `branchCity` | Branch context |
| `openingSummary` | ⚠ **DECLARED BUT NEVER POPULATED.** `toCard()` has no `.openingSummary(...)` call — it is always null. Do NOT build an open/closed indicator on it. (`BranchResponse` does populate it; the search card does not.) Raised with backend |

`contactActions` is **GONE** — the whole `contact` module and its `contactActionId` privacy
pattern were deleted 2026-07-21. See ROADMAP gate **G3**.

## Strings — the split (decided 2026-07-28)

The backend returns two different kinds of string and they are handled differently. This is
a deliberate, owner-approved narrowing of slice DONE-criterion #3.

- **Badges are a closed token set → map each to a client i18n key.** The backend emits
  literal English: `"official channel"` (business profile has a website/telegram/instagram),
  `"complete card"` (the item has a summary), `"pickup"` (the branch has an address), plus the
  **active offer label** (free text from the business, e.g. "-30%"). Rendering the first three
  raw would ship English badges to every Russian and Kazakh user. Map the three known tokens;
  pass the offer label through as data. Badges render as METADATA — never a score, never a
  traffic light (project lock).
- **Prose renders as server copy.** `matchReasons`, section `title`/`reason`, and
  `availabilityWarning` are assembled server-side from `request.locale` (ru/kk/en) and cannot
  be reconstructed client-side. Send `locale` correctly and render what comes back.
- **Section headings use client keys** — `EXACT`/`ALTERNATIVE` are fixed, so they get real
  i18n keys and the server `title` is ignored.

An unknown badge token is dropped, not rendered raw — a new backend badge must be added
here deliberately.

## Filter reference data
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/cities | No | Location filter (search by city) |
| GET | /api/v1/cities/resolve | No | Resolve a city from coordinates |
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
- **Default sort is `relevance`** and stays that way (slice lock). Offer `distance` / `price_asc`
  only as explicit user choices. `lowest_price` exists on the wire but has no vision entry —
  do not surface it (P9.1).
- Never re-sort or re-filter a rendered page client-side to fake a server capability.
- **Still missing for the vision's §4 controls (gate G1):** a Unique-Offers sort, a Companies
  filter, and a map-area (bounding-box) filter. The 100 km radius **is now delivered** as
  `radiusMeters`.
- `openNow` and `lowest_price` are the reverse case — backend capability with no vision entry.
  Leave them unbuilt until the vision describes them.
