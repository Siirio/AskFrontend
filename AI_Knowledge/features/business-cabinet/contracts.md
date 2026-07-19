# Business Cabinet — Consumed Backend Contracts

Sources: `../Ask_Backend/AI_Knowledge/features/business/contracts.md`, `.../offers/contracts.md`

## Branches
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/branches | OWNER/MANAGER | Branches tab |
| POST | /api/v1/businesses/{businessId}/branches | OWNER | Add branch |
| PATCH | /api/v1/businesses/{businessId}/branches/{branchId} | OWNER | Update branch |

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

## Seller Onboarding (backend added 2026-07-18; catalogScope added 2026-07-19)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/seller/onboarding | Bearer | Create business + OWNER membership |

- **Request carries `catalogScope` = `PRODUCTS` | `SERVICES` | `BOTH`** (2026-07-19) — the seller declares what they sell.
- Response includes a managed-import `conversationId` when a managed import applies (open that chat).
- **Onboarding flow (backend ux-ui, 4 steps):** (1) products / services / both? → sets `catalogScope`; (2) prepare the catalog yourself, or request managed import? (3) if managed import: it explains the paid service, benefit, selected sources + links, notes, and contact channel BEFORE legal acceptance; (4) an existing business member skips this and goes straight to their cabinet (no second "create business" entry). Confirm the screen against PRODUCT_VISION UF 3.1 before building (P9.1).

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
| GET | /api/v1/categories | No | Category pickers |

## Key DTOs
- BranchDto: id, name, cityId, cityName, address, **addressDetails** (added 2026-07-18), onlineOnly, status
- StaffResponse: id, displayName, email, role, status, branchName, tempPassword (only while pending)
- CreateStaffRequest: name, role (default WORKER), login (email)
- MemberResponse: membershipId, email, displayName, role, status
- InvitationResponse: invitationId, email, role, status (business-scoped invites)
- UniqueOffer: id, businessId, name, description, type, status, discountPercent, discountAmount, currency, enabled, tags, startDate, endDate, coverUrl. M2M links to products / services / branches.

## Errors surfaced (backend added 2026-07-18)
- INVITATION_NOT_FOUND / INVITATION_NOT_PENDING / INVITATION_EMAIL_MISMATCH / INVITATION_MEMBER_EXISTS / INVITATION_ROLE_NOT_ALLOWED — invite accept/create paths
- BUSINESS_MEMBER_NOT_FOUND / BUSINESS_MEMBER_ROLE_NOT_ALLOWED — member role/deactivate
- BRANCH_REQUIRED_FOR_WORKER — creating a WORKER without a branch
- SELLER_ONBOARDING_INVALID — onboarding payload rejected
- MANAGED_IMPORT_ACTIVE_EXISTS / MANAGED_IMPORT_FORBIDDEN — managed-import request

## Offer semantics (backend-owned)
DISCOUNT → effectivePrice = price × (1 − percent/100) or price − amount. Label: "-30%" / "-5000 ₸". Non-DISCOUNT → the offer name is the label. Linked results get a +25 search boost.

## Not built yet
**Company Profile** has no endpoint set — the vision marks it "coming in a future update". Ship the placeholder, not a screen.
