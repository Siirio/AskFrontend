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
version of the sentence). The links resolve: `/terms`, `/privacy` (and
`/cookies`) are static routes under `app/(marketing)/`, built 2026-07-21 OUTSIDE
`/app` (owner rule 3, D23). Their bodies are a neutral "being prepared"
placeholder — the legal copy is the owner's to write, never invented here (P9.1).

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
as quiet secondary chrome. It **defaults to shown** — OAuth is a required method and
production runs a configured Google client, so a required control is not hidden by default
(the "never render dead" goal is met by configuring the backend, not by hiding the button).
`NEXT_PUBLIC_OAUTH_ENABLED=false` is the opt-OUT for an environment that deliberately has no
Google client, so it never renders dead there. `env.ts` is the source of truth for this default.

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

## Visual skin (2026-07-27, D25)

Auth sits under `/app/*`, so it is inside the platform layout's `neu-skin` wrapper and is
**ORANGE NEUMORPHISM** — depth replaces borders. Nothing about the flow, the contracts or the
states changed; the notes below record what the screens now LOOK like, and the two places where
the skin changed a control's behaviour rather than just its surface.

- **`AuthShell`** is a `.neu-card` — the same colour as the page, lifted by a paired shadow. No
  border, no `bg-surface-raised`, more padding (a 24px corner radius crowds otherwise).
- **Fields** are carved IN (`.neu-input`), actions stand OUT — that opposition is what makes the
  skin legible with no borders anywhere. Focus is an accent GLOW hugging the field, not the
  product's offset ring, which read as a detached rectangle around a shadow-defined edge; chrome
  (buttons, links, toggles) still uses the shared `focus-ring`. Field labels stepped DOWN to
  `foreground-muted`: a carved well already announces itself, so a bold label above it shouts.
- **The agreement checkbox** is `.neu-checkbox-box` — an empty SOCKET the accent fills when
  checked. The native input remains the control (role, label association, keyboard, form value)
  and is made invisible rather than replaced, because a native checkbox cannot take an inset
  shadow. It stays slice-private (D8 rule of three, auth is still the only consumer), but its
  look comes from the design system, so a future shared primitive already matches.
