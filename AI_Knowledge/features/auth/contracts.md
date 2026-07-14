# Auth — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/identity/contracts.md`

## Customer Auth
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/auth/customer/login/start | No | Log in (customer) |
| POST | /api/v1/auth/customer/register | No | Sign up (customer) |
| POST | /api/v1/auth/verify | No | 6-digit code → AuthSessionResponse |
| POST | /api/v1/auth/login | No | Unified login, all roles (email + password) |

## Business Auth
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/auth/business/login/start | No | Log in (business) |
| POST | /api/v1/auth/business/register | No | Business registration (UF 3.1 entry) |
| POST | /api/v1/auth/change-temporary-password | Activation session | Staff first login |

## Session
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/auth/session | Bearer | Session restore on app load |
| POST | /api/v1/auth/logout | Bearer | Sign out (profile card, UF 2.3) |

## Key DTOs
- AuthChallengeResponse: authChallengeId, role, purpose, channel, maskedDestination, expiresAt
- AuthSessionResponse: accessToken, tokenType, expiresAt, remembered, role, user, business (optional), startRoute
- AuthUserResponse: userId, displayName, email, phone, status
- AuthBusinessContextResponse: businessId, businessName, branchId, branchName, membershipId, memberRole
- startRoute: CLIENT_SEARCH | OWNER_BRANCHES | BRANCH_WORKSPACE → the route the session lands on
