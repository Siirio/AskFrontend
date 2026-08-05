# Auth — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/identity/contracts.md` and the DTO
source (`kz.ask.identity.api.dto.*`). The backend is the data authority — these
shapes are read, never invented (P9.4). Verified against the source 2026-07-15;
re-verified line-by-line against the Java source (controller, processors,
exception handler) AND end-to-end against the running backend 2026-07-17.

**Wire format (D20):** the backend serializes JSON in **snake_case**
(`access_token`, `verification_id`, `error_code`, …). Field names in this doc
are the Java/TS camelCase names; `shared/api` transforms keys at the transport
boundary, so slice code only ever sees camelCase.

> ## ⚠ 2026-07-27 — THIS CLIENT TARGETS THE BACKEND'S `dev` BRANCH (owner decision)
>
> The backend has two live shapes and they disagree. `../Ask_Backend` is checked out on
> **`dev`**; the server on `localhost:2020` is still built from **`master`**. The owner's
> call is to build against **`dev`**, because that is what will be deployed.
>
> | | `dev` — **our target** | `master` — what :2020 runs today |
> |---|---|---|
> | verify id field | **`verificationId`** | `authChallengeId` |
> | seller onboarding | **`POST /api/v1/business/onboarding`** (Bearer) | does not exist — **404** |
> | `GET /categories` | **flat**: `{suggestions:[{category_id,label,type,source}]}` | tree: `{id,name,slug,parent_id,children}` |
> | business registration | the authenticated onboarding above | `POST /api/v1/auth/business/register` (unauthenticated, creates the whole account) |
>
> **CONSEQUENCE, stated so it is not rediscovered as a bug:** against the CURRENT :2020
> build, sign-up's verify step and the whole of `/app/business/register` will fail. That is
> the branch gap, not a defect in this client, and it clears when the backend redeploys
> from `dev`. The verify failure now surfaces as its own message ("that request was
> rejected… a fault on our side") instead of the misleading "the code is invalid or
> expired" — see `VALIDATION_ERROR` in `hooks.ts`.
>
> **How this was established — and the lesson.** Both shapes were confirmed by curling the
> RUNNING server, not by reading a checkout. Reading the `dev` source tree alone produced a
> confident "correction" of `authChallengeId` → `verificationId` that broke sign-up on the
> spot; the live server answered `400 VALIDATION_ERROR` naming `authChallengeId`. Neither
> source is sole authority: **the checkout says where we are going, the running server says
> what works right now, and you need both.** Record which branch you confirmed against.
>
> ```bash
> curl -s -X POST localhost:2020/api/v1/auth/customer/register \
>   -H 'Content-Type: application/json' \
>   -d '{"display_name":"P","email":"p@x.com","password":"Password123!","password_confirmation":"Password123!"}'
> ```
>
> In the `local` profile `test-mode: true`, so the response carries the plaintext `code`
> and an UNMASKED email — that alone tells you which mode you are in.
>
> **What held on BOTH branches, so the fix built on it stands:** `suggestRoleExpansion` is
> never assigned anywhere (`git grep` finds nothing on master; declared-but-never-built on
> dev), and the live verify response confirms `suggest_role_expansion: null`. The live
> register response does return `"purpose":"REGISTER"`. See "Role modal trigger" below.
>
> **Open, dev-only:** `dev`'s `CustomerRegisterRequest` drops `acceptedUserAgreement` and
> renames `rememberMe` → `isRememberMe`. `master` still accepts the consent field, so the
> consent stops being recorded the moment dev deploys. Backend/product question.
>
> **Re-confirmed 2026-07-29** against `../Ask_Backend` `dev` @ `9a90f5c`, run locally
> (`mvn spring-boot:run -Dspring-boot.run.profiles=local`) against a freshly-migrated
> local Postgres: `verification_id` (not `authChallengeId`), the onboarding endpoint,
> and the flat `/categories` shape all confirmed live. **This does not mean `:2020`
> stays on `dev` forever** — it reflects whichever checkout/branch was last used to
> start it. `:2020` is a local port, not a shared server; before trusting this table,
> confirm what's actually running with the same curl-the-server method (see
> `[[backend-dev-vs-master-split]]`), don't assume from a prior session's notes.

