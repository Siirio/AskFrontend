# Search & Catalog List

**Shipped 2026-07-28** (roadmap Phase 1 #2) — `src/search/`, routed at `/app` (Home) and
`/app/catalog` (Catalog Page). See `ux-ui-flow.md` for the implementation notes.

Mirrors backend module: **search** (`../Ask_Backend/AI_Knowledge/features/search/`).

Owns the two entry surfaces of the product: **Home** (the search form — the platform's front door) and the **Catalog Page** (result list with sorting and filters). This is where the mission lives: save time choosing the best product.

## Key decisions
- **Home belongs here, not to a "main page" slice.** A page belongs to the domain that does its main job — Home's job is search (architecture §0).
- The Catalog Page owns **sorting and filters** (PRODUCT_VISION §4): relevance, distance, cost, unique offers; price, companies, location.
- **Default sort is relevance — never price ascending.** This is a lock; the UI must not offer or default to price-first ranking. (The wire value was renamed `intent_match` → `relevance` on 2026-07-27; the decision is unchanged.)
- **Every search carries one mode — goods or services — and the customer picks it** (2026-07-28). The backend's `mode` is `@NotNull` with no "all" option, so the choice is given to the customer rather than hidden in a default. This REVERSES the old "one unified endpoint, no scope toggle" decision, whose premise the backend removed; see `locks.md` retired section.
- The internal score is never rendered as a customer-facing trust signal. Visible signals are badges only — and badges map to client i18n keys, because the backend emits them in hardcoded English.
- Server-rendered (D7) with interactive client islands (search form, filter/sort controls) — **but behind the auth gate since D23**, so neither surface is publicly crawlable and neither carries SEO work.
- The Product Card opens as a modal over this page — the card itself is owned by `@/catalog` and imported via its `index.ts` (R2, D10). It renders from the search card payload; there is no public item endpoint (see that slice's contracts).
- **The empty state has no request path.** The fallback-request feature was removed on product grounds 2026-07-28. A dead-end search ends in suggestions, a widened filter, or the other mode — never a CTA pointing at something that does not exist.

## Live blockers (gate G1)
Three of the vision's §4 controls have no backend param and are NOT built: the **Unique-Offers
sort**, the **Companies filter**, and the **map-area** filter. The 100 km radius was delivered
2026-07-27 as `radiusMeters` and IS buildable. Never fake a parked control by re-sorting a
loaded page (lock).
