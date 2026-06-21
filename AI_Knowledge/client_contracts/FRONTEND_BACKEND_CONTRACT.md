# Frontend Backend Contract

This document captures the frontend-facing contract expectations for Ask. Backend implementation details belong in AskBackend; this repository tracks what the UI needs to render honestly.

## Product Flow

- Customer search is the primary entry point.
- Category selection scopes Smart Search and must not replace it.
- The frontend should show known products and services before fallback request creation when backend data supports it; businesses appear as providers/context for those results.
- The frontend should guide users into fallback requests when exact data is missing, stale, low-confidence, or confirmation-needed.
- The customer raw query must be preserved across search, fallback request creation, status, and response views.

## Entry Points

There are three distinct entry paths into the system. They are not three equal "registrations":

| Path | Who | How | Endpoint |
|------|-----|-----|----------|
| Customer registration | End-user searching | Self-registers | `POST /auth/customer/register` |
| Business owner registration | Person creating a business | Self-registers | `POST /auth/business/register` |
| Staff activation | Manager or operator | Created by owner, activates via login | `POST /auth/login` → `POST /auth/change-temporary-password` |

Staff members do NOT self-register. There is no `/auth/staff/register` or `/auth/manager/register`. Staff accounts are created by owners/managers inside the business cabinet.

## Unified Login

`POST /api/v1/auth/login` accepts `{ email, password }` and works for ALL roles: customer, business owner, manager, operator.

Response `AuthSessionResponse` includes `activationRequired: boolean`. When `true`, the frontend must navigate to the password change screen (`POST /api/v1/auth/change-temporary-password`). The activation session TTL is 5 minutes.

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

### Product Request Responses

- `HAS_ITEM`: business has the requested product or a sufficiently matching product.
- `NO_ITEM`: business does not have it.
- `NEED_CLARIFICATION`: business needs details.
- `HAS_ANALOG`: business offers an analog.

### Service Request Responses

- `CAN_PROVIDE`: business can provide the service.
- `CANNOT_PROVIDE`: business cannot provide it.
- `NEED_CLARIFICATION`: business needs date, time, address, service type, or other details.
- `SUGGEST_OTHER_TIME`: business proposes another time.

Updating a business response updates the same row — it must not create duplicates.

The old statuses `AVAILABLE`, `UNAVAILABLE`, `NEEDS_CONFIRMATION`, and `ALTERNATIVE_OFFERED` are no longer used.

## Staff Statuses

| Status | Display (Russian) | Can log in? | Temp password visible? |
|--------|-------------------|-------------|------------------------|
| `PENDING_ACTIVATION` | Ожидает активации | Limited (activation session) | Yes |
| `ACTIVE` | Активен | Yes | No |
| `PASSWORD_RESET_REQUIRED` | Требуется смена пароля | Limited (activation session) | Yes |
| `DISABLED` | Заблокирован | No | No |

## Staff Roles

- `MANAGER`: full branch management access (staff, products, services).
- `OPERATOR`: limited branch access.

Staff endpoints (`/api/v1/businesses/{bId}/branches/{brId}/staff`, `/api/v1/businesses/{bId}/branches/{brId}/invites`) require `OWNER` or `MANAGER` authority.

## Authority Strings (in auth_session.authority)

| Role | Authority |
|------|-----------|
| Customer | `ROLE_CUSTOMER` |
| Business owner | `ROLE_BUSINESS_OWNER` |
| Business manager | `ROLE_BUSINESS_MANAGER` |
| Business operator | `ROLE_BUSINESS_OPERATOR` |

## Error Response Format

All errors follow:

```json
{
  "timestamp": "2026-06-21T10:30:00Z",
  "errorCode": "INVALID_CREDENTIALS",
  "message": "Неверный email или пароль",
  "errors": null
}
```

`ErrorResponse` fields: `timestamp` (datetime), `errorCode` (string), `message` (string), `errors` (array of `ErrorDetail` | null).

`ErrorDetail` fields: `field` (string), `message` (string).

HTTP status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (internal), 502 (external service).

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
- notification counts and read states;
- staff list with roles, statuses, and temporary password visibility;
- invite code list with usage counts and revocation state.

## UI Truth Rules

- Frontend owns localization and presentation, not data truth.
- Backend returns stable statuses, ids, timestamps, source metadata, and machine-readable errors.
- Manual replies may show status, price, comment, branch address, contact actions, map links, and explicit supplier notes.
- Do not show exact stock quantity, courier availability, delivery SLA, guaranteed slots, or booking certainty unless supplier input or trusted integration data supports it.
- Integration-backed facts should be visually distinguishable enough that users understand the source.
- Temporary password is shown to owner ONLY in create/response/reset-password API responses and only while staff status is `PENDING_ACTIVATION` or `PASSWORD_RESET_REQUIRED`. After activation, `tempPassword` is `null`.
- Staff use the unified `/auth/login` — there is no separate staff login endpoint.

## Chat And Contact Actions

- Ask chat is scoped to one request and one supplier.
- Customer chat must have a back path to the supplier response feed.
- Supplier chat opens as its own sub-view.
- WhatsApp, Telegram, map links, and Ask chat are separate per-response actions.
- Map action should not appear when branch address is unknown.
- Browser prototypes may use web URLs; native clients may use deep links.
