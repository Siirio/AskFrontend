# Catalog — Product Card & Products Management

**Customer half SHIPPED 2026-08-06** (roadmap Phase 1 #3) — `src/catalog/`, the Product Card
modal opened from `@/search`'s Catalog Page. The seller half (Products tab, Excel import,
roadmap #7) is NOT built yet — see § *Anatomy* below.

Mirrors backend modules: **`offer/item`** + **`importing`** (docs at `../Ask_Backend/AI_Knowledge/features/item/`; the import module has no knowledge folder — read the Java in `kz/ask/importing/`).

> **Corrected 2026-08-02 (AUDIT_2 N2).** This line used to cite
> `../Ask_Backend/AI_Knowledge/features/catalog/` and `.../import/`. **Neither directory exists** —
> the backend's folders are `business, identity, item, messaging, offers, platform, request,
> search, service` plus `_archived/{import,shipping}`. Since CLAUDE.md tells every agent to read
> the backend's `features/{module}/contracts.md` before consuming an endpoint, that sent whoever
> builds this slice down a dead path on the very next slice to be built. `contracts.md` in this
> folder already named `offer/item` correctly; only this line was wrong.

> **This slice does NOT own `/app/catalog`.** That page — the result list, sorting and
> filters — is `search`'s ("Search & Catalog list"). This slice owns the Product Card **modal**
> rendered over it, and the seller's Products tab. Slices mirror backend module names, not URLs
> (Structure Lock), which is why `offer/item` became `catalog/` and the catalog PAGE lives
> elsewhere. See the matching note in `features/search/README.md`.

Owns everything about a product: the customer-facing **Product Card** (UF 2.1 step 3) and the seller-facing **Products** tab of the business cabinet (UF 3.1 item 2 — list, add, import).

## Key decisions
- **The Product Card has ONE presentation — modal only, permanently (D33, 2026-08-06, supersedes D10).** D10 originally planned a second, full-page presentation at `/app/product/:id` for direct visits and SEO via Next.js intercepting routes. That half is reversed: it was never buildable (no public single-item read on the backend, cross-repo table; D23 gates the whole `/app/*` tree from crawlers regardless) and `PRODUCT_VISION.md` UF 2.1 step 3 only ever describes a modal. `/app/product/:id` stays live as a permanent informational stub pointing back at the catalog — not a "coming soon" placeholder.
- **"Proceed to Purchase" — SHIPPED 2026-08-06 (G3, closed 2026-08-04; PRODUCT_VISION UF 2.1 append).** `purchaseDestinations` (the backend calls the field that, not `deepLink` — G3's original `deepLink`-on-`Item`-only shape was superseded by an `@ElementCollection` on BOTH `Item` and `Service`, delivered in `c56f75c`) decides the shape: one → a plain external link; two or more → a chooser modal, because a brand selling in several places must not have that collapsed into one channel ASK picked. Verification links (`kaspiUrl`/`ozonUrl`/`wildberriesUrl`, which live on `BusinessVerification`) are never reused as customer deeplinks — a destination is its own field. **The deeplink belongs to the ITEM/SERVICE, never to a branch** (owner, 2026-08-02).
- **The chat button and the zero-destination "chat with an editable draft" fallback are DEFERRED to slice #4 (`chats`), not built in this pass.** `@/chats` has no `index.ts` yet, so nothing can legally import it (R2); a reachable control that goes nowhere is forbidden (project lock). When `purchaseDestinations` is empty, the button is simply **omitted** — see `locks.md`.
- **The seller Products tab lives HERE, not in `business-cabinet`.** The cabinet composes it; the slice that owns the data owns the feature (architecture §3, D8). NOT built yet (roadmap #7, after `business-cabinet` #6).
- Excel/AI import (upload → map columns → preview → approve) is a catalog concern — it produces Products. NOT built yet (roadmap #7).
- One concrete sellable variation = one product. There are no variant tables — grouping happens via tags backend-side.
- Server-rendered for public surfaces (D7) in general; **this slice's one shipped surface (the modal) is a client component** — it is interactive by nature (Dialog, image gallery selection, the purchase chooser) and is always mounted from `search`'s already-client `ResultStream` (D32), so there is no server-rendering to preserve here. The cabinet Products tab (#7) will be client too.

## Anatomy (this pass, 2026-08-06)

No `api.ts`, `hooks.ts` or `store.ts` yet — the Product Card modal renders purely from the
`SearchCardResponse` data `search` already fetched (no new request), and the only client state
(which image is active, whether the chooser is open) is local `useState`, small enough that a
store would be over-engineering (P7.1). These three files arrive with the seller Products/import
work (#7). See `model.ts`'s own header comment for why its types DUPLICATE the relevant fields of
`search/model.ts`'s `SearchCardResponse` instead of importing them — `search` already has to
import `ProductCardModal` from `@/catalog`, and importing back would close an R5 cycle.
