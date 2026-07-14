# Chats — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/messaging/contracts.md`

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

## ChatConversation
id, businessId, customerId, subject, customerUnreadCount, businessUnreadCount, lastMessageAt, createdAt, updatedAt

## ChatMessage
id, conversationId, senderType (CUSTOMER | BUSINESS), senderId, content (**text only — no attachments**), createdAt

## Unread rules (backend-owned — never recompute client-side)
- Customer sends → businessUnreadCount++
- Business sends → customerUnreadCount++
- markRead resets the reader's counter to 0

No delivered/read receipts per message. No typing indicators. The model has neither.
