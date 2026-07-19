# Chats — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/messaging/contracts.md`
**Synced 2026-07-18:** attachments, conversation type/status, PLATFORM sender.

**Wire format (D20):** snake_case on the wire (`sender_type`, `conversation_type`,
`business_unread_count`, `attachment_url`); slice code sees camelCase.

## Customer
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/chat/start | CUSTOMER | Chat button on the Product Card (UF 2.1) |
| GET | /api/v1/chat/{conversationId}/messages | CUSTOMER | Chat thread |
| POST | /api/v1/chat/{conversationId}/messages | CUSTOMER | Send |
| POST | /api/v1/chat/{conversationId}/read | CUSTOMER | Mark read on open |

## Business
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/business-admin/chats | BUSINESS | Cabinet Overview/Requests list (UF 3.1) |
| GET | /api/v1/business-admin/chats/{conversationId}/messages | BUSINESS | Thread |
| POST | /api/v1/business-admin/chats/{conversationId}/messages | BUSINESS | Send |
| POST | /api/v1/business-admin/chats/{conversationId}/read | BUSINESS | Mark read on open |

## Attachments (backend added 2026-07-18)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/chat/upload?conversationId={id} | Participant | Upload (multipart `file`) → `{ url }` |
| GET | /api/v1/chat/files/{storedName} | Participant | Download |

- Participant = the conversation's customer or a member of its business.
- Upload rules (backend-enforced — mirror them in the picker for a good UX, don't reinvent): non-empty; size ≤ `ask.chat.max-file-size` (default **10 MB**); extension + content-type whitelists — default **png, jpg, jpeg, pdf, txt, md, csv, xlsx**; magic-byte check server-side.
- The stored name is a random UUID; the original filename comes back only via `Content-Disposition`. Download responds `attachment` + `X-Content-Type-Options: nosniff`.
- To send a file message: upload first → the returned `url` becomes the message's `attachmentUrl`; the attachment must belong to the **same conversation**.

## ChatConversation
id, businessId, customerId, subject,
**conversationType** (`GENERAL_SUPPORT` default | `MANAGED_IMPORT`),
**status** (`PENDING` → `IN_CHAT` on first PLATFORM message → `CLOSED`),
customerUnreadCount, businessUnreadCount, lastMessageAt, createdAt, updatedAt

- V1 customer/business chats are `GENERAL_SUPPORT`. `MANAGED_IMPORT` conversations are operated by platform staff (no V1 customer/business chats surface — see below).

## ChatMessage
id, conversationId,
**senderType** (`CUSTOMER` | `BUSINESS` | `PLATFORM`),
senderId, content, **attachmentUrl** (nullable — a registered attachment in the same conversation), createdAt

## Unread rules (backend-owned — never recompute client-side)
- `CUSTOMER` message → businessUnreadCount++
- `BUSINESS` / `PLATFORM` message → customerUnreadCount++
- markRead resets the reader's counter to 0

## Platform chat (MANAGED_IMPORT only — NO V1 chats-slice surface, context)
`/api/v1/platform/chat/*` lets platform staff operate `MANAGED_IMPORT` conversations
(list / messages / send / read / close), gated on `MANAGE_MANAGED_IMPORTS` or
`MANAGE_SUPPORT_CHATS`. Platform endpoints **reject** `GENERAL_SUPPORT` (403) — staff must
not read private customer↔business chats. This belongs to a platform cabinet the frontend
does not have in V1 (owner decision pending); do not build it here.

## Errors surfaced
- **CONVERSATION_CLOSED** (new) → sending into a `CLOSED` conversation; surface "this chat is closed".
- FILE_INVALID / ATTACHMENT_NOT_FOUND → upload rejected / bad attachment reference.

No delivered/read receipts per message. No typing indicators. The model has neither.
