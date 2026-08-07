# Catalog — Screens & Flow

Traces PRODUCT_VISION **UF 2.1** steps 3–4 (customer) and **UF 3.1** item 2 (seller).

**Customer half SHIPPED 2026-08-06** (roadmap #3) — `src/catalog/ui/{ProductCardModal,PurchaseAction}.tsx`.
The seller flow below (Products tab, import wizard) is NOT built yet (roadmap #7).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Product Card — modal (the ONLY presentation, D33) | over /app/catalog | client island |
| Products tab (seller) | inside /app/business | client |
| Import wizard (seller) | inside /app/business | client |

## Customer flow (UF 2.1) — SHIPPED 2026-08-06
1. A result on the Catalog Page is clicked/tapped (the whole `ResultCard`, `@/search`, is the
   target — role `button`, keyboard-operable) → the **Product Card opens as a modal**, rendered
   from the SAME `SearchCardResponse` the Catalog Page already fetched. No new request.
2. The card shows the up-to-3 image gallery (the row only ever shows `images[0]`), the business's
   own contact info when published, and full decision content (no line-clamp on `summary`, unlike
   the row).
3. **"Proceed to Purchase"** (G3, resolved 2026-08-02, delivered on the wire 2026-08-04):
   - `purchaseDestinations.length === 1` → the button is a plain external link to that
     destination.
   - `purchaseDestinations.length >= 2` → the button opens a **chooser modal** listing each
     destination by its `label`. Deliberate: a brand selling in several places must not have
     that collapsed into one channel we picked for them.
   - `purchaseDestinations.length === 0` → **the button is OMITTED**, not disabled. The vision's
     "chat with an editable draft" fallback for this case is **deferred to slice #4**
     (`@/chats` has no `index.ts` yet, R2) — a reachable control that goes nowhere is forbidden
     (project lock). **No standalone chat button exists in this pass either**, for the same
     reason — the vision's UF 2.1 step 4 chat button ships when `chats` does.
   - **Deeplinks belong to the ITEM/SERVICE, never to a branch** (owner, 2026-08-02). Several
     destinations = several places to buy the SAME item, not one link per shop.
   - **Never** built from `kaspiUrl`/`ozonUrl`/`wildberriesUrl`: those live on
     `BusinessVerification` as proof the business is real, and are not customer deeplinks.
4. There is no full-page presentation (D33, supersedes D10). A direct visit to `/app/product/:id`
   renders a permanent informational stub instead — see below.

## Seller flow (UF 3.1 item 2)
1. **Products** tab: the list of products, with **Add** and **Import**.
2. Add: product fields + price + **branch selection** (a product can live in several branches — the vision explicitly asks for a friendlier branch picker here).
3. Import: upload .xlsx → map columns → preview (rows flagged valid/warning/invalid) → approve or cancel.

## States (P8.4/P9.3)

**Product Card modal (shipped):**
- Loading: N/A — the modal renders from data already in memory (no fetch of its own); the
  Catalog Page's own loading state covers the only request involved.
- Empty sub-states, all first-class (no placeholder box/icon): no images → gallery section
  omitted; no `purchaseDestinations` → the button omitted; no `businessProfile` → the "about"
  section omitted; null price/branch/distance → that field omitted, same rule `ResultCard` uses.
- Error: N/A — nothing in the modal fetches independently.
- Validation: N/A — no form in this pass.

**Seller flow (not built, roadmap #7):**
- Loading: card skeleton; import preview parsing
- Empty: seller with no products → an empty state that points at Add and Import, not a blank table
- Error: import row errors are shown per-row (INVALID/WARNING), never as one opaque failure
- Price: show the strike-through original only when `effectivePrice` differs from `originalPrice`

## Cross-slice
- **Consumed by `@/search`** — `ResultStream` imports `ProductCardModal` from this slice's
  `index.ts` and renders it when a card is selected. This is the ONLY cross-slice edge; catalog
  never imports back from `@/search` (R5 — see `model.ts`'s header).
- The chat button (UF 2.1 step 4) will embed `@/chats` when that slice ships (#4) — not built yet.
- The Catalog Page that hosts the modal belongs to `@/search`.

## Route placeholder — PERMANENT (corrected 2026-08-06, D33)

`/app/product/:id` is LIVE and reachable today (a bookmark, a shared link, a typed URL),
so it states plainly that there is no direct product page, rather than looking
unfinished: the shared `EmptyState` primitive via `app/_components/SectionNotOpen.tsx`,
with copy in ru/kk/en, linking back to `/app/catalog`.

**This is no longer a "not open yet" placeholder — it never opens, by design (D33).**
Before 2026-08-06 this section framed the gap as deferred pending a public item-read
endpoint, implying the URL would eventually work. It will not: the Product Card has
exactly one presentation, the modal, permanently. It still uses the shared `app.notOpen.product.*`
i18n keys (title/description were reworded the same day to drop the "yet" implication rather
than forked into a new namespace — P6.2), plus one addition, `app.notOpen.product.backToCatalog`,
rendered as a real action button (`SectionNotOpen` gained an optional `action` slot for this,
forwarding to `EmptyState`'s existing one) linking to `/app/catalog` — the other "not open yet"
stubs have nowhere better to send the visitor, this one does. The raw route id is not echoed —
printing it told the visitor nothing and read as debug output.

Verified in a browser, light and dark, against a production build.