- **The verification step now uses SIX CELLS** (`CodeInput`, neumorui's OTPInput) instead of one
  6-character field — the one real behaviour change. `code` is still a single string owned by
  `useVerifyStep`, and the cells are a view of it, never six independent states. It handles
  paste-anywhere (people paste "123 456" or "Your code is 123456" into whichever box they
  clicked), iOS/Android SMS autofill via `one-time-code` on the first cell only, backspace
  stepping back, and arrow/Home/End for a middle digit. **Filling the last cell submits** —
  the person is mid-transcription from another device, so a further click buys nothing;
  `pending` guards the double-fire and the button stays for keyboard submit and retry.
  Each cell is labelled positionally (`auth.verify.digitAria` → "Digit 3 of 6") so a
  screen-reader user is not lost among six identical boxes; there is deliberately no wrapping
  `role="group"`, which would only repeat the Field label.
- **The role modal's selected card is PRESSED IN**, not outlined-and-tinted. On a skin where
  every control already carries a shadow an added border reads as a fourth edge, and a tinted
  panel competes with Continue for "the saturated thing". Depth marks the choice, the accent
  marks the action.
- **The OAuth divider** is a carved groove (`.neu-rule`), not a 1px hairline — the one thing this
  skin has no vocabulary for. The Google button's `outline` variant resolves to the plain RAISED
  button: there is no bordered variant to be quiet with, so quiet means unsaturated, and the
  email submit keeps the one accent fill.
- **The retired skin is preserved** as `auth/ui/*_old.tsx` — a restorable set (each `_old` file
  imports its `_old` siblings), not loose backups. Do not edit them and do not keep them in step
  with the live files.

## States (mandatory even though the vision doesn't draw them — P8.4/P9.3)

- Loading: submitting credentials (Spinner in the button, disabled), verifying the code, restoring the session on app load
- Error: incorrect email or password (log in, a form-level error), account not active (log in, 403), multi-role account awaiting role selection (log in — `select-role` is deferred, so the state is a form-level error, never a silent empty session), wrong/expired code (verify), email already registered (sign up, inline on the email field), network failure → Toast + inline error (`role="alert"`, destructive colour; the error carries the id `{inputId}-error` and the input points at it via `aria-describedby` + `aria-invalid`, so screen readers re-discover the message from the field — 2026-07-18)
- Validation: email format, password present (log in) / ≥ 8 + confirmation match (sign up), name present (sign up — the backend schema requires it, see Flow step 2), agreement checked, code length (6 — now enforced by `CodeInput`'s cell count as well as by the flow)
- Empty: n/a

## Session foundation (every slice consumes this)

- `AuthProvider` (mounted in `app/providers`) restores the session on load from `ask.accessToken` via `GET /session`. A 401/403 — the backend rejecting the token — clears it → unauthenticated; a network failure or 5xx keeps the token for the next load (only this session renders unauthenticated), so an offline app-open never signs the user out for good.
- `useAuth()` → `{ status: "loading" | "authenticated" | "unauthenticated", user: AuthUser | null, signOut }`.

## Route guards & access control (owner rules 1–2, built 2026-07-21 — architecture D23)

The platform is gated. Two guards live in this slice (`ui/RequireAuth.tsx`,
`ui/RequireDashboardAccess.tsx`), exported via `index.ts`, mounted by the app
composition root (R3):

| Guard | Mounted at | Rule | While loading | Denied → |
|-------|-----------|------|---------------|----------|
| `RequireAuth` | `app/app/(main)/layout.tsx` — wraps the whole `(main)` group | Rule 2: logged-out cannot enter `/app/*` | `GuardFallback` spinner | `/app/auth/login` |
| `RequireDashboardAccess` | `app/app/(main)/business/layout.tsx` | Rule 1: customer-only cannot open the Dashboard | `GuardFallback` spinner | `/app` |

- **The auth pages are the exception** because they sit OUTSIDE the `(main)` group — the route-group boundary is the "gated vs. sign-in entry" line, so there is no per-URL allowlist. `/app/auth/*` and the top-level `/oauth/callback` are reachable logged-out by construction.
- **Client-side by necessity:** the token is localStorage-only (D5/D6), invisible to the server/middleware, so the guard runs after hydration. Sequence: server renders → `AuthProvider` restores → guard reveals or redirects. A server/middleware guard waits on the Phase-4 cookie migration.
- **Loading is a real state (P8.4/P9.3):** the guard shows `GuardFallback` (a centered spinner, `app.loading`) while status is `loading`, and NEVER redirects then — redirecting before the restore settles would bounce an authenticated user to login on every load. `redirect` uses `router.replace` (no history entry → no Back-button loop).
- **One predicate for the Dashboard:** `canAccessDashboard(user)` (`model.ts`) is the single source for "who may open the cabinet" — the nav gates the link with it, the guard gates the route with it (P6.2). A customer typing `/app/business` is bounced exactly as the hidden link implies.
- **The nav has no signed-out state (owner rule 4):** it renders only inside `RequireAuth`, so there is no "sign in" button to remove-and-forget — a logged-out visitor is already gone.
- **Landing (owner rule 5):** `LandingRedirect` (a `(marketing)` client island) carries a logged-in visitor from `/` to `/app` unless `?from=app` (D6). A logged-out visitor's "Open the app" link goes to `/app`, where `RequireAuth` sends them to log in — so the landing is the de-facto sign-in entry.

## Cross-slice

- Logged-in visitor on `/` is redirected to `/app/` by a client check of `ask.accessToken`; `?from=app` suppresses it (D6). Built with the landing (slice #10).
- Sign out lives in the profile card in the navigation menu (UF 2.3) — the action is `@/auth` (`useAuth().signOut`), the surface is `@/profile` (slice #6).
