# Profile — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/identity/contracts.md`

## Session & profile
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/auth/session | Bearer | Profile card (name, role, business context) |
| POST | /api/v1/auth/profile | Bearer | Settings — update displayName / email / phone |
| POST | /api/v1/auth/logout | Bearer | Sign out (the call itself belongs to `@/auth`) |

## Customer requests (surfaced in the profile area)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/requests | CUSTOMER | My requests — owned by `@/requests`, embedded here |

## Key DTOs
- AuthUserResponse: userId, displayName, email, phone, status
- AuthBusinessContextResponse (business roles only): businessId, businessName, branchId, branchName, membershipId, memberRole

## Not built yet
Customer preferences (sizes, style, budget, city, favorite brands) exist in the backend model but have **no V1 surface in PRODUCT_VISION.md**. Do not build a preferences screen until the vision adds one (P9.1).
