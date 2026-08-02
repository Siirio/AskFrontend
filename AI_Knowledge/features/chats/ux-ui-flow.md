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


## Route placeholder — until this slice lands (2026-08-02)

`/app/chats` is LIVE and reachable today, so it states plainly that the section is
not open rather than looking unfinished: the shared `EmptyState` primitive via
`app/_components/SectionNotOpen.tsx`, with copy in ru/kk/en. It used to render a
bare `<h1>` plus "Section under construction" inside a neumorphic product, which
reads as a broken build rather than as a message (AUDIT_2 N4 / AUDIT_1 B1).

This is the second of the three endings the "a reachable control must DO
something" lock allows — build it, say plainly it is not open, or stop offering
the control. Not invented UI (P9.1): it is the mandatory empty state P9.3
requires of a surface that exists with no content.

Chats is a PERMANENT nav destination for every user, so this page is one tap away at all times.

Verified in a browser, light and dark, against a production build.
