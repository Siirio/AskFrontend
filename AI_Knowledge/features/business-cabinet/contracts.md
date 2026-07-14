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

## Public reference
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/cities | No | Branch city picker |
| GET | /api/v1/categories | No | Category pickers |

## Key DTOs
- BranchDto: id, name, cityId, cityName, address, onlineOnly, status
- StaffResponse: id, displayName, email, role, status, branchName, tempPassword (only while pending)
- CreateStaffRequest: name, role (default WORKER), login (email)
- UniqueOffer: id, businessId, name, description, type, status, discountPercent, discountAmount, currency, enabled, tags, startDate, endDate, coverUrl. M2M links to products / services / branches.

## Offer semantics (backend-owned)
DISCOUNT → effectivePrice = price × (1 − percent/100) or price − amount. Label: "-30%" / "-5000 ₸". Non-DISCOUNT → the offer name is the label. Linked results get a +25 search boost.

## Not built yet
**Company Profile** has no endpoint set — the vision marks it "coming in a future update". Ship the placeholder, not a screen.
