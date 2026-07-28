# Requests — ARCHIVED 2026-07-28

> ## ⛔ This slice was REMOVED from the product — do not build it
>
> **Never built** — it was roadmap slice #5 and no `src/requests/` ever existed. Archived,
> not deleted, per the removal procedure (`../../README.md`).
>
> **Why (owner decision, 2026-07-28).** The feature was an **auto-request to businesses**: when
> a search returned nothing, the query would be dispatched automatically to companies whose
> profile description loosely matched it — a shop described as selling clothing would receive
> "sneakers". It was removed for a logic gap, not for lack of backend capacity: the behaviour
> collapses at scale, because once every loosely-matching company answers, the customer is
> handed exactly the noise ASK exists to remove. That is the anti-marketplace mission failing
> in its own core flow.
>
> **Backend side.** The `request` domain (`CustomerRequest`, `RequestTarget`, `SupplierResponse`)
> was deleted from AskBackend on 2026-07-21. There is nothing to consume.
>
> **What did NOT go away.** PRODUCT_VISION UF 3.1 item 1 — *"Overview (should be 'Requests'):
> All, Active, New Requests — **these are all chats**"* — is a different thing and survives
> intact. That cabinet tab is composed from `@/chats`, and always was. Do not read this archive
> as removing it.
>
> **Search's empty state** no longer routes here — see `features/search/ux-ui-flow.md`.

Mirrors backend module: **request** (`../Ask_Backend/AI_Knowledge/features/request/`) — *deleted*.

Owns fallback requests: what happens when catalog results are not enough. The customer's request goes out to businesses; suppliers respond. On the seller side this feeds the cabinet's Overview/"Requests" tab (UF 3.1 item 1).

## Key decisions
- **This is the search dead-end escape.** An empty Catalog Page is never a dead end — it offers a fallback request (`@/search` embeds this slice's entry point via `index.ts`, D8).
- **An auto-reply is NOT a confirmation.** Only a real business confirmation advances a request's status. The UI must never present an automated reply as a confirmed answer — this is a backend lock and the single most important rule in this slice.
- The cabinet's Overview tab mixes **requests and chats** — the vision calls the tab "Requests" and filters it All / Active / New. Requests come from here; conversations come from `@/chats`. The cabinet composes both.
- Status lifecycle is backend-owned and rendered as-is; the client never derives or advances a status.
- Client-rendered (D7) — an authenticated surface.
