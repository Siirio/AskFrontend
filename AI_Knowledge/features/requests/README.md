# Requests

Mirrors backend module: **request** (`../Ask_Backend/AI_Knowledge/features/request/`).

Owns fallback requests: what happens when catalog results are not enough. The customer's request goes out to businesses; suppliers respond. On the seller side this feeds the cabinet's Overview/"Requests" tab (UF 3.1 item 1).

## Key decisions
- **This is the search dead-end escape.** An empty Catalog Page is never a dead end — it offers a fallback request (`@/search` embeds this slice's entry point via `index.ts`, D8).
- **An auto-reply is NOT a confirmation.** Only a real business confirmation advances a request's status. The UI must never present an automated reply as a confirmed answer — this is a backend lock and the single most important rule in this slice.
- The cabinet's Overview tab mixes **requests and chats** — the vision calls the tab "Requests" and filters it All / Active / New. Requests come from here; conversations come from `@/chats`. The cabinet composes both.
- Status lifecycle is backend-owned and rendered as-is; the client never derives or advances a status.
- Client-rendered (D7) — an authenticated surface.
