# Frontend → Backend, 2026-08-02

Everything below was read from Java source at `dev` `b02105a`, not from docs. Anything already
shipped has been removed from this list rather than re-sent.

**Two things you shipped that we've already consumed:** the purchase-destination contract
(`098fd44`) is exactly what we asked for and is now written into our vision too, and CORS for
`ask.com.kz` / `stage.ask.com.kz` / the Vercel host is done — thank you, that row is closed.

---

## 1. BLOCKING — infinite scroll dies at ~200 results

**`StructuredSearchProcessor:53` — `MAX_CANDIDATES = 200`, plus `SearchRequest.page` is `@Max(20)`.**

```java
int candidateLimit = Math.min(MAX_CANDIDATES, Math.max((page + 1) * pageSize * 3, pageSize * 3));
```

Our owner ruled (2026-08-02) that the catalog uses **infinite scroll — "scroll until the goods or
services run out."** Today they run out at ~200 because of the ranking window, not because the
catalogue ended. At the default `pageSize` of 20 the scroll dies around page 10.

**Ask:** a deep-paging strategy, not just a larger constant. A bigger `MAX_CANDIDATES` moves the
wall; it doesn't remove it.

## 2. BLOCKING — three search parameters we cannot fake

`POST /api/v1/search` needs, on `SearchRequest` / `SearchFilterRequest`:

- a **Unique-Offers sort** value (the `sort` regex is still `relevance|distance|price_asc|lowest_price`)
- a **Companies filter**
- a **map-area (bounding box)** filter

These are in our PRODUCT_VISION §4. Radius arrived as `radiusMeters` — thank you, that one is
built and working.

**Why this is now hard and not a preference:** the same owner decision says all filtering and
sorting is **server-side across the whole catalogue, always**. A client-side refinement layer is
explicitly forbidden, so there is no fallback available to us.

## 3. BLOCKING — your own lock contradicts your own code

`AI_Knowledge/features/search/locks.md`:

> LOCKED | Results Filter & Sort V1 only reorders or removes cards from the currently loaded page

This contradicts our owner's ruling above. It also **contradicts your own implementation** —
`SearchFilterRequest` already does server-side `category`, `city`, `country`, `minPrice`,
`maxPrice`, `openNow`, `radiusMeters`, with a cross-field assert. Please retire or reword it.

## 4. BLOCKING G3 — purchase destinations aren't on the wire yet

The contract is agreed (`098fd44` — and your `item/contracts.md` states the ordering itself).
What's left is the code, three parts:

1. **`Item.deepLink` is still a single `@Size(max=2048) String`** → needs to be an ordered list of
   `{ label, url }`.
2. **`Service` has no such field at all** — 0 hits in `offer/service`.
3. **`SearchCardResponse` doesn't carry them**, so the Product Card can't see them.

**(3) is the hard blocker** — your own contracts.md says *"Public search must expose the Item
purchase destinations before the customer-facing Proceed to Purchase action is rendered."*
Agreed. We are holding the button until then.

Scope confirmed on our side: per item/service, **never per branch**, no branch FK. Verification
links (`kaspiUrl`/`ozonUrl`/`wildberriesUrl` from `SellerOnboardingProcessor:64`) are never
reused — matching the lock you added.

## 5. BLOCKING — a branch's `cityId` is unreachable from the address picker

`CreateBranchRequest.cityId` is optional, so we currently send nothing, which means
`branch_city` is null and **every branch registered through our UI is invisible to the city
filter.**

We tried to bridge it with `GET /api/v1/cities/resolve?name=`. **It cannot work, and we measured
it rather than guessing:**

| | |
|---|---|
| `city` table (`V2__reference_data.sql`) | 23 rows, bare Russian names — `Алматы`, `Кокшетау`, `Караганда` |
| Our address picker (KATO, the state registry) | always type-marked — `г. Алматы` / `Алматы қ.` |
| KATO names scanned (regions + districts + localities, both languages) | **11 954** |
| Exact matches to any seeded city | **0** |

So `resolve?name=` would 404 on every call, for every seller.

**We won't normalise the string client-side.** KATO contains **`с. Караганда`** (a village)
alongside **`г. Караганда`** (the city), so stripping the prefix silently files a rural branch
under the city — worse than the honest null, because it's invisible.

**Ask — any one of these works for us:**
- resolve by **KATO code** (our picker already carries `code`, the real classifier key), or
- seed KATO codes onto the `city` table, or
- accept a city **name** on `CreateBranchRequest` and match server-side against your own table.

## 6. BLOCKING the consent gate — `legal` is write-only

`kz/ask/legal/api/LegalController` has `POST /acceptances` and `POST /registration-acceptances`
and **no `@GetMapping` anywhere in `kz/ask/legal/`**. `AuthSessionResponse` carries no consent
field either. The data exists (`LegalAcceptance`, `LegalAcceptanceRepository`) — it's just never
exposed, so we cannot tell **who** to gate.

Our owner's design: a user with no acceptance on record gets a blocking modal until they accept.
That's what makes our best-effort consent write safe — a write lost to a network error self-heals
on the next load.

