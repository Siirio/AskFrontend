# Services — Screens & Flow

Traces PRODUCT_VISION **UF 3.1 item 3** ("Services are the same as Goods").

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Services tab (seller) | inside /app/business | client |

## Seller flow
1. **Services** tab: the list of services, with **Add**. Layout and interactions mirror the Products tab.
2. Add/edit: name, description, category, base price, duration, schedule text, **branch selection**.
3. **No import.** The vision gives import to products only (UF 3.1 item 3 vs item 2).

## Customer side
Services appear in unified search results and in the card, alongside products — there is no separate services search surface and no product/service toggle (that is a `@/search` lock).

## States (P8.4/P9.3)
- Loading: list skeleton
- Empty: no services → an empty state pointing at Add
- Error: save failure → Toast + inline field errors
- Status: render the backend's derived ActivityDisplayStatus — never recompute it from raw response fields

## Cross-slice note
Services intentionally **duplicate** the Products tab's look rather than sharing a parameterized component: same looks, different knowledge (D8, P6.3). A shared "CatalogItemsTab" taking a `kind: 'product' | 'service'` prop is exactly the wrong abstraction and is forbidden.
