# Search — Screens & Flow

Traces PRODUCT_VISION **UF 2.1** (customer wants to find a product), steps 1–2.

**Updated 2026-07-28** for backend `dev` `ee542d9`: the mode toggle, the sectioned result
list, and an empty state that no longer routes to the deleted requests feature.

**Shipped 2026-07-28 (roadmap Phase 1 #2).** `src/search/` — `HomePage`/`SearchForm`,
`CatalogPage`/`SortControl`/`FilterPanel`/`CityField`/`ResultSection`/`ResultCard`, wired at
`/app` and `/app/catalog`. Implementation notes not obvious from the plan below:

- **State is the URL, not a store.** `CatalogSearchParams` (model.ts) is the one param
  vocabulary; the route file parses it and calls `search()` server-side (D7) — sort/filter
  controls are client islands pushing new params via `useUpdateCatalogParams` (hooks.ts), never
  a `store.ts`. Nothing here outlives one render.
- **Result cards are non-interactive.** The Product Card modal (D10) is `catalog`'s (roadmap
  slice #3, not built yet) — cards render the full brand+decision layer but have no click
  target, rather than a click that goes nowhere (project lock). `ResultSection`/`CatalogPage`
  will gain a `select` prop when that slice lands; this slice's data flow does not change.
- **The radius filter is explicit opt-in only** (`useGeolocation`, hooks.ts) — the browser's
  location permission prompt fires only from a click on the "search within 100 km" checkbox,
  never on page load. The 100 km value is fixed (the vision's only named radius, §4), not an
  arbitrary slider.
- **Category is not a Catalog Page filter.** PRODUCT_VISION §4 lists Price/Companies/Location
  only — no category filter exists on this screen (P9.1). `GET /api/v1/categories` is unused by
  this slice.
- Gate **G1**'s three parked controls (Unique-Offers sort, Companies filter, map-area filter)
  are not built, per the gate.

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Home — navigation menu, text, search form | /app | server (+ client search form) |
| Catalog Page — result list, sorting, filters | /app/catalog | server (+ client controls) |

> **Rendering note (D23).** D7 called these "public surfaces". They are still server-rendered,
> but since D23 the whole `(main)` group sits behind the client auth gate — Home and Catalog are
> NOT publicly reachable or crawlable. Do not plan SEO work against them.

## Flow
1. **Home**: navigation menu, headline text, search form. The customer picks a **mode**
   (goods / services) and types a natural-language query — any language, slang, typos. It is
   sent raw.
2. **Catalog Page**: results, grouped into sections, with sorting and filters.
3. Selecting a result opens the **Product Card** as a modal over the list (owned by `@/catalog`,
   D10), rendered from the search card payload — see that slice's contracts for why.

## The search form
One query input and **one control: the goods/services toggle** (PRODUCT_VISION UF 2.1,
appended 2026-07-28). Every search carries exactly one mode; the API has no "everything"
option. The mode is part of the query, not a filter — it does not live with the Catalog
Page's filter controls, and it is not presented as one.

Sorting and filtering belong to the Catalog Page, never to Home.

## Result list — sectioned, not flat
The response returns `sections[]`, keyed off `kind`:

- **`EXACT`** — results matching every constraint.
- **`ALTERNATIVE`** — results where a constraint was relaxed. Carries `relaxedConstraints`
  (which ones) and a server-written `reason` (why). **Render the reason** — an alternative
  presented without saying what was loosened is a silent lie about the match.

A section is **omitted when empty**. Never assume both exist: exact-only, alternatives-only,
and neither are all valid responses.

## Sorting (PRODUCT_VISION §4)
Relevance (default) · Distance · Cost · ~~Unique Offers~~

Relevance is the wire value `relevance` (renamed from `intent_match`). **Price-ascending is
never the default and never presented as the "right" way to choose** — ASK is an intent layer,
not a marketplace.

**Unique Offers sort is PARKED (gate G1)** — no backend sort supports it. Do not render the
tab. `lowest_price` exists on the wire but has no vision entry; leave it unbuilt (P9.1).

## Filters (PRODUCT_VISION §4)
Price · ~~Companies~~ · Location (**within 100 km** · by city · ~~by map area~~)

- **Price** — `minPrice`/`maxPrice`. Ships.
- **Location by city** — `city`. Ships.
- **Location within 100 km** — **now buildable**: `radiusMeters` (1–100 000). Requires
  `userLocation`; the backend rejects a radius without one. Gate the control on having a real
  location fix, and never show it as available while location is denied or pending.
- **Companies** and **map area** — PARKED (gate G1), no backend param.

`openNow` and `country` exist on the wire with no vision entry — not built (P9.1).

## Result cards
Two layers, per the anti-marketplace contract:
- **Brand layer** — business name, logo, brand colour, badges
- **Decision layer** — price (when known), match reasons, availability, branch/distance, actions

**Badges are metadata, never a score** (project lock). Three known tokens map to i18n keys —
`official channel`, `complete card`, `pickup` — plus the business's own offer label, which
passes through as data. An unrecognised token is dropped (slice lock).

**No star ratings. No buy-box. The internal score is never rendered.**

## States (P8.4/P9.3)
- **Loading** — skeleton result cards while the query runs (AI structuring makes this
  non-instant)
- **Empty** — no results. The fallback-request path **no longer exists** (the feature was
  removed on product grounds 2026-07-28, see Changelog). The honest endings available today:
  surface the response's own `suggestions[]` and `ambiguity` when present, offer to clear
  filters or widen the radius, and offer the other mode. **Never render a CTA that has no
  destination** (project lock).
- **Error** — search failed → Toast + retry
- **Distance** — shown only when the backend returns a real value; null renders nothing, never
  "0 km"
- **Availability UNKNOWN** — render the server's `availabilityWarning` verbatim. Never present
  unknown availability as available.
