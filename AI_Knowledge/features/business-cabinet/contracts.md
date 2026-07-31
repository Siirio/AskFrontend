# Business Cabinet — Consumed Backend Contracts

Sources: `../Ask_Backend/AI_Knowledge/features/business/contracts.md`, `.../offers/contracts.md`

## Branches
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/branches | OWNER/MANAGER | Branches tab (not built yet) |
| POST | /api/v1/businesses/{businessId}/branches | OWNER | **NOT used by registration since 2026-07-29** (backend commit `9a90f5c` — see Seller Onboarding below). Reserved for the future Branches tab's "Add branch" to an EXISTING business |
| PATCH | /api/v1/businesses/{businessId}/branches/{branchId} | OWNER | Update branch (not built yet) |

**`CreateBranchRequest`** (read from `kz.ask.business.branch.api.dto.CreateBranchRequest.java`,
not inferred): `name` (`@NotBlank`), `address`, `addressDetails`, `cityId` all optional,
`latitude`/`longitude` **`@NotNull`** — the map picker exists because these two are required, not
as decoration. `pickupAvailable` optional; the registration wizard always sends `true` (every
branch drafted through that modal is a pickup point). `BranchResponse` mirrors the request plus
`id`, `businessId`, `cityName`. **Registration wizard branches travel inline as
`SellerOnboardingRequest.pickupBranches: CreateBranchRequest[]`** (same shape, different
envelope) — this standalone endpoint is for the cabinet's Branches tab only.

## Unique Offers
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/business-admin/offers | OWNER | Unique Offers tab |
| POST | /api/v1/business-admin/offers | OWNER | Create offer |
| PATCH | /api/v1/business-admin/offers/{id} | OWNER | Update offer |
| DELETE | /api/v1/business-admin/offers/{id} | OWNER | Delete offer |

## Staff & Invites (Company Dashboard)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET/POST | /api/v1/businesses/{bId}/branches/{brId}/staff | OWNER/MANAGER | Staff list / create |
| POST | /api/v1/businesses/{bId}/branches/{brId}/staff/{id}/update | OWNER/MANAGER | Update role/status |
| POST | /api/v1/businesses/{bId}/branches/{brId}/staff/{id}/reset-password | OWNER | Reset password |
| GET/POST/DELETE | /api/v1/businesses/{bId}/branches/{brId}/invites | OWNER/MANAGER | Invites |

## Members & Invitations (business-scoped — backend added 2026-07-18)
The new business-scoped member/invitation API. Sits alongside the older branch-scoped
Staff & Invites above; prefer these for company-level people management.

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/members | OWNER/MANAGER | Members list (email, displayName, role, status) |
| PATCH | /api/v1/businesses/{businessId}/members/{membershipId} | OWNER | Change role (never to/from OWNER) |
| POST | /api/v1/businesses/{businessId}/members/{membershipId}/deactivate | OWNER (MANAGER may deactivate a WORKER) | Deactivate (OWNER protected) |
| POST | /api/v1/businesses/{businessId}/invitations | OWNER (MANAGER/WORKER), MANAGER (WORKER only) | Invite by email |
| GET | /api/v1/businesses/{businessId}/invitations | OWNER/MANAGER | List invitations |
| DELETE | /api/v1/businesses/{businessId}/invitations/{invitationId} | OWNER/MANAGER | Revoke pending invite |
| GET | /api/v1/me/invitations | Bearer | My pending invitations (invitee side) |
| POST | /api/v1/me/invitations/{invitationId}/accept | Bearer | Accept → creates ACTIVE membership |
| POST | /api/v1/me/invitations/{invitationId}/decline | Bearer | Decline |

## Seller Onboarding — **CONSUMED** since 2026-07-27 (`/app/business/register`)

> **Corrected 2026-07-27.** The entry below previously read `POST /api/v1/seller/onboarding`
> with a `catalogScope` of `PRODUCTS | SERVICES | BOTH`, and an error code of
> `SELLER_ONBOARDING_INVALID`. None of those names exist in the backend — they were
> written from the 2026-07-18/19 changelog before the endpoint was read, and the
> 2026-07-21/22 domain cleanup renamed the module. The values below are read from
> `kz.ask.business.onboarding.api.*` and were exercised against it.

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/business/onboarding | Bearer | `BusinessRegisterPage` — create Business + BusinessProfile + OWNER membership + a verification record, in one transaction |

