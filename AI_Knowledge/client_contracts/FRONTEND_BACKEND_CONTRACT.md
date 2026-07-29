# Frontend Backend Contract

This document captures the frontend-facing contract expectations for Ask. Backend implementation details belong in AskBackend; this repository tracks what the UI needs to render honestly.

## Product Flow

- Customer search is the primary entry point.
- Category selection scopes Smart Search and must not replace it.
- The frontend should show known products and services before fallback request creation when backend data supports it; businesses appear as providers/context for those results.
- Product/service search may automatically create an auto supplier check/request after submit when suitable business/branch candidates exist.
- The frontend must not require the customer to manually press `Create request` as the main fallback path.
- Businesses appear as provider/context inside search sessions, not as a standalone business search scope.
- The customer raw query must be preserved across search, fallback request creation, status, and response views.
- One submitted search session has one locked scope: `PRODUCT` or `SERVICE`. Changing scope after submit creates a new search session.

## Search Session Result Tabs

After a customer submits a search, the result screen is organized around the current search session.

Product search tabs:

- `FOUND`: catalog/search results, including exact products, similar products, and known analogs.
- `SUPPLIER_CHECK`: suitable businesses/branches automatically selected by Ask for this raw query, dispatch status, and supplier responses.
- `CHATS`: appears only when at least one real conversation exists for this search session.

Service search uses the same model, but the second tab is service-provider oriented.

The `CHATS` tab must not appear merely because an automatic supplier check was sent. Auto-generated supplier check is visible to the business as an incoming activity, but it is not visible to the customer as an outgoing chat message and must not create customer unread chat notifications.

## Entry Points

There are three distinct entry paths into the system. They are not three equal "registrations":

| Path | Who | How | Endpoint |
|------|-----|-----|----------|
| Customer registration | End-user searching | Self-registers | `POST /auth/customer/register` |
| Google customer registration/login | End-user searching | Google-verified email creates or reuses CUSTOMER | `GET {API_BASE_URL}/oauth2/authorization/google` |
| Business owner registration | Person creating a business | Self-registers | `POST /auth/business/register` |
| Staff activation | Staff | Created by owner, activates via login | `POST /auth/login` → `POST /auth/change-temporary-password` |

Customer registration does not send a legal-acceptance flag. After contact verification, role selection requires a dedicated `POST /api/v1/legal/registration-acceptances`: customers accept `USER_TERMS` and `PRIVACY_POLICY`; sellers accept `SELLER_TERMS` and `PERSONAL_DATA_CONSENT`.

Authenticated seller setup uses `POST /api/v1/business/onboarding`. It requires a business name, a selected or free-text business category, country, legal form, entity-backed `businessScope` (`ITEM`, `SERVICE`, or `BOTH`), `deliveryCoverage`, and `pickupAvailable`. `deliveryCoverage` is `NO_DELIVERY`, `SELECTED_CITIES`, `KAZAKHSTAN`, or `WORLDWIDE`; selected-city coverage also requires `deliveryCities`. Delivery and pickup are requested on the penultimate onboarding screen and remain editable in the Business profile. For `KZ_IP` and `KZ_TOO`, the UI also sends the 12-digit legal identifier (IIN/BIN) and legal name; it must not request verification source links. For `NONE`, at least one valid HTTP(S) verification source is mandatory. When the owner selects Ask managed import, the business cabinet opens a dialog containing only `preferredContactChannel` and `preferredContactValue`; source links collected during onboarding are submitted without being shown again.

Business-category autocomplete calls `GET /api/v1/categories?q=<text>&type=BUSINESS` and renders its `suggestions` only. Product and service forms use `ITEM` and `SERVICE` respectively; no UI may substitute a catalog scope for this category type.

Staff members do NOT self-register. There is no `/auth/staff/register` or `/auth/manager/register`. Staff accounts are created by owners inside the business cabinet.

## Unified Login

