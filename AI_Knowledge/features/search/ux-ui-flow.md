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

**Home redesigned same day (owner review).** Three changes, all `src/search/ui/{HomePage,SearchForm}.tsx` + `design-system/neumorphism.css`:
- **Copy rewritten against §1/§2 (RASE), not "local search."** The mission is saving time
  choosing the best product across the multitude of marketplaces — not proximity. Headline/
  subtitle no longer say "near you"; they name reliability, accuracy, and the anti-marketplace-
  multitude framing directly (`search.home.headline`/`subtitle`, all three locales).
- **The goods/services toggle is now a card pair, not an inline tab pair** — `ModeCard`,
  duplicated from `auth/ui/RoleSelectionModal`'s `RoleCard` shape per D8 (same LOOK — icon,
  label, hint, pressed-in selection — different owner/data). Each card carries its own
  `home.modeHint.{ITEM,SERVICE}` i18n key.
- **The search bar is its own elevated stage** (`.neu-search-bar` on a `.neu-card`), not a bare
  input — a leading search icon inside the field, a full `size="lg"` accent button with a label
  (not icon-only), and a stronger focus-within glow (new CSS, `neumorphism.css`). It LEADS the
  form, with the mode cards below it (reordered same day, second review pass) — the query is
  what the customer is actually here to type; the mode choice follows.
- **The hero is vertically centred** (`min-h-svh` + `justify-center` on the content column, same
  convention `auth/ui/AuthShell` already uses) rather than pinned near the top with dead space
  below it (second review pass, same day).
- **Two blurred decorative orbs** (`.neu-hero-decor`) sit behind the hero, extending UP behind
  the sticky nav bar on purpose: `.neu-topbar`/`.neu-nav-link` already carry
  `backdrop-filter: blur(...)`, but a blur over one flat page colour is indistinguishable from no
  blur at all — the orb gives the glass something to actually show. A subtle GSAP entrance
  (fade + rise, `shared/motion.ts`) plays on mount, reduced-motion handled centrally as always.
- **Nav glass strengthened** (third review pass, same day) — `.neu-topbar`/`.neu-bottom-nav` went
  from 85% to 60% surface opacity and gained `saturate(160%)` alongside their blur; `.neu-nav-link`
  followed (45%→38%, saturate 140%→160%). A blur over one flat page colour reads as no blur at
  all, which is why the hero's decorative glow (above) bleeds up behind the sticky nav on
  purpose — the glass needs something underneath it to actually show.
- **Empty-query defense, two layers (owner request, same day).** `rawQuery` is `@NotBlank` on the
  backend (contracts.md); an empty search must never reach it. (1) `SearchForm` refuses to
  submit a blank/whitespace query — no navigation, an inline validation message
  (`search.errors.queryRequired`) instead (P8.4/P9.3). (2) The Catalog Page's OWN route file
  guards independently: a blank/missing `query` param (a typed, bookmarked, or hand-edited URL)
  never reaches `search()` at all — it renders a validation `EmptyState` (`search.validation.*`)
  with a link back to Home, never a wasted round trip to a request known to fail (P9.4).
