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
| POST | /api/v1/auth/switch-role · toggle-2fa | Bearer | profile / cabinet |
| POST | /api/v1/auth/change-password | Bearer | profile — body is `currentPassword` + `newPassword` (backend clarified 2026-07-18) |
| POST | /api/v1/auth/profile | Bearer | profile slice (#6) |
| GET | /api/v1/auth/email-info | No | login hint (not in the vision yet) |

**Non-enumerating login-start (2026-07-18):** the public `login/start` responses no
longer reveal whether an email exists — a hint UX must not infer account existence
from the response (backend security fix). `email-info` stays out of the V1 vision.

## Google OAuth — REQUIRED on login + register (owner directive 2026-07-19)

Both prior gates are **CLEARED**: the flow is now in `PRODUCT_VISION.md` UF 1 (appended
2026-07-19), and the `Email-only auth` lock was reversed the same day (`locks.md`). Google
OAuth is a **required** sign-in method on BOTH the Log in and Sign up pages, alongside
email+password. The backend **shipped the token bridge on 2026-07-19** (Final Major Update),
so the frontend is fully unblocked — code follows the docs below.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | /oauth2/authorization/google | No | Start OAuth. Reuses the single identity for a verified email, else creates a customer identity |
| GET | /login/oauth2/code/google | Google callback | Backend-side. Creates a revocable server session, writes the single-use `ASK_SESSION` **bridge cookie**, redirects to `OAUTH2_FRONTEND_REDIRECT_URI` |
| GET | /api/v1/auth/session | Bearer **or** bridge cookie | Under the bridge cookie: validates the session, returns the HS256 JWT (`access_token` / `token_type` / `expires_in`), and **clears `ASK_SESSION`**. This is the OAuth exchange call |

**Callback path settled (2026-07-19):** the redirect target is **`/oauth/callback`**
(top-level, NOT under `/app`) → the frontend route is `src/app/oauth/callback/page.tsx`.
Backend defaults now aligned: dev `http://localhost:3000/oauth/callback`, prod
`https://ask.com.kz/oauth/callback`; `ASK_FRONTEND_BASE_URL` → `:3000` in dev. **Stage must
override** `OAUTH2_FRONTEND_REDIRECT_URI` to the stage frontend (a single env var — else
stage OAuth bounces to prod). The top-level route sits under the ROOT layout, so it gets
`AuthProvider` but only `defaultLocale` (ru) copy (D6) — acceptable for a transient
"signing you in…" page.

**Token hand-off — option 2 (cookie→token exchange); the backend SHIPPED it 2026-07-19.**
The app stays **Bearer-token** based (`ask.accessToken`, token lock — cross-platform, D5); the
`ASK_SESSION` cookie is only a single-use OAuth bootstrap, never the app's auth model. The
confirmed exchange (backend identity ux-ui-flow):

1. Google → backend callback → backend creates a **revocable server session**, writes `ASK_SESSION`, redirects to `/oauth/callback`.
2. `/oauth/callback` calls `GET /api/v1/auth/session` **with credentials** → backend validates the cookie session, returns the HS256 JWT (`access_token`, `token_type=Bearer`, `expires_in`), and **clears `ASK_SESSION`**.
3. Every later request is pure Bearer, no cookie.

- **Backend task: DONE** (was the only blocker). CORS `allowCredentials(true)` on `/api/**` (`CorsConfig.java`) makes the credentialed call work.
- **Frontend (to build):** the callback pipes that `getSession()` result straight through the existing `applySessionTo()` (stores the Bearer JWT, hydrates user/role/startRoute; `suggestRoleExpansion` arms the role modal exactly like verify) → an OAuth login is identical to a password login from the next call on. The only httpClient change is a per-request `credentials?: RequestCredentials` option, set only on that one call.

Rejected: the fragment hand-off (`#access_token=…` puts a token in browser history) and
cookie-native auth (would break the token lock + the React Native path).

## Account lifecycle (backend added 2026-07-18 — consumed by profile #6, not auth)

`DELETE /api/v1/account` anonymizes the profile + user, deactivates memberships, revokes
sessions. Returns **409 `ACCOUNT_OWNER_TRANSFER_REQUIRED`** if the caller is the sole
business OWNER. There is no account *export* (the backend removed it). Documented in
`features/profile/contracts.md`.

## Request DTOs (slice #1)

- **CustomerRegisterRequest**: `displayName?`, `email`, `password` (8–128), `passwordConfirmation` (must equal password — backend `@AssertTrue`), `acceptedUserAgreement` (must be true — backend `@AssertTrue`), `rememberMe?`
  - ⚠ `displayName` is optional in the DTO but **`app_user.display_name` is NOT NULL in the schema** — omitting it makes `verify` fail with 409 `DATA_CONFLICT` (proven live 2026-07-17). The form therefore REQUIRES the name until backend reconciles DTO and schema. Raised with backend.
- **LoginRequest**: `email`, `password` (both `@NotBlank`)
- **VerifyCodeRequest**: `authChallengeId` (UUID), `code` (`\d{6}`)

## Response DTOs

- **AuthChallengeResponse**: authChallengeId, role, purpose, channel, maskedDestination, expiresAt, **code?** (populated ONLY in backend verification test-mode; prod omits it and emails the code)
- **AuthSessionResponse**: accessToken, tokenType, **expiresIn** (`expires_in`, token lifetime in seconds — added 2026-07-19), expiresAt, remembered, activationRequired, role, startRoute, user (AuthUserResponse), business? (AuthBusinessContextResponse), requiresRoleSelection?, availableRoles? (RoleOption[]), allRoles? (string[]), requiresTwoFactor?, authChallengeId?, **suggestRoleExpansion?** (set after a new single-role signup → the role-modal trigger)
  - GET /session under a **Bearer** token returns `accessToken: null` (the token is already stored); under the **OAuth bridge cookie** it returns a REAL `access_token` (the exchange). `role` is the bare enum name ("CUSTOMER") rather than the authority ("ROLE_CUSTOMER") returned by verify — the client maps both (`roleToKind`).
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
