# Search — Screens & Flow

Traces PRODUCT_VISION **UF 2.1** (customer wants to find a product), steps 1–2.

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Home — navigation menu, text, search form | /app | server (+ client search form) |
| Catalog Page — product list, sorting, filters | /app/catalog | server (+ client controls) |

## Flow
1. **Home**: navigation menu, headline text, search form. The customer types a natural-language query — any language, slang, typos. It is sent raw.
2. **Catalog Page**: the result list with sorting and filters.
3. Selecting a result opens the **Product Card** as a modal over the list (owned by `@/catalog`, D10).

## Sorting (PRODUCT_VISION §4)
Relevance (default) · Distance · Cost · Unique Offers

Relevance is `intent_match` — the backend's default. **Price-ascending is never the default and never presented as the "right" way to choose.** ASK is an intent layer, not a marketplace.

## Filters (PRODUCT_VISION §4)
Price · Companies · Location (within 100 km · by city · by map area)

## Result cards
Two layers, per the backend's anti-marketplace contract:
- **Brand layer** — business name, logo, brand signals/badges
- **Decision layer** — price (effective vs original), match reasons, availability, branch/distance context, actions

Badges are the visible signal (data freshness, confirmation speed, card quality). **No star ratings. No buy-box. The internal score is never rendered.**

## States (P8.4/P9.3)
- Loading: skeleton result cards while the query runs (AI structuring makes this non-instant)
- Empty: no results → the fallback-request path (`@/requests`), not a dead end
- Error: search failed → Toast + retry
- Distance: shown only when the backend returns real coordinates — a null distance renders nothing, never "0 km"
