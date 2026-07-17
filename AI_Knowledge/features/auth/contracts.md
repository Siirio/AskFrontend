# Auth — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/identity/contracts.md` and the DTO
source (`kz.ask.identity.api.dto.*`). The backend is the data authority — these
shapes are read, never invented (P9.4). Verified against the source 2026-07-15;
re-verified line-by-line against the Java source (controller, processors,
exception handler) AND end-to-end against the running backend 2026-07-17.

**Wire format (D20):** the backend serializes JSON in **snake_case**
(`access_token`, `auth_challenge_id`, `error_code`, …). Field names in this doc
are the Java/TS camelCase names; `shared/api` transforms keys at the transport
boundary, so slice code only ever sees camelCase.

## Endpoints consumed by slice #1 (the customer path)

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/auth/customer/register | No | Sign up (customer) → 201 AuthChallengeResponse |
| POST | /api/v1/auth/verify | No | 6-digit code confirming a **registration** → AuthSessionResponse |
| POST | /api/v1/auth/login | No | **Log in — email + password** → AuthSessionResponse (or a 2FA challenge) |
| GET | /api/v1/auth/session | Bearer | Session restore on app load (accessToken comes back null) |
| POST | /api/v1/auth/logout | Bearer | Sign out (the action lives here; surface is the profile card, UF 2.3) |

Sign up verifies the email with a 6-digit code; **log in is email + password**
(no code, unless the account has 2FA — then verify runs). `customer/login/start`
(passwordless OTP login) is NOT used in V1.

## Endpoints deferred (backend exists; built with the seller/staff paths, roadmap #7)

| Method | Path | Auth | Deferred to |
|--------|------|------|-------------|
| POST | /api/v1/auth/customer/login/start | No | passwordless OTP login — not used in V1 (password login chosen) |
| POST | /api/v1/auth/select-role | No | multi-role selection (needs email+password; pairs with /auth/login) |
| POST | /api/v1/auth/business/register | No | business registration (UF 3.1 entry) |
| POST | /api/v1/auth/business/login/start | No | business OTP login |
| POST | /api/v1/auth/change-temporary-password | Activation session | staff first login |
| POST | /api/v1/auth/switch-role · change-password · toggle-2fa | Bearer | profile / cabinet |
| POST | /api/v1/auth/profile | Bearer | profile slice (#6) |
| GET | /api/v1/auth/email-info | No | login hint (not in the vision yet) |

## Request DTOs (slice #1)

- **CustomerRegisterRequest**: `displayName?`, `email`, `password` (8–128), `passwordConfirmation` (must equal password — backend `@AssertTrue`), `acceptedUserAgreement` (must be true — backend `@AssertTrue`), `rememberMe?`
  - ⚠ `displayName` is optional in the DTO but **`app_user.display_name` is NOT NULL in the schema** — omitting it makes `verify` fail with 409 `DATA_CONFLICT` (proven live 2026-07-17). The form therefore REQUIRES the name until backend reconciles DTO and schema. Raised with backend.
- **LoginRequest**: `email`, `password` (both `@NotBlank`)
- **VerifyCodeRequest**: `authChallengeId` (UUID), `code` (`\d{6}`)

## Response DTOs

- **AuthChallengeResponse**: authChallengeId, role, purpose, channel, maskedDestination, expiresAt, **code?** (populated ONLY in backend verification test-mode; prod omits it and emails the code)
- **AuthSessionResponse**: accessToken, tokenType, expiresAt, remembered, activationRequired, role, startRoute, user (AuthUserResponse), business? (AuthBusinessContextResponse), requiresRoleSelection?, availableRoles? (RoleOption[]), allRoles? (string[]), requiresTwoFactor?, authChallengeId?, **suggestRoleExpansion?** (set after a new single-role signup → the role-modal trigger)
  - GET /session returns this with `accessToken: null`; `role` is the bare enum name ("CUSTOMER") rather than the authority ("ROLE_CUSTOMER") returned by verify — the client maps both (`roleToKind`).
- **AuthUserResponse**: userId, displayName (**nullable** — registration accepts an empty name and the backend stores null), email, status — **no `phone`** (removed from AppUser in backend V8; identity lock)
- **AuthBusinessContextResponse**: businessId, businessName, branchId, branchName, membershipId, memberRole
- **RoleOption**: userId, role, displayName
- **LogoutResponse**: success

## startRoute → route

CLIENT_SEARCH → `/app` · OWNER_BRANCHES → `/app/business` · BRANCH_WORKSPACE → `/app/business`

## Errors surfaced (via ApiError.errorCode / status)

- EMAIL_ALREADY_REGISTERED (409, register) → "this email is already registered"
- INVALID_CREDENTIALS / 401 (login) → "incorrect email or password"
- ACCOUNT_NOT_ACTIVE (403, login — blocked/deleted account) → "account is not active"
- a failed verify (wrong/expired code: CHALLENGE_NOT_FOUND 404, CHALLENGE_EXPIRED / CHALLENGE_MAX_ATTEMPTS / CHALLENGE_INVALID_CODE 400) → "code invalid or expired"
- otherwise → generic network error + a toast

**Not an error code:** a 200 login response may instead carry
`requiresRoleSelection` (multi-role account — NO user, NO token, NO startRoute).
V1 surfaces it as a form-level error; `select-role` stays deferred (roadmap #7)
and an empty session is never applied as a sign-in (P9.4).

**Session restore:** `GET /session` failing with 401/403 means the backend
rejected the token → it is cleared. A network failure or 5xx says nothing about
the token — it is kept for the next load; the session renders unauthenticated.
