# Search — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/search/contracts.md`

**Reconciled 2026-07-18** to the backend's reworked contract. The endpoint is
`POST /api/v1/search` (the earlier `/api/v1/search/unified` + `UnifiedSearchRequest`
shape this doc used no longer exists on the backend — do not build against it).

**Wire format (D20):** the JSON is **snake_case** on the wire (`raw_query`,
`page_size`, `has_next`, …); field names below are camelCase (what slice code sees
after `shared/api` transforms keys at the transport boundary).

## Public search
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/search | No | Home search form → Catalog Page results |

Anonymous. It **creates nothing** — no requests, chats, recipients, notifications, or
supplier outreach. `rawQuery` is required and returned unchanged.

### SearchRequest
- `rawQuery` (string, **required**) — the complete visible customer query, any language/slang/typos. Sent unmodified.
- `scope` (string?) — `product` | `service` | `all`
- `selectedCategory` (string?), `city` (string?), `language` (string?) — optional search inputs
- `userLocation` ({ lat, lng }?) — enables `distance` sort + `distanceMeters` on cards
- `sort` (string?) — `intent_match` (default) · `distance` · `price_asc`. **No `price_desc`** (removed); `distance` is new.
- `page` (int, 0–20, default 0) — zero-based
- `pageSize` (int, 1–50)
- `filters` ({ scope, category, city, minPrice, maxPrice }?) — interpreted constraints
- `overrides` ({ scope, category, city, minPrice, maxPrice }?) — explicit user constraints. **Overrides win** over anything the AI/deterministic layer interpreted.

### SearchResponse
- `rawQuery`, `scope`, `understoodQuery` — request context preserved (`understoodQuery` is the human explanation of how the query was read; render it as intent feedback, not a control).
- `interpretedConstraints` — each effective constraint **with its source** (so the UI can show "we filtered by X"; a user can override it).
- `sections` (SearchSection[]) — `EXACT` matches are kept **separate** from `ALTERNATIVE` results.
- `page`, `pageSize`, `total`, `hasNext` — bounded pagination (drive the pager off these, never count client-side).
- `diagnostics` — engine, fallback reason, candidate count, server latency. **NEVER rendered** (operations only).

### SearchSection
- `type` — `EXACT` | `ALTERNATIVE`
- `title` (string) — section heading
- `cards` (SearchCard[])
- `relaxedConstraints` + `reason` — present on `ALTERNATIVE` sections only: which constraints were loosened and a human-readable why ("no exact match under 5000 ₸, showing nearby options").

### SearchCard
- brand presentation (business name, brand colour, logo), `price` (**only when known**), availability state
- `availabilityWarning` (string?) — an **honest** caveat; availability is **never invented** (backend lock, P9.4)
- `matchReasons` (string[]) — human-readable "why this matched"; safe to render
- branch/distance context (`branchName`, `distanceMeters`), `badges` (string[])
- `contactActions` — **opaque** contact-action handles (contactActionId pattern; never a raw phone/username — backend privacy lock)

## Filter reference data
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/cities | No | Location filter (search by city) |
| GET | /api/v1/categories | No | Category context |

## Retrieval behaviour (backend-owned — context, not a client control)
- **Meilisearch** is the primary retrieval engine (typo tolerance, Russian stemming, synonyms). **PostgreSQL** hydrates canonical data and is the indexed fallback. A Meilisearch failure shows in `diagnostics` but does not fail search while PG is up.
- **DeepSeek interpretation is optional** — deterministic interpretation always runs, explicit request values win, and any provider error/timeout/malformed response falls back to deterministic. The client never depends on AI having run.
- **AI enrichment** runs only via `POST /api/v1/platform/ai-enrichment` (platform-gated, `USE_AI_CATALOG_TOOLS`); catalog docs are not auto-enriched. No V1 customer surface.

## Gaps / discipline (P9.4 — never fake client-side)
- Default sort is `intent_match` and stays that way (project lock — ASK is an intent layer, not a marketplace). Offer `distance`/`price_asc` only as explicit user choices.
- Never sort or filter a rendered page client-side to fake a server capability — pass `filters`/`overrides`/`sort` and re-query.
- `diagnostics` and any internal score are never shown to the customer.
- The vision's richer filters (companies, radius/map area) are not all request params yet — confirm with the backend before building a control.