`POST /api/v1/auth/login` accepts `{ email, password }` and works for ALL roles: customer, business owner, business staff.

Response `AuthSessionResponse` includes `activationRequired: boolean`. When `true`, the frontend must navigate to the password change screen (`POST /api/v1/auth/change-temporary-password`). The activation session TTL is 5 minutes.

`all_roles` is the deduplicated union of the personal AppUser role, active `business_memberships[].role` values, and `platform_membership.role`. Context-specific access must still use the corresponding membership object.

## Account Security

`AuthSessionResponse.is_two_factor_enabled` is the persisted 2FA setting. `requires_two_factor` is used only when a login is waiting for verification.

Password changes use `POST /api/v1/auth/password-change/request` with `current_password`, `new_password`, and `password_confirmation`, followed by `POST /api/v1/auth/password-change/confirm` with `verification_id` and a 6-digit `code`.

Two-factor changes use `POST /api/v1/auth/two-factor/request` with the explicit `enabled` target, followed by `POST /api/v1/auth/two-factor/confirm` with `verification_id` and a 6-digit `code`. Closing either dialog clears locally held passwords and codes. Resend repeats the request endpoint and replaces the earlier challenge.

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

Business-facing roles:

- `OWNER`: business-level owner. Can create branches, manage branch list, create/remove Staff accounts for branches, and enter any owned branch workspace.
- `MANAGER`: branch-level manager. Can manage staff for assigned branches. Created by OWNER.
- `WORKER`: branch-level worker. Can use assigned branch workspace screens such as dashboard/activity, products, services, and other documented working sections. Cannot create branches or manage accounts.

There is no `OPERATOR` role.

Staff management endpoints require `OWNER` or `MANAGER` authority. Workers cannot create, update, disable, reset, or invite other Staff accounts.

## Authority Strings (in auth_session.authority)

| Role | Authority |
|------|-----------|
| Customer | `ROLE_CUSTOMER` |
| Business owner | `ROLE_BUSINESS_OWNER` |
| Business staff | `ROLE_BUSINESS_STAFF` |

## Owner And Staff Routing

After authentication:

- `ROLE_BUSINESS_OWNER` opens the owner branch-management interface.
- Owner can create branches, select a branch, and then enters the same working interface as Staff for that branch.
- `ROLE_BUSINESS_STAFF` opens the assigned branch working interface directly.
- Staff does not see branch creation, branch deletion, staff management, or business-level ownership screens.

Frontend must not branch UI logic by `MANAGER` or `OPERATOR`.

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
- staff list with Staff account statuses and temporary password visibility;
- owner branch list and selected-branch context;
- invite code list with usage counts and revocation state.

## UI Truth Rules

- Frontend owns localization and presentation, not data truth.
- Backend returns stable statuses, ids, timestamps, source metadata, and machine-readable errors.
- Manual replies may show status, price, comment, branch address, contact actions, map links, and explicit supplier notes.
- Do not show exact stock quantity, courier availability, delivery SLA, guaranteed slots, or booking certainty unless supplier input or trusted integration data supports it.
- Integration-backed facts should be visually distinguishable enough that users understand the source.
- Temporary password is shown to owner ONLY in create/response/reset-password API responses and only while staff status is `PENDING_ACTIVATION` or `PASSWORD_RESET_REQUIRED`. After activation, `tempPassword` is `null`.
- Staff use the unified `/auth/login` — there is no separate staff login endpoint.

## Search V2 / Generative UI

`POST /api/v1/search` replaces the current search with a structured pipeline: raw query → AI intent structurer (SearchPlan JSON) → PostgreSQL in-memory scoring → SearchResponse with sections. Meilisearch integration is under investigation — evaluating whether it improves query understanding and guessing. Current search uses PostgreSQL as both source of truth and search engine.

### SearchPlan Contract

The AI intent structurer returns a SearchPlan JSON. Backend validates and executes it. Frontend never constructs or interprets SearchPlan — it sends rawQuery + scope and receives hydrated SearchResponse.

