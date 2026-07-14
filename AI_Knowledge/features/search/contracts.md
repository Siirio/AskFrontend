# Search — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/search/contracts.md`

## Unified Search
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/search/unified | No | Home search form → Catalog Page results |

### UnifiedSearchRequest
- query (string, required) — the raw user query, any language, slang, typos. Sent unmodified.
- cityId (UUID, optional) — city filter
- limit (1–100, default 20)

### UnifiedSearchResponse
- results: UnifiedSearchResultItem[]
- aiStructuredQuery: internal/debug only — NEVER rendered
- totalFound: int

### UnifiedSearchResultItem
type, id, name, description, effectivePrice, originalPrice, imageUrl, categoryName, businessName, branchIds, activeOfferId, offerLabel, score

- `score` is internal — never shown to the customer.
- `offerLabel`: "-30%" / "-5000 ₸" for discounts, otherwise the offer name (unique-offer signal).
- `effectivePrice` vs `originalPrice`: render the strike-through only when they differ.

## Filter reference data
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/cities | No | Location filter (search by city) |
| GET | /api/v1/categories | No | Category context |

## Gaps to raise (P9.4 — never fake client-side)
The vision's sort options (distance, cost, unique offers) and filters (price, companies, location radius / map area) are not all parameters of `UnifiedSearchRequest` today. Confirm with the backend before building a control — never sort or filter a page of results client-side to fake a server capability.
