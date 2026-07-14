# Catalog — Screens & Flow

Traces PRODUCT_VISION **UF 2.1** steps 3–4 (customer) and **UF 3.1** item 2 (seller).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Product Card — modal | over /app/catalog | client island |
| Product Card — full page | /app/product/[id] | server |
| Products tab (seller) | inside /app/business | client |
| Import wizard (seller) | inside /app/business | client |

## Customer flow (UF 2.1)
1. A result on the Catalog Page is selected → the **Product Card opens as a modal** with all product information.
2. The card offers **"Proceed to Purchase"** and a **chat button**.
3. The chat modal can open straight away from the card — no intermediate page (UF 2.1 step 4).
4. A direct visit or a search-engine crawl to `/app/product/:id` renders the same card as a full server-rendered page (D10).

## Seller flow (UF 3.1 item 2)
1. **Products** tab: the list of products, with **Add** and **Import**.
2. Add: product fields + price + **branch selection** (a product can live in several branches — the vision explicitly asks for a friendlier branch picker here).
3. Import: upload .xlsx → map columns → preview (rows flagged valid/warning/invalid) → approve or cancel.

## States (P8.4/P9.3)
- Loading: card skeleton; import preview parsing
- Empty: seller with no products → an empty state that points at Add and Import, not a blank table
- Error: import row errors are shown per-row (INVALID/WARNING), never as one opaque failure
- Price: show the strike-through original only when `effectivePrice` differs from `originalPrice`

## Cross-slice
- The chat button embeds `@/chats` (same knowledge, live feature → import via its `index.ts`, D8).
- The Catalog Page that hosts the modal belongs to `@/search`.