### SearchResponse

| Field | Type | Purpose |
|-------|------|---------|
| `searchSessionId` | UUID | Search session for history and tabs |
| `rawQuery` | String | Original query preserved |
| `scope` | String | `PRODUCT` or `SERVICE` |
| `understoodQuery` | String | How AI understood the query (Russian) |
| `sections` | [SearchSection] | Result sections in display order |
| `supplierCheckCount` | Integer | How many auto supplier checks were created |

### SearchSection

| Field | Type | Purpose |
|-------|------|---------|
| `type` | String | `exact_products`, `similar_products`, `fresh_drops`, `suitable_storefronts`, `over_budget`, `needs_confirmation` |
| `title` | String | Section title in Russian |
| `cards` | [SearchResultCard] | Cards for this section |

### SearchResultCard

| Field | Type | Purpose |
|-------|------|---------|
| `component` | String | `ProductCard`, `ServiceCard`, `DropCard`, `BusinessCandidateCard` |
| `resultId` | UUID | Result ID |
| `businessId` | UUID | Business ID |
| `businessName` | String | Brand name |
| `brandColor` | String | Accent color from BrandProfile |
| `brandLogoUrl` | String | Logo URL |
| `title` | String | Card title |
| `price` | Decimal | Price (nullable for drops) |
| `availability` | String | `IN_STOCK`, `NEEDS_CONFIRMATION`, `UNKNOWN` |
| `badges` | [String] | Quality badges |
| `distanceMeters` | Integer | Distance (nullable) |
| `branchName` | String | Branch display name |
| `branchAddress` | String | Branch street address |
| `branchCity` | String | Branch city name |
| `openingSummary` | Object | `{ state, timeZoneId, evaluatedAt, nextOpensAt, nextClosesAt }` — computed branch opening state |
| `hasActiveDrop` | Boolean | Brand has active drop |
| `contactActions` | [ContactActionSummary] | Available contact actions (Telegram, WhatsApp, Chat, etc.) |

### Generative UI Rules

- Frontend renders only whitelisted components: ProductCard, ServiceCard, DropCard, BusinessCandidateCard.
- Frontend never renders arbitrary HTML or inv invents UI from backend text.
- Badges are backend-controlled; frontend maps badge strings to visual treatments.
- Default sort is `intent_match` (relevance). `price_asc`/`price_desc` available as user choice, not default.

## Contact Actions

Privacy-safe contact resolution through one-time tokens. Frontend never receives raw phone/username unless backend marks it PUBLIC.

### Contact Resolve Flow

`POST /api/v1/contacts/{contactActionId}/resolve` (authenticated):

| Field | Type | Purpose |
|-------|------|---------|
| `actionType` | String | `REDIRECT`, `DISPLAY`, `DEEP_LINK`, `CHAT` |
| `redirectUrl` | String | Browser redirect URL (if REDIRECT) |
| `deepLink` | String | Native deep link (if DEEP_LINK) |
| `displayValue` | String | Safe display value (if DISPLAY) |
| `provider` | String | `TELEGRAM`, `INSTAGRAM`, `WHATSAPP`, `TWO_GIS`, `SITE`, `PHONE`, `ASK_CHAT` |
| `label` | String | Human-readable label ("Написать в WhatsApp") |
| `expiresAt` | Timestamp | Token expiry (30 min TTL) |

### Rules

