# Search — Slice Locks

LOCKED | Default sort is relevance (intent_match), never price ascending | ASK is an intent layer, not a marketplace. Price-first ranking commoditizes brands | Catalog sort control, search api.ts
LOCKED | No buy-box UI — never collapse different brands into one SKU comparison row | Each brand owns its presentation. SKU comparison = marketplace behavior | Catalog result list, ProductCard
LOCKED | The internal score is never rendered as a customer-facing trust signal | Visible signals are badges (freshness, confirmation speed, card quality). No public ratings | result cards
LOCKED | The raw user query is sent unmodified — the client never pre-parses or "cleans" it | The backend AI structures the query; client-side parsing would corrupt intent | search api.ts, search form
LOCKED | Sorting and filtering are server capabilities — never re-sort or re-filter a page of results client-side | Faking a capability over 20 loaded rows lies to the user. Missing param → raise it (P9.4) | search api.ts, filter/sort controls
LOCKED | Distance renders only from a real backend-calculated value | Never derived from a city name or address text; null → render nothing | result cards
LOCKED | Every search carries exactly ONE mode, and the customer chooses it | 2026-07-28. `mode` is `@NotNull` with only `ITEM`/`SERVICE` — something must choose. Choosing silently in code makes half the catalogue unreachable with no control to discover it, which is the dead-end pattern the project lock "a reachable control must DO something" exists to prevent. The mode is part of the QUERY, never modelled as a filter or a sort — it is not a narrowing of a result set, it is which result set | Home search form, search api.ts
LOCKED | A badge token the client does not recognise is DROPPED, never rendered raw | The backend emits hardcoded English (`official channel`, `complete card`, `pickup`); rendering an unknown token raw ships English into a ru/kk product the first time backend adds one. Dropping fails quiet and correct; rendering fails loud and wrong | result card badges
LOCKED | `openingSummary` on a search card is never read | Declared on `SearchCardResponse` but never assigned in `toCard()` — always null (verified on `dev` `ee542d9`, 2026-07-28). Same class as `suggestRoleExpansion`: a field that exists in the type and not on the wire invites a control gated on something that can never arrive | result cards

> **Note 2026-07-28 — the default-sort lock is unchanged; only its wire value moved.** Lock 1
> above names the default sort `intent_match`. The backend renamed that value to `relevance`
> (`sort` is now regex-validated against `relevance|distance|price_asc|lowest_price`, and
> `intent_match` is REJECTED). The DECISION the lock protects — relevance first, price never the
> default — is untouched; send `relevance`.

## Retired Locks
Kept, not deleted — a retired lock records that a decision was CONSCIOUSLY reversed.

RETIRED 2026-07-28 (owner approval, PRODUCT_VISION UF 2.1 append) | ~~No product/service scope toggle in the UI | One unified endpoint — the AI determines intent from the query~~ | **The premise is void, not merely outvoted.** This lock rested on a unified endpoint that no longer exists: `UnifiedSearchRequest` was replaced by `POST /api/v1/search`, whose `mode` is `@NotNull` and whose `SearchScope` enum admits only `ITEM` and `SERVICE`. There is no "AI determines intent" path left to protect — the API refuses a request that does not choose. Surrounding extension was proven insufficient before reversing: defaulting in code hides half the catalogue, and merging two queries client-side would violate the still-live server-capability lock above | Home search form
