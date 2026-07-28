# Requests — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/request/contracts.md`

## Customer
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/requests | CUSTOMER | Create a fallback request (empty/insufficient results) |
| GET | /api/v1/requests | CUSTOMER | My requests |
| GET | /api/v1/requests/{requestId} | CUSTOMER | Request detail + supplier responses |

## Business
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/business-admin/requests | BUSINESS | Cabinet Overview/"Requests" tab |
| POST | /api/v1/business-admin/requests/{targetId}/respond | BUSINESS | Send a supplier response |

## Status lifecycle (backend-owned — render, never derive)
DRAFT → CREATED → DISPATCHING → SENT → PARTIALLY_RESPONDED → COMPLETED
plus EXPIRED, CANCELLED, FAILED

## Supplier response statuses
- Product: HAS_ITEM · NO_ITEM · NEED_CLARIFICATION · HAS_ANALOG
- Service: CAN_PROVIDE · CANNOT_PROVIDE · NEED_CLARIFICATION · SUGGEST_OTHER_TIME

## Response source types
AUTO_REPLY · STAFF_REPLY · BUSINESS_CONFIRMED · DATA_UPDATED · SUPPLIER_CHECK_CONFIRMED

**AUTO_REPLY does not count as a confirmation.** The source type must be visible in how a response is rendered — an automated reply is never styled or labeled as a confirmed answer.