- contactActionId is embedded in search result cards and business page responses.
- Token lives 30 minutes, one-time or rate-limited.
- For ASK_CHAT: resolves to existing or new conversation.
- For external channels: backend decrypts contact, builds deep link (tg://, https://wa.me/, instagram://, 2gis://).
- Backend logs every resolve: who, when, which contact, which action.

## Storefront Builder

Constrained page builder for brand mini-sites. Brands assemble pages from pre-defined blocks.

### Business Profile

`GET /api/v1/businesses/{businessId}/business-profile` returns the public Business-owned profile by `businessId`.

`PATCH /api/v1/businesses/{businessId}/business-profile` lets an authorized Business owner or manager update public text, contact fields, `deliveryCoverage`, `deliveryCities`, and `pickupAvailable`. Logo and cover use the dedicated multipart upload endpoints.

Business profile data is distinct from the personal `AppUser` account profile. Ownership or membership never merges the two models.

### Storefront Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/businesses/{businessId}/storefront` | No | Published page (404 if not published) |
| `GET` | `/api/v1/businesses/{businessId}/storefront/draft` | Owner | Draft page |
| `PUT` | `/api/v1/businesses/{businessId}/storefront/draft` | Owner | Save draft (full block replacement) |
| `POST` | `/api/v1/businesses/{businessId}/storefront/publish` | Owner | Publish draft → published |

### StorefrontBlock Types

`HERO`, `PRODUCTS`, `DROPS`, `ABOUT`, `LOOKBOOK`, `BRANCHES`, `CONTACTS`, `FAQ`, `PROMO`, `WHY_THIS_MATCHES`

Each block: blockId, blockType, displayOrder, config (block-specific JSON), enabled.

### Rules

- Only Owner manages storefront. Staff see read-only preview.
- Publish copies all blocks from draft → published. Old published blocks deleted.
- Brand color changes trigger Meilisearch re-sync of all business search documents.
- Storefront is a constrained builder (Puck-style), not free-form Webflow.

## Drops In Search

Drops are brand events (new collection, restock, collab, etc.) surfaced as search signals.

### DropCard In Search

DropCard appears in `fresh_drops` search section. Rendered from Meilisearch type=DROP documents hydrated through PostgreSQL.

### hasActiveDrop Badge

When a brand has an active drop, its product cards receive `hasActiveDrop: true` and a "Новый дроп" badge. Active drops boost search ranking (+10% freshnessScore).

### Public Drop List

`GET /api/v1/businesses/{businessId}/drops` (public): Returns active and upcoming drops with name, description, type, status, startDate, endDate, coverUrl, productCount, tags.

## Chat And Contact Actions

- Ask chat is scoped to one request and one supplier.
- Customer chat must have a back path to the supplier response feed.
- Supplier chat opens as its own sub-view.
- Auto supplier check is not a customer-visible chat message.
- A customer-visible chat is created or surfaced only after a real business message, a business clarification action, or a customer-initiated chat action.
- Business Activity may show the auto-generated supplier check as one incoming item/message that requires response.
- WhatsApp, Telegram, map links, and Ask chat are separate per-response actions.
- Map action should not appear when branch address is unknown.
- Browser prototypes may use web URLs; native clients may use deep links.

## 2026-07-18 managed catalog updates
- Branch DTOs include `addressDetails`, `timeZoneId`, `weeklyHours`, and `specialHours`. OWNER and MANAGER may edit them. Map interaction or a supported map link supplies internal latitude and longitude; numeric coordinate fields are never rendered.
- Catalog setup has no manual completion endpoint and may return `REVIEW_REQUIRED`.
- Managed-import activation immediately starts an assigned seven-day, per-Business workspace scoped to `ITEM`, `SERVICE`, or `BOTH` and a file-capable chat. It does not depend on a global catalog-edit permission; there is no manual completion endpoint.
- Business import accepts `.xlsx`; assigned platform import additionally exposes TXT/MD/PDF Autodump.
- `POST /api/v1/platform/ai-enrichment` enriches selected `PRODUCT`, `SERVICE`, or `UNIQUE_OFFER` aggregate IDs from their own text fields and returns `enrichedCount`; the platform UI refreshes the affected data immediately.
- Account export was removed; account deletion remains.
- The personal account page contains profile data, verified password and 2FA actions, a company-onboarding action only when `business_memberships` is empty, logout, and a visually separate account-deletion danger zone. It does not duplicate preferences, notification, or legal-document management.
- The dedicated chats page keeps text search and removes synthetic status filter controls; conversation status may still be displayed when returned by the API.

## 2026-07-19 OAuth and business-scope updates
- `GET /api/v1/auth/session` accepts the OAuth bridge cookie or a Bearer token and returns `access_token`, `token_type`, `expires_in`, plus the normal session context. The bridge cookie is cleared by the response.
- Successful password, OTP, activation, and OAuth exchange responses return an HS256 JWT whose `sid` remains tied to the revocable backend session.
- Frontend stores the access token in session storage. Requests with a token send `Authorization: Bearer ...`, use `credentials: omit`, and do not rely on auth cookies.
- Seller onboarding requires `businessScope`: `ITEM`, `SERVICE`, or `BOTH`.
- Managed-import creation uses the same `businessScope`, optional `selectedSourceTypes`, and required channel-valid `preferredContactChannel` plus `preferredContactValue`. `GET /api/v1/platform/managed-imports/businesses/{businessId}/items-services-access` returns `allowed` and `businessScope`.

## 2026-07-24 Phase 2 domain model alignment — branches, schedules, online business

### Business onlineOnly

- `BusinessDto` includes `onlineOnly?: boolean`. When `true`, the business has no physical branches and the Organization section in the business cabinet is hidden.
- Seller onboarding sends `onlineOnly: boolean` in the `POST /api/v1/business/onboarding` body. When `true`, the business is created without a branch and the owner is routed directly to the business cabinet.
- `GET /api/v1/businesses/{businessId}` returns `BusinessDto` with `onlineOnly`, `businessScope`, `id`, and `name`.
- Attempting to create a branch for an onlineOnly business returns error code `BRANCH_NOT_ALLOWED_ONLINE_ONLY` (400). Frontend catches this and flips the local `businessOnlineOnly` state, preventing further branch-creation attempts.
- Before an onlineOnly business creates its first branch, a confirmation dialog warns the owner that adding a physical branch switches the business to offline mode — an irreversible change.

### Branch schedule model

- `BranchDto` includes `timeZoneId?: string` (IANA timezone like `Asia/Almaty`), `weeklyHours?: WeeklyOpeningIntervalDto[]`, and `specialHours?: SpecialOpeningIntervalDto[]`.
- `WeeklyOpeningIntervalDto`: `{ dayOfWeek, opensAt, closesAt }` — all strings.
- `SpecialOpeningIntervalDto`: `{ date, closed?, opensAt?, closesAt? }` — date overrides for holidays or special events.
- `BranchOpeningSummaryDto`: `{ state: "OPEN" | "CLOSED" | "UNKNOWN", timeZoneId?, evaluatedAt, nextOpensAt?, nextClosesAt? }` — computed by backend `BranchOpeningHoursPolicy`.
- Frontend formats opening times using `Intl.DateTimeFormat` with the branch's IANA timezone; no manual UTC offset math.
- Search result cards carry `openingSummary` for distance-aware open/closed display.
- Schedule editors in branch create/edit forms use dayOfWeek dropdowns + time inputs for weeklyHours, and date pickers + closed checkbox + conditional time inputs for specialHours. Both support add/remove rows.

### Search openNow filter

- `POST /api/v1/search` accepts `filters.openNow?: boolean`. When `true`, backend filters results to branches currently open (per `BranchOpeningHoursPolicy`).
- ResultsPage renders an `openNow` toggle button (Clock icon) in the sort rail sidebar. Toggling it resets to page 0 and re-fetches.

### Domain types (frontend)

- `src/shared/api/domainTypes.ts` centralizes: `BusinessScope`, `WeeklyOpeningIntervalDto`, `SpecialOpeningIntervalDto`, `BranchOpeningSummaryDto`, `BranchDto`, `BusinessDto`, `CreateBranchData`, `UpdateBranchData`.
- All API client functions use these types instead of inline interfaces. Branch form state aligns with `CreateBranchData`/`UpdateBranchData`.