- **Decoration extended, then corrected, across two more review passes (owner: "make it
  beautiful, don't hurt the UX," then "I don't like the glowing blob in center bottom").**
  Weighed against a UmitPath-style treatment (scattered arrow/plus icons, dot-grid panels,
  floating card mockups) and deliberately NOT adopted at any point — that reads as a
  marketing-landing pitch, competes with the search bar for attention, and puts orange on purely
  decorative elements, conflicting with the "saturation is action" lock. First attempt added a
  third glow at the FOOT of the hero (a centred blob) plus one corner dot-grid texture; the blob
  read as a generic template move on review and was REMOVED. **Final composition:** colour (the
  warm glow, `.neu-hero-decor`) stays at the TOP only, where it does real work revealing the
  nav's glass — the bottom is bookended by two ASYMMETRIC dot-grid corners instead
  (`.neu-hero-dots` bottom-right, larger/denser; `.neu-hero-dots-secondary` bottom-left,
  smaller/sparser — deliberately uneven, an exact mirror reads as a template). All decoration
  stays `aria-hidden`/`pointer-events: none`. The one surviving engineering note from the removed
  blob: any full-bleed decorative circle wider than a phone viewport needs its OWN
  `overflow: hidden` clipping wrapper, or it pushes the page's scrollable width past the
  viewport — verified with `document.documentElement.scrollWidth` against `clientWidth` at
  390px and 1280px on every pass.
- **Two follow-up fixes, same-day review.** (1) Both dot corners were built from `--border`,
  which is deliberately a near-invisible groove-fill token (`.neu-rule`'s job) — corrected to
  `--foreground-subtle` (the measured, AA-checked "quiet but legible" token), with larger dots
  and a wider fade, so both corners actually read instead of one being invisible and the other
  barely there. Still neutral ink, never orange. (2) The right corner was shrunk slightly
  (300px→260px), and — the more load-bearing fix — **both corners now shrink hard under
  `@media (max-width: 639px)`** (the same breakpoint the bottom-nav padding rule already uses):
  at the desktop footprint the two circles read as distinct corner accents, but at a ~390px
  phone width they were close enough to merge into one continuous dotted band spanning the
  whole screen, busier than the mode cards sitting above them (owner report: "messing up
  UX/UI" on mobile). Below 640px they drop to 130px/100px so real empty space returns between
  them.
- Catalog Page/result cards are unchanged — explicitly out of scope until that surface gets its
  own full design pass (owner decision: catalog's cards/islands are designed once, later, not
  iterated now).

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

## Infinite scroll — the Catalog Page's result list (2026-08-04)

Pagination is gone; the list extends as the customer scrolls (PRODUCT_VISION §4, owner
2026-08-02). Buildable only since backend `c56f75c` removed `MAX_CANDIDATES = 200` and the
`page @Max(20)` ceiling — before that the list died at ~200 results whatever matched.

**Page 0 is still the server's.** The route file fetches it (D7) and passes it into
`ResultStream`, a client island. A visitor who never scrolls still makes exactly one request,
and first paint is unchanged.

**Pages 1..n** are fetched by `useCatalogPagination` with the SAME params, so an appended page
is always the same query the customer is already looking at. `hasNext` comes from the server —
never inferred by counting what we hold.

**Changing any filter or sort resets the list**, and that is enforced by the remount key rather
than by a `reset()` call: `CatalogPage` keys the island on the URL params, so a new query mounts
a new store. There is nothing for a future control to forget.

**States.** Loading appends a spinner + "loading more" beneath the list. The end of the list
says so — but only once there is more than one page, since on a single short page it is noise
about something already visible. A failed APPEND keeps the results on screen and offers a retry;
that is deliberately different from page 0 failing, which is the route's full error state (P9.3).
While the retry is showing, the sentinel is inert — otherwise it would immediately re-fire the
request that just failed.

**The scroll path is e2e-covered** by the `roses-paged` scenario, the only mock that sets
`has_next: true`. It returns **8 cards per page**, and that number is load-bearing: with one card
the page is shorter than the viewport, the sentinel starts inside the observer's `rootMargin`,
and every page auto-loads with no scrolling — a scroll test written against that passes while
asserting nothing about scrolling. Measured before the fix: page 1 arrived unscrolled.

## Where to search — ONE control, three modes (2026-08-04)

`SearchFilterRequest.isLocationFilterValid` (backend `c56f75c`) permits **at most one** of
`city`, `radiusMeters` and `mapArea`. Two at once is a 400.

The filter panel therefore asks *where* once, as a **radio group** — Anywhere · In a city ·
Within 100 km — and the selected mode reveals its own detail beneath it. Modelling it this way
means the UI cannot express the invalid state, so there is no validation rule to enforce and
none to forget. Before this, the city field and the radius checkbox were independent controls
and ticking both was reachable; that combination now fails on the wire, which is why this was a
REWORK of shipped controls rather than an addition beside them.

`toSearchRequest` enforces the same rule again, because the URL is reachable directly with a
bookmarked or hand-edited link — the same reasoning as the route file's blank-`rawQuery` guard.
Radius wins when both appear: it is the more specific answer and the one that required an
explicit permission grant. **A UI that cannot express an invalid state does not make that state
unreachable.**

The map-area mode is deliberately absent from the union until a map surface exists — a radio
that selects nothing would be a dead control (project lock).

## Distance sorting asks for a location fix

`isDistanceLocationValid` (same commit) makes `sort=distance` without `userLocation` a 400. The
first attempt at handling that downgraded distance to relevance inside `toSearchRequest`, which
produced a **live-looking control that did nothing**: the tab rendered selected while the results
came back in a different order. An existing e2e test caught it, not review.

`SortControl` now behaves like the radius filter, which had already solved this: clicking
Distance REQUESTS the fix (never auto-prompted on load), the sort applies once granted, and a
denial says so rather than pretending. The two controls share one grammar because they share one
requirement. The fallback in `toSearchRequest` survives only as a last-resort guard for a URL the
UI cannot police.

## The Companies filter (2026-08-04) — gate G1's last parked control

A checkbox list in the filter panel, one row per company, with its result count
right-aligned in tabular numerals.

**Every option and count comes from `SearchResponse.companyFacets`**, computed
server-side over the whole query. Deriving them from the loaded cards — the obvious
shortcut — would show only companies whose results happen to be on screen, and the
list would grow as you scroll. Both our server-capability lock and the backend's own
lock forbid exactly that.

The backend computes facets with every active filter **except `businessIds`**, which
is what makes a multi-select possible: with the selection applied, the list would
collapse to what is already chosen and a second company could never be added.

**The count is metadata, never a ranking.** It states how many results a company has
for this query — a fact about the query, not a judgement about the business. No bar,
no share-of-total, nothing that reads as "bigger is better" (the same rule that makes
badges metadata rather than a score).

The control **hides below two companies**: a filter that can only ever be a no-op is
noise. Selection travels as one comma-separated `businessIds` param, capped at 100 to
match `@Size(max = 100)`.

## The primary catalog image on a result card (2026-08-04)

`images[0]` only — at most three exist and the rest belong to the Product Card (#3).
The seller owns the order (`@OrderColumn(display_order)`); it is never re-sorted here.

**A card with no image is a first-class state and renders nothing in its place.** No
grey box, no placeholder icon: an empty frame would give every imageless listing a
visible "missing" marker, which reads as a judgement about the business. Most listings
have no image until the seller cabinet ships (#7/#8), so this is the COMMON case, not
the edge one — the vision append says so explicitly.

`alt` is the item title, because the image *is* the item; a separate description would
be duplicated text for a screen reader.

## The map-area filter (2026-08-05) — the fourth "where", and G1's last control

**The search area IS the viewport.** Pan and zoom to frame it; what you see is what is
searched. There is no drawn rectangle to drag, because a box separate from the viewport
puts two things on screen both claiming to be "the area" and leaves the customer
reconciling them.

Bounds are read from Leaflet's own `getBounds()` on every `moveend`, which satisfies both
backend rules by construction: all four bounds are `@NotNull` together, and
`north > south && east > west`. They travel as ONE `mapArea=north,south,east,west` param —
four separate params could go out of sync in a hand-edited URL and produce a half-box that
400s. `parseMapArea` drops anything malformed or inverted rather than sending a partial
box, so a mangled URL costs the filter, not the whole search.

**It is a fourth radio in the same "where" group**, so it is exclusive with city and radius
for free — `isLocationFilterValid` permits only one.

`MapAreaCanvas` is a **separate component from `business-cabinet`'s `BranchMapCanvas`**, not
a parameterized version of it: that one picks a POINT (a branch's `@NotNull` lat/lng), this
one reports a BOX. Same library, same tiles, different question (D8 · P6.3) — and the slice
boundary would forbid the import in any case (R2).

**One trap, recorded because it cost a debugging cycle.** The first version called
`map.whenReady(emit)` during RENDER, reasoning that bounds are meaningless before Leaflet
measures its container. That is true, and it still produced an infinite loop (React error
#185): `emit` sets parent state → parent re-renders the canvas → render calls `whenReady`
again. **A state setter must never run during render, whatever value it is waiting for.**
The `whenReady` call is still there — inside a mount effect, where the timing concern is
handled without the loop.
