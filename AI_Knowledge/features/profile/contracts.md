# Profile — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/identity/contracts.md`

## Session & profile
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/auth/session | Bearer | Profile card (name, role, business context) |
| POST | /api/v1/auth/profile | Bearer | Settings — update displayName / email (no phone — removed from AppUser in V8) |
| POST | /api/v1/auth/change-password | Bearer | Settings — `currentPassword` + `newPassword` |
| POST | /api/v1/auth/logout | Bearer | Sign out (the call itself belongs to `@/auth`) |

## Account deletion (backend added 2026-07-18)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| DELETE | /api/v1/account | Bearer | "Delete account" in settings |

- Anonymizes the profile + user, deactivates memberships, revokes sessions, deletes challenges.
- **409 `ACCOUNT_OWNER_TRANSFER_REQUIRED`** if the caller is the sole business OWNER — surface "transfer or delete your business first", don't retry.
- There is **no account export** (the backend removed it) — do not build an export control.
- Confirm the delete-account screen exists in PRODUCT_VISION before building it (P9.1).

## ~~Customer requests (surfaced in the profile area)~~ — REMOVED 2026-07-28

`GET /api/v1/requests` no longer exists: the backend deleted the `request` domain on
2026-07-21 and the feature was removed from the product on 2026-07-28
(`features/_archived/requests/`). **Do not build a "My requests" section.** It also never
appeared in PRODUCT_VISION UF 2.3, which lists the profile card as logo · name · settings ·
learn more · sign out — so it fails P9.1 independently of the backend.

## Key DTOs
- AuthUserResponse: userId, displayName, email, status (no `phone` — removed from AppUser in backend V8)
- AuthBusinessContextResponse (business roles only): businessId, businessName, branchId, branchName, membershipId, memberRole

## Not built yet
Customer preferences (sizes, style, budget, city, favorite brands) exist in the backend model but have **no V1 surface in PRODUCT_VISION.md**. Do not build a preferences screen until the vision adds one (P9.1).
