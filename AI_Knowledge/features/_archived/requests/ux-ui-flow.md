# Requests — Screens & Flow

Traces PRODUCT_VISION **UF 3.1 item 1** (seller: Overview → "Requests": All / Active / New) and the customer fallback path out of an empty Catalog Page (UF 2.1).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Requests tab (seller) | inside /app/business | client |
| Request detail + responses | inside /app/business | client |
| Fallback request entry (customer) | over /app/catalog (empty results) | client |
| My requests (customer) | inside /app/profile | client |

## Customer flow
1. The Catalog Page returns nothing useful → the customer sends a **fallback request** instead of hitting a dead end.
2. Suppliers respond. The customer sees responses with their real source: a confirmed answer and an auto-reply look different and are labeled differently.

## Seller flow (UF 3.1 item 1)
The cabinet's Overview tab — the vision says it should be named **"Requests"** — filters **All / Active / New Requests**. It lists incoming requests (this slice) alongside conversations (`@/chats`); the cabinet composes both.

Responding: pick a status (product: has item / no item / needs clarification / has analog — service: can provide / cannot / needs clarification / suggest another time) and send.

## States (P8.4/P9.3)
- Loading: list and detail skeletons
- Empty: no requests → an empty state
- Error: respond failure → Toast, the draft response is preserved
- Status: render the backend's lifecycle value; never advance or infer a status client-side

## Hard rule
An **auto-reply is not a confirmation**. It must never be rendered as one — not with a confirmed badge, not with confirmed styling, not by counting it as an answered request.
