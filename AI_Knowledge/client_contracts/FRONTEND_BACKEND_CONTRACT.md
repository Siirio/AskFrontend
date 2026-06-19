# Frontend Backend Contract

This document captures the frontend-facing contract expectations for Ask. Backend implementation details belong in AskBackend; this repository tracks what the UI needs to render honestly.

## Product Flow

- Customer search is the primary entry point.
- Category selection scopes Smart Search and must not replace it.
- The frontend should show known products, services, and businesses before fallback request creation when backend data supports it.
- The frontend should guide users into fallback requests when exact data is missing, stale, low-confidence, or confirmation-needed.
- The customer raw query must be preserved across search, fallback request creation, status, and response views.

## Customer Request Statuses

Frontend should expect stable machine-readable statuses and own visible localization.

- `DRAFT`: request is not ready for dispatch.
- `CREATED`: request exists but is not being dispatched yet.
- `DISPATCHING`: request is being sent to eligible suppliers.
- `SENT`: request was sent and is waiting for replies.
- `PARTIALLY_RESPONDED`: at least one supplier response exists.
- `COMPLETED`: request lifecycle is complete.
- `EXPIRED`: request TTL ended.
- `CANCELLED`: request was cancelled.
- `FAILED`: dispatch or lifecycle failed.

## Supplier Response Statuses

- `AVAILABLE`: supplier can offer the requested item or service.
- `UNAVAILABLE`: supplier explicitly cannot.
- `NEED_CLARIFICATION`: supplier needs extra details.
- `ALTERNATIVE_OFFERED`: exact match is unavailable, but a similar option exists.

## Frontend Data Needs

API responses should support:

- customer request history;
- active request status and progress;
- recipient count and response count;
- response feed filters with counts;
- compact response rows with supplier, status, price, distance, and product hint;
- expanded response details with product image, supplier, product/service, price, comment, address, map action, and contacts;
- supplier inbox sorted by unanswered or new requests;
- supplier reply attempts and limit state;
- per-request and per-supplier chat messages;
- notification counts and read states.

## UI Truth Rules

- Frontend owns localization and presentation, not data truth.
- Backend returns stable statuses, ids, timestamps, source metadata, and machine-readable errors.
- Manual replies may show status, price, comment, branch address, contact actions, map links, and explicit supplier notes.
- Do not show exact stock quantity, courier availability, delivery SLA, guaranteed slots, or booking certainty unless supplier input or trusted integration data supports it.
- Integration-backed facts should be visually distinguishable enough that users understand the source.

## Chat And Contact Actions

- Ask chat is scoped to one request and one supplier.
- Customer chat must have a back path to the supplier response feed.
- Supplier chat opens as its own sub-view.
- WhatsApp, Telegram, map links, and Ask chat are separate per-response actions.
- Map action should not appear when branch address is unknown.
- Browser prototypes may use web URLs; native clients may use deep links.