**`SellerOnboardingRequest`** — required: `businessName`, `countryCode`, `legalForm`,
`catalogSetupMode`, `businessScope`, `deliveryCoverage`, `pickupAvailable`, and EITHER
`categoryId` OR a non-blank `categoryName`.

> **Corrected 2026-07-28.** `deliveryCoverage`, `deliveryCities`, `pickupAvailable` were
> missing from this doc and from the client until this date — `SellerOnboardingRequest`
> declares them `@NotNull` (`deliveryCoverage`, `pickupAvailable`), so every submission
> before this date would 400 against the real backend. Read directly from
> `kz.ask.business.onboarding.api.dto.SellerOnboardingRequest` on `dev` (`ee542d9`), not
> inferred. There is no vision entry for delivery/pickup (P9.1) — the fields are backend-
> required, not product-described; raised as a doc gap, built anyway because the endpoint
> is otherwise unusable.
>
> **Corrected 2026-07-29 (backend commit `9a90f5c`).** Two more gaps closed:
> 1. `pickupBranches?: CreateBranchRequest[]` — `@AssertTrue` now 400s
>    `pickupAvailable: true` with this empty/absent ("At least one pickup branch
>    is required when pickup is enabled"), confirmed live. Branches, business,
>    membership, profile, and verification commit in ONE transaction.
> 2. `catalogSetupMode` row below said "we send `MANUAL` only" — stale since
>    D29 (2026-07-29, owner directive, same day as this correction): `ASK_MANAGED_IMPORT`
>    is sent for real too. The row is fixed below.

| Field | Values | Notes |
|---|---|---|
| `businessScope` | `ITEM` · `SERVICE` · `BOTH` | NOT `PRODUCTS`/`SERVICES` — the module speaks `ITEM` |
| `legalForm` | `KZ_IP` · `KZ_TOO` · `NONE` | The form's one branch |
| `catalogSetupMode` | `MANUAL` · `ASK_MANAGED_IMPORT` | Both sent for real (D29) — `ASK_MANAGED_IMPORT` still lacks its own follow-up scoping screen (roadmap #8), but the field itself is not manual-only |
| `legalIdentifier`, `legalName` | — | REQUIRED for `KZ_IP`/`KZ_TOO`; identifier is exactly 12 digits (IIN / BIN) |
| `twoGisUrl` `kaspiUrl` `ozonUrl` `wildberriesUrl` `websiteUrl` `instagramUrl` `telegramUrl` | `^(?:https?://\S+)?$` | For `legalForm: NONE`, **at least one** must be non-blank |
| `deliveryCoverage` | `NO_DELIVERY` · `SELECTED_CITIES` · `KAZAKHSTAN` · `WORLDWIDE` | `kz.ask.business.profile.domain.enums.DeliveryCoverage`, `@NotNull` |
| `deliveryCities` | `string[]`, max 50 items, 120 chars each | REQUIRED (≥1 non-blank) only when `deliveryCoverage: SELECTED_CITIES`; free text, not the `/cities` picker used by branches |
| `pickupAvailable` | `boolean` | `@NotNull` — always sent |
| `pickupBranches` | `CreateBranchRequest[]`, max 50 | REQUIRED (≥1) only when `pickupAvailable: true` (`@AssertTrue`, confirmed live 2026-07-29). Each entry needs `name` + `latitude`/`longitude`; `pickupAvailable: true` set per-branch to match `CreateBranchRequest`'s own shape |
| `phone`, `corporateEmail` | — | Optional; not collected in V1 (no vision entry — P9.1) |

**`SellerOnboardingResponse`**: `businessId`, `catalogSetupMode`, `startRoute`
(`BUSINESS_CABINET` | `MANAGED_IMPORT`). **Its `startRoute` is deliberately not consumed** —
the client re-reads `GET /api/v1/auth/session` after a 201 and follows THAT `startRoute`,
because the session is the authority on where a role lands (auth slice lock) and it is the
value that just went stale.

**The role changes server-side.** A 201 promotes the caller from CUSTOMER to BUSINESS_OWNER.
Until the session is re-read, `canAccessDashboard` still answers false and
`RequireDashboardAccess` bounces the new seller out of the cabinet they just created — so
`useRefreshSession()` (`@/auth`) is part of the contract, not a nicety.

**`ASK_MANAGED_IMPORT` IS offered and submitted for real (2026-07-27→2026-07-29, reversed —
see business-cabinet/locks.md's Retired Locks).** Step 2's two catalog-setup cards are both real,
selectable choices; whichever `catalogSetupMode` the seller picks is what
`toOnboardingRequest` sends. This is valid: `ASK_MANAGED_IMPORT` is accepted by
`SellerOnboardingRequest` on its own (confirmed from the Java DTO). What is STILL missing is the
SEPARATE managed-import request dialog (`POST /api/v1/businesses/{businessId}/managed-imports`,
roadmap #8) for scoping/pricing an import after the fact — the UI is honest about that gap
("our team will follow up to confirm scope and price") rather than promising an instant quote or
a dialog that does not exist. A business created with `catalogSetupMode: ASK_MANAGED_IMPORT`
today has no further in-product screen; follow-up is manual/ops-side until roadmap #8 ships.

**Branches drafted during registration are real (2026-07-29), not part of this request.** Step
3's map picker collects `DraftBranch[]` client-side (`model.ts`); once `onboardSeller` resolves
with `businessId`, each drafted branch is POSTed individually via `api.createBranch` (see
Branches above), BEFORE the session refresh. A single branch failing does not undo the business
or block the redirect — it is reported via toast and can be retried once the Branches tab ships.

**Verification status is backend-derived:** `NONE` → the record is `PENDING`; a legal form →
`APPROVED`. The client never sets or displays a verification verdict.

### Registration (unauthenticated variant — NOT consumed)
`POST /api/v1/auth/business/register` also exists (business name, `businessScope`, category,
optional branch). ASK's flow always registers a business for an ALREADY authenticated
customer — the role modal only appears after a signup — so the Bearer endpoint above is the
one this client uses. Do not add the unauthenticated path without a vision entry.

## Catalog Setup status (backend added 2026-07-18)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/catalog-setup | Business member or assigned platform importer | Setup banner/gate |

- Status: `IN_PROGRESS` | `REVIEW_REQUIRED` | `COMPLETED` | `RESTRICTED` (7-day catalog deadline, `business.catalog.deadline` default P7D).
- **No manual completion endpoint** — moderation is platform-side (`/api/v1/platform/catalog-reviews`, no V1 business surface). Render status; never fake a "mark complete" button.

## Public reference
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/cities | No | Branch city picker |
| GET | /api/v1/categories?q=&type= | No | **CONSUMED** — the registration category combobox (`type=BUSINESS`) |

**Categories are FLAT** — one `type` (`BUSINESS` \| `ITEM` \| `SERVICE`), one `source`
(`SYSTEM` \| `USER`), no parents, no subcategories, no fallback tree. Response:
`{ suggestions: [{ categoryId, label, type, source }] }`.

Free text is a first-class outcome, not a fallback: onboarding accepts `categoryName` and
creates the `USER` category itself, so `POST /api/v1/categories` is NOT called from the
registration form. `type` is fixed per form — `BUSINESS` here, `ITEM` in `@/catalog`,
`SERVICE` in `@/services`; a shared type-parameterized picker would be one component serving
two callers that merely look alike (P6.3, D8).

## Key DTOs
- BranchDto: id, name, cityId, cityName, address, **addressDetails** (added 2026-07-18), onlineOnly, status
- StaffResponse: id, displayName, email, role, status, branchName, tempPassword (only while pending)
- CreateStaffRequest: name, role (default WORKER), login (email)
- MemberResponse: membershipId, email, displayName, role, status
- InvitationResponse: invitationId, email, role, status (business-scoped invites)
- UniqueOffer: id, businessId, name, description, type, status, discountPercent, discountAmount, currency, enabled, tags, startDate, endDate, coverUrl. M2M links to products / services / branches.
  - **Not yet reflected above — backend commit `9a90f5c` (2026-07-29), read but not built** (Offers tab is roadmap #6, unbuilt): `discountPercent`/`discountAmount` are optional and only meaningful when `type` is `DISCOUNT` — don't require them for other offer types. `coverUrl` is an ASK-managed upload (same pattern as business logo/cover, `locks.md`), never a client-supplied URL field, matching the "uploaded cover image" wording in the backend's own create-form spec.

## Errors surfaced (backend added 2026-07-18)
- INVITATION_NOT_FOUND / INVITATION_NOT_PENDING / INVITATION_EMAIL_MISMATCH / INVITATION_MEMBER_EXISTS / INVITATION_ROLE_NOT_ALLOWED — invite accept/create paths
- BUSINESS_MEMBER_NOT_FOUND / BUSINESS_MEMBER_ROLE_NOT_ALLOWED — member role/deactivate
- BRANCH_REQUIRED_FOR_WORKER — creating a WORKER without a branch
- BUSINESS_ONBOARDING_INVALID — onboarding payload rejected (category missing, or a legal
  form other than `NONE` with a blank `legalIdentifier`). **Corrected 2026-07-28** — this doc
  previously named it `SELLER_ONBOARDING_INVALID`, which does not exist anywhere in the
  backend; `hooks.ts` already had the real code right, only this doc was stale.
- BUSINESS_SCOPE_REQUIRED — also mapped by the client to the same generic message
- MANAGED_IMPORT_ACTIVE_EXISTS / MANAGED_IMPORT_FORBIDDEN — managed-import request

## Offer semantics (backend-owned)
DISCOUNT → effectivePrice = price × (1 − percent/100) or price − amount. Label: "-30%" / "-5000 ₸". Non-DISCOUNT → the offer name is the label. Linked results get a +25 search boost.

## Third-party (NOT AskBackend)
The branch map picker (`BranchMapModal.tsx`) calls OpenStreetMap's free, keyless **Nominatim**
service directly — `nominatim.openstreetmap.org/{search,reverse}` — for address search and
reverse-geocoding a dropped pin. Kept in this slice's `api.ts` anyway (`searchAddress`,
`reverseGeocode`) so the "components never call fetch directly" rule still has exactly one home,
even though this is not a backend contract and is not versioned with it.

**Both calls carry an 8 s deadline and `accept-language` (2026-07-31, review).** Nominatim
is a free service with no uptime promise, so an unbounded `fetch` can leave the search box
spinning until the tab closes; the deadline is combined with the caller's own abort signal so
whichever fires first wins. `accept-language` is passed per request (the app locale is
switchable at runtime, D18) because these strings are concatenated with KATO's ru/kk names —
a road name in OSM's default language would put two languages in one address.

**Narrowed 2026-07-31 (with `AddressSelect`, D30).** `reverseGeocode` now requests
`addressdetails=1` and returns the **street line only** (`address.road` + `address.house_number`),
falling back to `display_name` when OSM has no road for the pin — common for a rural point. It
used to return the whole `display_name`. The reason is the KATO cascade: the branch's oblast,
district and settlement now come from the state registry, so `"10, Абая көшесі, Алматы,
Қазақстан"` would repeat three levels the seller has already answered, in a transliteration that
need not even match theirs. The seller still edits the field freely.

**Where the composed address goes.** `CreateBranchRequest` has ONE `address` string and no
`country`/`state`/`region` fields (verified against `kz.ask.business.branch.api.dto`), so the
registry levels and the street line are joined into that one string by `formatKzAddress` —
widest first. No DTO field is invented (P9.4). ⚠ `cityId` is still **not** sent (AUDIT_1 B3);
`GET /api/v1/cities/resolve?name=` (`CityService.findByName`) is the endpoint that would turn
`KzPlace.placeName` into the required UUID — that is the next step for this flow, not part of
the D30 change.

## Not built yet
**Company Profile** has no endpoint set — the vision marks it "coming in a future update". Ship the placeholder, not a screen.
