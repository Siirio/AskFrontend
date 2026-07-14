# Catalog — Product Card & Products Management

Mirrors backend modules: **catalog** + **import** (`../Ask_Backend/AI_Knowledge/features/catalog/`, `.../import/`).

Owns everything about a product: the customer-facing **Product Card** (UF 2.1 step 3) and the seller-facing **Products** tab of the business cabinet (UF 3.1 item 2 — list, add, import).

## Key decisions
- **The Product Card has two presentations of one component (D10):** a modal over the Catalog Page (in-flow, per the vision) and a full server-rendered page at `/app/product/:id` for direct visits and SEO. Next.js intercepting routes are the sanctioned mechanism. Both render the same component — never two copies.
- The card carries a **"Proceed to Purchase"** button and a **chat button**; the chat modal can open straight away (UF 2.1 step 4). Chat itself is owned by `@/chats` and embedded via its `index.ts` (R2, D8 — same knowledge, live feature).
- **The seller Products tab lives HERE, not in `business-cabinet`.** The cabinet composes it; the slice that owns the data owns the feature (architecture §3, D8).
- Excel/AI import (upload → map columns → preview → approve) is a catalog concern — it produces Products.
- One concrete sellable variation = one product. There are no variant tables — grouping happens via tags backend-side.
- Server-rendered for public surfaces (D7); the cabinet Products tab is client.
