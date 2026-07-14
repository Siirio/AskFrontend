# Search & Catalog List

Mirrors backend module: **search** (`../Ask_Backend/AI_Knowledge/features/search/`).

Owns the two entry surfaces of the product: **Home** (the search form — the platform's front door) and the **Catalog Page** (result list with sorting and filters). This is where the mission lives: save time choosing the best product.

## Key decisions
- **Home belongs here, not to a "main page" slice.** A page belongs to the domain that does its main job — Home's job is search (architecture §0).
- The Catalog Page owns **sorting and filters** (PRODUCT_VISION §4): relevance, distance, cost, unique offers; price, companies, location.
- **Default sort is relevance (intent_match) — never price ascending.** This is a backend lock; the UI must not offer or default to price-first ranking.
- One unified endpoint covers products AND services — there is no scope toggle in the UI. The backend AI decides intent from the raw query.
- The internal score is never rendered as a customer-facing trust signal. Visible signals are badges only.
- Server-rendered (D7): Home and Catalog are public surfaces with interactive client islands (search form, filter/sort controls).
- The Product Card opens as a modal over this page — the card itself is owned by `@/catalog` and imported via its `index.ts` (R2, D10).
