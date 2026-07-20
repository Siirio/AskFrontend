# Auth — Screens & Flow

Traces PRODUCT_VISION **UF 1** (Landing → Authorization → Home + Role Choosing Modal).

## Screens

| Screen | Route | Rendering |
|--------|-------|-----------|
| Log in page | /app/auth/login | client (thin server route) |
| Sign up page | /app/auth/register | client (thin server route) |
| Verify code step (shared by both) | inline on either page after the challenge | client |
| OAuth callback (Google) | /oauth/callback (top-level, transient) | client — exchanges the cookie session for a Bearer token, then redirects to startRoute |
| Role Choosing Modal | over EVERY /app/* route — hosted by the platform layout (auth routes included, 2026-07-18), follows the SESSION not a page; persistent and non-dismissable until answered | client |

`/app/auth` redirects to `/app/auth/login`. The two pages are separate routes
(not a tab switcher), each with a cross-link to the other.

Layout: a `max-w-md` card centred in the viewport, sharing an `AuthShell` that
holds ONE column — the ASK wordmark (`public/logo_horizontal.svg`), the heading +
subtitle, the language switcher (ru/kk/en) + theme toggle (light/dark/system)
sitting BETWEEN the heading and the form, the form, and the cross-link.
**Standalone: no app nav** — the nav lives in the `(main)` route group's layout
and auth sits outside it. Quiet chrome; the submit is the only accent-filled
action (the cross-link and logo aside). The two controls are domain-free
`shared/ui` chrome (`theme-toggle`, `language-switcher`) driven by the theme
store (D17) and the platform LocaleProvider (D18); their active option is a quiet
sunken fill, never the accent.

**Mobile-first, and it is load-bearing:** base classes target the smallest screen
and `sm:` scales up — never the other way round. Two rules the layout must not
lose: the outer wrapper keeps `px-4` at EVERY width, so the card can never touch
the screen edge once the viewport drops under `max-w-md`; and `min-h-svh` (small
viewport height, not `100vh`) centres it vertically without the mobile URL-bar
jump — as a *min* height, the tall register form grows the wrapper instead of
overflowing off-screen. Inputs and buttons are ≥ 44px with `text-base` (which
also stops iOS zoom-on-focus); the controls row wraps rather than overflows.

**Password visibility:** every password field carries an in-field eye toggle
(`PasswordInput`, slice-private per the D8 rule of three) — a 44px hit area at
the field's end, `Eye`/`EyeOff` lucide icons, show/hide labels in ru/kk/en. On
the register form password and confirmation share ONE visibility state: either
eye flips both fields together (owner request 2026-07-17); login owns its own.

**The agreement row:** "I agree to the *Terms of Service* and *Privacy Policy*",
rendered with next-intl `t.rich` so each locale places its own links. It is
deliberately NOT wrapped in a `<label>` — a label would toggle the checkbox when
a link is clicked — so the checkbox carries its own `aria-label` (a link-free
version of the sentence). **Known gap:** `/terms` and `/privacy` do not exist yet
and 404 until the landing (roadmap #10) builds them; the legal copy is the
owner's to write, never invented here (tracked in ROADMAP "Parked fixes").

## Flow

1. Landing (`/`) → Authorization Page.
2. **Log in:** email + password → `POST /auth/login` → session directly (or, if the account has 2FA, a challenge → the 6-digit verify step). No email code on log-in.
   **Sign up:** name, email, password (+ confirm), accept agreement → `customer/register` issues a challenge → 6-digit code → `verify` creates the account. (Name is REQUIRED in the form even though the DTO marks it optional: `app_user.display_name` is NOT NULL in the backend schema, so a nameless registration always fails at verify — proven live 2026-07-17, raised with backend; relax when they fix it.)
3. On verify success the session (token) is stored, the page navigates to the backend's **`startRoute`** (`startRouteToPath`), and:
   - if `suggestRoleExpansion` → the **Role Choosing Modal** opens OVER `/app`. It has NO close button, ignores ESC and outside clicks, and survives navigation and reload (the pending flag lives in localStorage + the auth store) — the ONLY way out is answering: a role card (customer preselected — search is the mission) + one accent Continue. Customer → `/app`; business → `/app/business`.
   - The pending flag is dropped when the session ends (sign-out, or the backend rejecting the token).
4. Role decides the surface: customer → Home/search (UF 2.x); business owner → business registration then the cabinet (UF 3.1). `startRoute` from the backend is the authority for where the session lands.

**Placement:** the vision draws the modal over Home (`/app`), and it renders
there — but `RoleSelectionModal` (exported from `@/auth`) is mounted by the
PLATFORM layout, one level above the `(main)` group, and self-drives from the
auth store: it renders over whatever `/app/*` page is on screen, auth routes
included (2026-07-18 — mounting it only in `(main)` let browser-back to
`/app/auth/*` escape the undismissable choice). When `search` lands on `/app`
(roadmap #2), nothing moves.

**Modal anatomy (owner reference, 2026-07-17):** title + description, a
two-card radiogroup (icon badge, label, hint — arrow keys move selection), and
one full-width Continue. Selected card = accent BORDER over a low-chroma
`accent/10` tint (selection is actionable; the tint stays information-quiet);
Continue is the single saturated fill (saturation-is-action holds).

## Google sign-in (owner directive 2026-07-19 — REQUIRED on both pages)

"Continue with Google" is a **required** control on BOTH the Log in and Sign up pages — a
full-width **secondary** button under the email form, separated by an "or" divider. It is
NOT the accent fill (the primary submit keeps that — saturation-is-action holds); it reads
as quiet secondary chrome. It may sit behind a `NEXT_PUBLIC_OAUTH_ENABLED` flag so it never
renders dead where the backend has no Google client configured.

**Flow.** The button is a full-page navigation (not fetch — the browser must follow the
redirect chain through Google) to `{apiBaseUrl}/oauth2/authorization/google`. Google returns
to the backend callback, which creates a revocable server session, writes the single-use
`ASK_SESSION` **bridge cookie**, and redirects to `/oauth/callback` on our origin. That
transient page (the backend shipped this exchange 2026-07-19):

1. exchanges the cookie for a Bearer token — one `exchangeOAuthSession()` call (`GET /session` with `credentials:'include'`); the backend returns the HS256 JWT (`access_token`/`expires_in`) and clears `ASK_SESSION` — then applies it via the existing `applySessionTo()`. A token-less response is surfaced as an error, never applied as an empty sign-in (P9.4). The exchange runs at most once (the cookie is single-use);
2. redirects to the backend's `startRoute` (`startRouteToPath`), exactly like verify/login;
3. if the session carries `suggestRoleExpansion` (a first-time Google signup), arms the persistent Role Choosing Modal the same way the verify step does.

**Callback states (P8.4/P9.3).**

- Loading: a centered spinner + "Signing you in…" — this page is ALWAYS transient (covers both the exchange and the moment before the redirect fires).
- Error: the exchange fails, or the session carries no token → an **inline** message (`role="alert"`) + a "back to log in" link. NOT a Toast — the Toaster host lives in the platform layout, and `/oauth/callback` sits at the top level under the root providers only (i18n at defaultLocale + the auth store); a redirect page needs no more.

**Auth model.** OAuth only bootstraps a Bearer token; the app never authenticates by cookie
(token lock, D5/P5.2). Sign-out is unchanged — it clears `ask.accessToken`.

**Built (2026-07-19).** `OAuthOptions` (slice-private, `auth/ui/`) renders the "or" divider +
the Google button (`outline` variant via Button `asChild` over `<a href={env.googleOAuthUrl}>`,
full-width, 44px, with the official multicolour Google "G" from `public/google.svg` via `<img>`
— a sanctioned brand-asset exception to the lucide-only icon rule and P9.2, owner request
2026-07-19, since Google Sign-in branding requires its own mark), placed INSIDE each form after
the submit so it shows only on the credential step, never the 2FA verify step. `OAuthCallbackPage` (`auth/ui/`, exported via `index.ts`) is
rendered by the thin server route `src/app/oauth/callback/page.tsx` and driven by
`useOAuthCallback()` (`auth/hooks.ts`). `env.oauthEnabled` (default true;
`NEXT_PUBLIC_OAUTH_ENABLED=false` hides it) gates the button; `env.googleOAuthUrl` holds the
start URL. `httpClient` gained a per-request `credentials` option, set only by the exchange.
A real Google round-trip additionally needs the backend's `OAUTH2_GOOGLE_CLIENT_ID/SECRET` +
the Google Console redirect URIs configured — until then the button renders but the redirect
has no Google app to hit.

## States (mandatory even though the vision doesn't draw them — P8.4/P9.3)

- Loading: submitting credentials (Spinner in the button, disabled), verifying the code, restoring the session on app load
- Error: incorrect email or password (log in, a form-level error), account not active (log in, 403), multi-role account awaiting role selection (log in — `select-role` is deferred, so the state is a form-level error, never a silent empty session), wrong/expired code (verify), email already registered (sign up, inline on the email field), network failure → Toast + inline error (`role="alert"`, destructive colour; the error carries the id `{inputId}-error` and the input points at it via `aria-describedby` + `aria-invalid`, so screen readers re-discover the message from the field — 2026-07-18)
- Validation: email format, password present (log in) / ≥ 8 + confirmation match (sign up), name present (sign up — the backend schema requires it, see Flow step 2), agreement checked, code length (6)
- Empty: n/a

## Session foundation (every slice consumes this)

- `AuthProvider` (mounted in `app/providers`) restores the session on load from `ask.accessToken` via `GET /session`. A 401/403 — the backend rejecting the token — clears it → unauthenticated; a network failure or 5xx keeps the token for the next load (only this session renders unauthenticated), so an offline app-open never signs the user out for good.
- `useAuth()` → `{ status: "loading" | "authenticated" | "unauthenticated", user: AuthUser | null, signOut }`.

## Cross-slice

- Logged-in visitor on `/` is redirected to `/app/` by a client check of `ask.accessToken`; `?from=app` suppresses it (D6). Built with the landing (slice #10).
- Sign out lives in the profile card in the navigation menu (UF 2.3) — the action is `@/auth` (`useAuth().signOut`), the surface is `@/profile` (slice #6).
