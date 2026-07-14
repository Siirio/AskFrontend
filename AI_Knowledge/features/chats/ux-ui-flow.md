# Chats — Screens & Flow

Traces PRODUCT_VISION **UF 2.2** (customer wants to find a chat), **UF 2.1 step 4** (chat from the card), and **UF 3.1 item 1** (seller: Overview/"Requests" = all chats).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Chats Page (customer) | /app/chats | client |
| Chat thread | /app/chats (selected) | client |
| Chat modal (from Product Card) | over /app/catalog | client |
| Business chat list + thread | inside /app/business | client |

## Customer flow (UF 2.2)
1. Home → navigation menu → **Chats Page**.
2. Select a conversation → **Chat** thread. Opening marks it read.

## From the card (UF 2.1)
The Product Card's chat button opens the chat modal **straight away** — no intermediate navigation. It starts a conversation from the product context (`POST /chat/start`).

## Seller flow (UF 3.1 item 1)
The cabinet's Overview tab — which the vision says should be called **"Requests"** — lists conversations filtered as **All / Active / New Requests**. These are all chats.

## States (P8.4/P9.3)
- Loading: thread skeleton
- Empty: no conversations → an empty state, not a blank page
- Error: send failure → the message stays in the composer with a retry, never silently dropped
- Unread: render the backend's counters. Never compute unread client-side.

## Hard rule
Only **real conversations** appear here. An automated supplier check is not a chat and must never create a conversation row or an unread badge (backend lock, see locks.md).