## Endpoints consumed by slice #1 (the customer path)

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/auth/customer/register | No | Sign up (customer) → 201 AuthChallengeResponse |
| POST | /api/v1/auth/verify | No | 6-digit code confirming a **registration** → AuthSessionResponse |
| POST | /api/v1/auth/login | No | **Log in — email + password** → AuthSessionResponse (or a 2FA challenge) |
| GET | /api/v1/auth/session | Bearer | Session restore on app load — returns a **freshly-issued** `access_token` + `expires_in` every call (see below) |
| POST | /api/v1/auth/logout | Bearer | Sign out (the action lives here; surface is the profile card, UF 2.3) |

Sign up verifies the email with a 6-digit code; **log in is email + password**
(no code, unless the account has 2FA — then verify runs). `customer/login/start`
(passwordless OTP login) is NOT used in V1.

## Legal consent (customer path — 2026-07-30)

`POST /api/v1/legal/registration-acceptances` (Bearer, `LegalController#acceptRegistration`)
records consent once the session exists.

> ### 🔴 FIXED 2026-08-05 — `countryCode` was never sent, so EVERY consent write 400'd
>
> `AcceptLegalDocumentsRequest` requires all three fields — `documentCodes` `@NotEmpty`,
> **`countryCode` `@NotBlank @Size(min=2,max=2)`**, `locale` `@NotBlank`. Our request type
> carried only `documentCodes` and an optional `locale`, so the backend answered
> `400 VALIDATION_ERROR: countryCode не должно быть пустым` to every single call.
>
> **Nothing surfaced it.** `recordRegistrationConsent` catches, toasts a generic network error
> and proceeds — correctly, because a legal write must never strand a valid account — so
> registration always succeeded and the record was simply never written. It appeared only as a
> red line in browser devtools, which is where the owner found it.
>
> **AUDIT_1 A1 called the coverage half "closed" on the strength of the call being MADE.** It
> checked that every registration path fires the request; it never checked that the request was
> accepted. The e2e stub answered `204` to any body, so the suite agreed. Both are now fixed:
> the client sends `countryCode: "KZ"` (`REGISTRATION_COUNTRY_CODE`), and the stub VALIDATES
> the three required fields and 400s otherwise, so this cannot regress silently.
>
> Verified against the running backend, not inferred: without `countryCode` → 400, with it → 204.

**`LegalController` exposes exactly two endpoints, and they differ only by CHANNEL** (added
2026-08-02, AUDIT_2 N6 — the sibling was in no frontend doc). Both take the same
`AcceptLegalDocumentsRequest` (`documentCodes`, `countryCode`, `locale`), both return `204`,
and both delegate to one `legalService.acceptActiveDocuments(...)`:

| Path | `LegalAcceptanceChannel` | Who calls it |
|---|---|---|
| `POST /api/v1/legal/registration-acceptances` | `WEB_REGISTRATION` | `recordRegistrationConsent()` — email verify and the OAuth callback (below) |
| `POST /api/v1/legal/acceptances` | `ACCOUNT_SETTINGS` | **Nothing yet.** It is the channel for the consent GATE and for any future profile/settings re-acceptance |

Pick the endpoint by the moment, not by convenience: the channel is stored on `LegalAcceptance`,
so calling the registration path from a settings screen would falsify the record of *where* the
person agreed. **There is no GET on either** — the module is write-only, which is what blocks the
consent gate (AUDIT_2 N7, and § *Cross-Repo Dependencies* in `ROADMAP.md`).

> ### ⚠ MOVED 2026-08-01 — it now fires from `useVerifyStep`, not the role modal
>
> It used to be called from `RoleSelectionModal.confirm()` **only when the customer card was
> answered**. That location caused two defects at once:
>
> 1. **Choosing "business" dropped the consent permanently.** Seller onboarding records
>    `SELLER_TERMS`/`PERSONAL_DATA_CONSENT`, never these two — so nobody who picked "business"
>    ever had their Terms/Privacy acceptance recorded, anywhere.
> 2. **Google sign-ups had consent recorded for text they were never shown.** The modal also
>    opens for a first-time OAuth sign-up (`?registration=1`), and that flow presents no
>    agreement checkbox at all. This file already warned that sending codes for unseen documents
>    would be "a worse defect than the one being fixed" (P9.4) — and it was happening.
>
> The consent belongs to REGISTRATION, not to a role answer. It now fires from
> `useVerifyStep` immediately after a successful `verify` whose challenge `purpose === "REGISTER"`
> — the first moment a Bearer token exists, and the email sign-up is the only path that shows
> the checkbox. `documentCodes: ["USER_TERMS", "PRIVACY_POLICY"]`, `locale` from `useLocale()`.
> Still best-effort: a failure toasts `errors.network` and the flow continues, because stranding
> someone on the verify screen with a valid account is worse than a missed record.
>
> **CLOSED 2026-08-01 (owner directive) — the OAuth buttons got consent copy, so the record
> became honest to write.** `OAuthOptions` now renders a consent line beside the Google button
> naming the same two documents and linking the same `/terms` and `/privacy` routes, and
> `useOAuthCallback` records `USER_TERMS` + `PRIVACY_POLICY` when the callback carries
> `?registration=1`. Both call the one `recordRegistrationConsent()` (P6.2) — same documents,
> same best-effort semantics, no caller-type flag (P6.3).
>
> **The copy is on the LOGIN page too, and that is the load-bearing detail.** Google sign-in
> registers: `CustomOAuth2UserService` does `registrationRequired = user == null` and then
> `identityService.createUser(...)`, so an unknown email creates an account from the Log-in
> page exactly as from Sign up. Putting the copy only under Sign up would have left the more
> common entry point consenting to nothing.
>
> It is PASSIVE consent (a statement of consequence), not a checkbox: the click itself is the
> agreement, and a checkbox gating a link would be a second consent grammar for the same two
> documents. The email form keeps its checkbox, which gates a form it can actually block.