**Ask — we'd prefer a session field** (`pendingLegalDocuments` or similar) on
`AuthSessionResponse` over a standalone `GET`. The gate covers every `/app/*` route and the
session is already re-read on every restore, so a separate endpoint adds a round-trip to every
page load.

**Paired with it:** `GET /api/v1/legal/documents` is in your `SecurityConfig` allowlist
(line 104) but **has no controller**. Knowing who accepted is half an answer without knowing
which documents/versions are active — we currently hardcode `USER_TERMS` + `PRIVACY_POLICY`
because those are the only two our form visibly links to.

---

## Non-blocking, but worth a look

**7. Two dead allowlist entries.** `SecurityConfig` permits `/api/v1/businesses/*/storefront`
(line 102) and `/api/v1/legal/documents` (line 104). Neither has a controller.

**8. `openingSummary` is declared and never populated.** `SearchCardResponse.openingSummary`
has no `.openingSummary(...)` call in `toCard()` — always null. (`BranchResponse` populates it
correctly.) We've deliberately not modelled it, so we're not blocked; **either populate it or
drop the field**, since as-is it invites someone to build an open/closed indicator on a value
that can never arrive.

**9. Badges are hardcoded English.** `resolveBadges()` emits the literals `"official channel"`,
`"complete card"`, `"pickup"`. We map those three to our own ru/kk/en keys and **drop anything
unrecognised**, so nothing ships in English today — but that means **the day you add a fourth
badge, it silently disappears from our UI.** Stable tokens (or an enum) would make the mapping
safe in both directions. Low priority, just don't let it surprise us.

**10. No public item/service read.** The allowlist permits `/search`, `/cities`,
`/cities/resolve`, `/categories`, `/businesses/*/business-profile`, `/business-media/files/*`,
`/businesses/*/storefront`, `/businesses/*/drops`, `/legal/documents`.
`/api/v1/businesses/{id}/items` is authenticated **and** business-scoped, so it can't serve a
detail read. Our Product Card ships fine as a modal from the search payload — only the
shareable `/app/product/{id}` deep link is blocked. Not urgent; noted so it's on record.

**11. `localhost:2020` is down** (connection refused at `/actuator/health`, 2026-08-02). Not a
request — just flagging that we can't verify anything against it right now, and we don't know
which branch it last served.

---

## Documentation drift — this one costs us real time

Our CLAUDE.md instructs every agent to read
`../Ask_Backend/AI_Knowledge/features/{module}/contracts.md` **before** consuming an endpoint.
Your Java source is reliable; these prose files currently aren't, so that instruction sends
people down dead paths.

- **`features/request/` was never archived.** `kz/ask/request` was deleted 2026-07-21; five
  live-looking files remain outside `_archived/`. Your own `features/README.md` § *Remove a
  feature* prescribes the move, and `_archived/{import,shipping}` shows the mechanism is in use.
- **A lock names contracts that no longer exist.** `AI_Knowledge/Locks.md:8`: *"Default search
  sort is intent_match, never price_asc … StructuredSearchProcessor, **SearchV2Response**"*.
  Neither `intent_match` nor `SearchV2Response` appears anywhere in `src/main/java` — they're
  pre-refactor `master` names. **The intent is still right**; the lock is just unfalsifiable as
  written. (The Meilisearch lock beside it is accurate.)
- **`legal` has live endpoints and no knowledge folder** — the one module with zero
  documentation, and the one we now depend on for a legal artefact.
- **`features/README.md` § *Tracked features* is an instruction, not an index** ("Run a codebase
  scan to discover existing features"). Folder names also diverge from the packages they mirror
  (`item` vs `offer/item`, `messaging` vs `chat`, `offers` vs `business/uniqueoffer`), and seven
  real modules have no folder at all: `catalog`, `importing`, `legal`, `managedimport`,
  `moderation`, `audit`, `ai`.

**Two concrete examples of what this cost us this week** — both found by diffing your controllers
against our own notes, both in docs for slices we hadn't built yet:

- our services contracts listed four `/api/v1/business-admin/branches/{branchId}/services`
  endpoints; the real controller is business-scoped `/api/v1/businesses/{businessId}/services`
- our Unique Offers table listed `/api/v1/business-admin/offers`; the real routes are `drops`

`business-admin` exists in exactly one place in your whole codebase (`/business-admin/chats`).
We've fixed both on our side.

---

## One question, not a request

`b02105a` rewrote your `features/search/README.md` § *Result presentation* to say:

> Match reasons remain response metadata but are not displayed.

**We're continuing to display them.** "Why this matched" is the core affordance in our
PRODUCT_VISION — it's the thing that distinguishes ASK from a marketplace's ranking, and our
owner confirmed it stays (2026-08-02).

Is that line describing **your** admin/internal UI, or is it meant as a product-wide change? If
the latter, it needs to go to the product owner rather than land in a README, because our two
documents now contradict each other and the next person to read yours first will hit it.

Same question, lower stakes, for the hover-preview panel and mobile detail modal described in
that section — we haven't adopted those either. **We did adopt the primary catalog image**, and
`SearchCardResponse.images` is modelled and stubbed on our side. Thanks for shipping it, and for
confirming the 3-image cap.
