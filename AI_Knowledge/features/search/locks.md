# Search — Slice Locks

LOCKED | Default sort is relevance (intent_match), never price ascending | ASK is an intent layer, not a marketplace. Price-first ranking commoditizes brands | Catalog sort control, search api.ts
LOCKED | No buy-box UI — never collapse different brands into one SKU comparison row | Each brand owns its presentation. SKU comparison = marketplace behavior | Catalog result list, ProductCard
LOCKED | The internal score is never rendered as a customer-facing trust signal | Visible signals are badges (freshness, confirmation speed, card quality). No public ratings | result cards
LOCKED | The raw user query is sent unmodified — the client never pre-parses or "cleans" it | The backend AI structures the query; client-side parsing would corrupt intent | search api.ts, search form
LOCKED | No product/service scope toggle in the UI | One unified endpoint — the AI determines intent from the query | Home search form
LOCKED | Sorting and filtering are server capabilities — never re-sort or re-filter a page of results client-side | Faking a capability over 20 loaded rows lies to the user. Missing param → raise it (P9.4) | search api.ts, filter/sort controls
LOCKED | Distance renders only from a real backend-calculated value | Never derived from a city name or address text; null → render nothing | result cards
