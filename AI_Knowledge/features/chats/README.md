# Chats

Mirrors backend module: **chat** (`../Ask_Backend/AI_Knowledge/features/messaging/`).

Owns every conversation surface: the customer's **Chats Page** and chat thread (UF 2.2), the chat modal opened from the Product Card (UF 2.1), and the business side of the same conversations, which the cabinet's Overview/"Requests" tab lists (UF 3.1 item 1).

## Key decisions
- **One slice, both sides.** Customer chat and business chat are the same conversations behind different endpoints — one slice owns them, exposing the customer view and the business view through `index.ts`.
- The chat modal opened from a Product Card is the **same live feature**, embedded by `@/catalog` via `index.ts` (D8 — same knowledge → import from the owner, never a copy).
- **Text only.** No attachments, no message statuses (delivered/read receipts) — the backend's model has neither. Unread *counts* exist and are per-side.
- **An auto supplier check is NOT a chat.** Automated supplier confirmations must never appear as conversations or produce unread counts (backend lock). Only real conversations appear in Chats.
- Client-rendered (D7) — an authenticated, interactive surface.