**The "business" answer does NOT call this endpoint here.** Choosing "business" only
starts seller onboarding (routes to `/app/business/register`); per the backend's identity
docs, `SELLER_TERMS`/`PERSONAL_DATA_CONSENT` belongs to that onboarding's own completion.
That call is **not yet built** — it is `business-cabinet`'s gap, not this slice's, and is
flagged here so it isn't lost: whoever finishes the seller onboarding wizard needs to add
the equivalent `acceptRegistrationLegal({ documentCodes: ["SELLER_TERMS",
"PERSONAL_DATA_CONSENT"] })` call at the wizard's completion step.

`CustomerRegisterRequest` has no `acceptedUserAgreement` field on `dev` (only
`countryCode`/`locale`, defaulted "KZ"/"ru"). **Fixed 2026-08-01:** the client no longer posts
it — the field was being sent and silently dropped by Jackson. The checkbox stays as a
client-side gate (P9.4 — no sign-up passes without agreeing); the consent RECORD comes from the
call above. The same change started sending `countryCode` and `locale` for real, so an account
is no longer stamped with the backend's `"ru"` default in a product whose own default locale
is `kk`.

## Endpoints deferred (backend exists; built with the seller/staff paths, roadmap #6)

| Method | Path | Auth | Deferred to |
|--------|------|------|-------------|
| POST | /api/v1/auth/customer/login/start | No | passwordless OTP login — not used in V1 (password login chosen) |
| POST | /api/v1/auth/business/register | No | business registration (UF 3.1 entry) |
| POST | /api/v1/auth/business/login/start | No | business OTP login |
| POST | /api/v1/auth/change-temporary-password | Activation session | staff first login |
| POST | /api/v1/auth/email-change/request · /email-change/confirm | Bearer | profile — validate + email a code to the new address, then confirm + revoke old sessions |
| POST | /api/v1/auth/password-change/request · /password-change/confirm | Bearer | profile — two-step: validate current password + email a code, then confirm (preserves the current session, revokes the rest) |
| POST | /api/v1/auth/two-factor/request · /two-factor/confirm | Bearer | profile — two-step: email a code for the target enabled/disabled state, then confirm |
| POST | /api/v1/auth/profile | Bearer | profile slice (#6) |

**Corrected 2026-07-30** — the previous version of this table named
`/auth/select-role`, `/auth/switch-role`, `/auth/change-password`, `/auth/toggle-2fa`, and
`/auth/email-info`: none of these exist in the current backend. The rows above are what
actually ships (`AuthController.java`, confirmed against `dev@2e06cbe`); `select-role` and
`switch-role` were removed along with `requiresRoleSelection` (see Response DTOs below).

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
- **Frontend (built):** the callback pipes that `getSession()` result straight through the existing `applySessionTo()` (stores the Bearer JWT, hydrates user/role/startRoute; a first-signup arms the role modal via the callback URL's `?registration=1`, see "Role modal trigger" below) → an OAuth login is identical to a password login from the next call on. The only httpClient change is a per-request `credentials?: RequestCredentials` option, set only on that one call.

Rejected: the fragment hand-off (`#access_token=…` puts a token in browser history) and
cookie-native auth (would break the token lock + the React Native path).

## Account lifecycle (backend added 2026-07-18 — consumed by profile #6, not auth)

`DELETE /api/v1/account` anonymizes the profile + user, deactivates memberships, revokes
sessions. Returns **409 `ACCOUNT_OWNER_TRANSFER_REQUIRED`** if the caller is the sole
business OWNER. There is no account *export* (the backend removed it). Documented in
`features/profile/contracts.md`.

## Request DTOs (slice #1)

- **CustomerRegisterRequest**: `displayName?`, `email`, `password` (8–128), `passwordConfirmation` (must equal password — backend `@AssertTrue`), `acceptedUserAgreement` (must be true — client-side gate only, see "Legal consent" above; the backend field it used to name no longer exists on `dev`)
  - ⚠ `displayName` is optional in the DTO but **`app_user.display_name` is NOT NULL in the schema** — omitting it makes `verify` fail with 409 `DATA_CONFLICT` (proven live 2026-07-17). The form therefore REQUIRES the name until backend reconciles DTO and schema. Raised with backend.
- **LoginRequest**: `email`, `password` (both `@NotBlank`)
- **VerifyCodeRequest**: **`verificationId`** (UUID, `@NotNull`), `code` (`\d{6}`) — renamed 2026-07-27, see the warning at the top

## Response DTOs

- **AuthChallengeResponse** (Java: `VerificationResponse`): **`verificationId`**, role, **`purpose`** (`VerificationPurpose` — `LOGIN` · `REGISTER` · `EMAIL_CHANGE`; set from `challenge.getPurpose().name()`), channel, maskedDestination, expiresAt, **code?** (populated ONLY in backend verification test-mode; prod omits it and emails the code)
- **AuthSessionResponse** (fully modelled client-side since 2026-08-01, including the four
  `SessionCapabilitiesProcessor` fields below): accessToken, tokenType, **expiresIn** (`expires_in`, token lifetime in seconds — added 2026-07-19), expiresAt, isRemembered, isActivationRequired, role, startRoute, user (AuthUserResponse), business? (AuthBusinessContextResponse), allRoles? (string[]), requiresTwoFactor?, **isTwoFactorEnabled** (sent on every response, added by the backend 2026-07-30 — not yet consumed anywhere, no security-settings screen exists in V1), **`verificationId?`** (the 2FA challenge id — renamed)

### Role modal trigger (corrected 2026-07-27, OAuth closed 2026-07-30)

`suggestRoleExpansion` was the documented trigger and was dead — declared on the DTO,
assigned nowhere; the backend has since **deleted the field from the DTO outright**
(2026-07-30). The modal is armed by **`purpose === "REGISTER"` on the challenge** for the
email sign-up path — real backend data, returned by `POST /auth/customer/register`.

A log-in 2FA challenge deliberately carries no purpose (`useLoginFlow` builds that Challenge
by hand from the login response), so signing in never re-opens a choice already answered.

**Google OAuth is now covered (closed 2026-07-30).** `OAuth2AuthSuccessHandler` appends
`?registration=1` to the callback redirect exactly when the Google sign-in created a new
account (`CustomOAuth2UserService`'s `registrationRequired` flag). `useOAuthCallback` reads
`new URLSearchParams(window.location.search).get("registration") === "1"` after a
successful token exchange and arms the modal from that — still real backend data, just
carried as a query param instead of a session field, since the exchange itself only
proxies `GET /session` and has no request body of its own to carry a flag in.

- ⚠ **CORRECTED 2026-08-01 — GET /session ALWAYS returns a real `access_token`.** This file
  said it "returns `accessToken: null` (the token is already stored)"; that is not what the code
  does. `AuthProcessor.currentSession` calls `jwtTokenService.issue(...)` and sets `expires_in`
  on every response, Bearer or bridge cookie alike. Since `applySessionTo` stores any token it
  receives, **every session restore rolls the token forward** — an undesigned but benign rolling
  refresh. Nothing reads `expires_in` yet. The OAuth bridge is therefore no longer the *only*
  call that returns a token; it is only the one that also CLEARS the cookie. `role` is the bare enum name ("CUSTOMER") rather than the authority ("ROLE_CUSTOMER") returned by verify — the client maps both (`roleToKind`).
- ⚠ **`role`/`startRoute` stay account-level and neutral even for a business owner** — verified live 2026-07-28: a login for an OWNER account returns `role: "CUSTOMER"`, `startRoute: "CLIENT_SEARCH"`, `all_roles: ["CUSTOMER"]`, WITH a populated `business` object (`member_role: "OWNER"`) and a matching `business_memberships` entry. The backend's business/role model lives separately from the account role (`business_member` table), so `role` never becomes `"OWNER"`/`"BUSINESS_OWNER"` on login. The client derives `AuthUser.kind` from `session.business.memberRole` (`toAuthUser`), NOT from `session.role` — `roleToKind(session.role)` would always resolve to `"customer"` for a real business owner and hide the Dashboard nav link (`canAccessDashboard`). `businessMemberships` (plural) is not yet consumed; today's UI only surfaces the single active `business` context.
- **AuthUserResponse**: userId, displayName (**nullable** — registration accepts an empty name and the backend stores null), email, **phone** (nullable — reinstated on AppUser by backend commit `9a90f5c`, 2026-07-29; now modelled client-side too)
- **AuthBusinessContextResponse**: businessId, businessName, **businessCategoryId, businessCategoryName, businessScope** (nullable — modelled 2026-07-30), branchId, branchName, membershipId, memberRole
- **LogoutResponse**: success
- **Populated on every response by `SessionCapabilitiesProcessor`; MODELLED since 2026-08-01**
  (they were previously listed here as "not yet modelled", and `platformMembership` was missing
  from this file entirely):
  `customerProfile: { isEnabled }` ·
  `businessMemberships: { membershipId, businessId, businessName, role, branchIds }[]` (plural —
  `session.business` is the single ACTIVE context, this is the full list; note the shape is
  `AuthBusinessMembershipResponse`, NOT `AuthBusinessContextResponse` as this file used to say) ·
  `platformMembership: { role, permissions }` (platform roles have no V1 surface, P9.1) ·
  `pendingInvitationsCount: number`. None is consumed in V1 — they are modelled so the contract
  can be checked against a response, not so UI can be built on them.

### `allRoles` semantics (backend commit `9a90f5c`, 2026-07-29)

`allRoles` is the deduplicated union of the personal AppUser role, every active
`businessMemberships[].role`, and `platformMembership.role` when present — a
backend lock now guarantees a field named `allRoles` can't quietly omit a work
context. It is informational only; context-specific authorization still comes
from `business`/`businessMemberships`/`platformMembership`, never from scanning
this array (unchanged from before — this just confirms the shape in writing).

## startRoute — received, not consumed

`startRoute` is on `AuthSessionResponse` and is modelled, because it is on the wire. **Nothing
branches on it.** Every authenticated entry — login, verify, the OAuth callback — goes to
`POST_AUTH_PATH` (`/app`, auth `model.ts`).

> **2026-08-01 (owner) — corrected, reversing what this section said the same day.**
> `AuthProcessor.resolveStartRoute()` and `LoginProcessor.resolveStartRoute()` are no-arg methods
> that `return "CLIENT_SEARCH";` for every account. That is **the backend implementing
> PRODUCT_VISION UF 1 step 3** ("Home + Role Choosing Modal", stated for every role) — not a
> resolver that lost its inputs.
>
> This section previously listed `OWNER_BRANCHES → /app/business` and
> `BRANCH_WORKSPACE → /app/business` as live mappings kept "so a future backend change needs no
> client edit". Both were deleted with `startRouteToPath`: values the vision says must never fire
> are not a contract to hold open (P8.2), and holding them open read to every subsequent reader as
> *the backend is missing something* — it produced AUDIT_1's A7, which filed a cross-repo
> dependency that does not exist.
>
> The seller path is a separate rule, not an exception: completing onboarding lands on
> `/app/business` (D26, business-cabinet's `POST_ONBOARDING_PATH`). `SellerOnboardingResponse`
> also carries a `startRoute`, and it is likewise not consumed — both of its values
> (`BUSINESS_CABINET`, `MANAGED_IMPORT`) name the same destination today, because the
> managed-import scoping screen is roadmap #7. When that screen ships with its own route, the
> branch is written then.

## Errors surfaced (via ApiError.errorCode / status)

- EMAIL_ALREADY_REGISTERED (409, register) → "this email is already registered"
- INVALID_CREDENTIALS / 401 (login) → "incorrect email or password"
- ACCOUNT_NOT_ACTIVE (403, login — blocked/deleted account) → "account is not active"
- a failed verify (wrong/expired code: CHALLENGE_NOT_FOUND 404, CHALLENGE_EXPIRED / CHALLENGE_MAX_ATTEMPTS / CHALLENGE_INVALID_CODE 400) → "code invalid or expired"
- otherwise → generic network error + a toast

**Session restore:** `GET /session` failing with 401/403 means the backend
rejected the token → it is cleared. A network failure or 5xx says nothing about
the token — it is kept for the next load; the session renders unauthenticated.
