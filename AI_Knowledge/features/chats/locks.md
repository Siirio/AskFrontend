# Chats — Slice Locks

LOCKED | Only real conversations appear in Chats — an auto supplier check is never rendered as a chat | Automated confirmation is not a human conversation; it must produce no unread badge (backend lock) | Chats list, business chat list
LOCKED | Text-only messages — no attachments, no delivered/read receipts, no typing indicators | The backend ChatMessage model has none of them; inventing UI for them fakes capability (P9.1) | chat thread, composer
LOCKED | Unread counts are rendered from the backend, never computed client-side | Counters are per-side and backend-owned; a client copy of the rule will drift | chat list, badges
LOCKED | ONE chat feature serves the Chats Page, the card modal, and the business side | Same knowledge, live feature → embedded via the slice's index.ts, never copied (D8, R2) | src/chats/index.ts
LOCKED | The card's chat button opens the chat modal directly — no intermediate page | UF 2.1 step 4 is explicit about this | ProductCard → chats modal
