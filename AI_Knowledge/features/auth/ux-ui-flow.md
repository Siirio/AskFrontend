# Auth — Screens & Flow

Traces PRODUCT_VISION **UF 1** (Landing → Authorization → Home + Role Choosing Modal).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Authorization Page (Sign up / Log in) | /app/auth | client |
| Role Choosing Modal | over /app (Home) | client |

## Flow
1. Landing (`/`) → Authorization Page.
2. Sign up or Log in — email + 6-digit verification code.
3. On success: session stored, Home (`/app`) opens with the **Role Choosing Modal** on top.
4. Role decides the surface: customer → Home/search (UF 2.x); business owner → business registration, then the cabinet (UF 3.1). `startRoute` from the backend is the authority for where the session lands.

## States (mandatory even though the vision doesn't draw them — P8.4/P9.3)
- Loading: submitting credentials, verifying code, restoring session on app load
- Error: wrong code, expired challenge, network failure → Toast + inline field error
- Validation: email format, code length (6)
- Empty: n/a

## Cross-slice
- Logged-in visitor on `/` is redirected to `/app/` by a client check of `ask.accessToken`; `?from=app` suppresses it (D6).
- Sign out lives in the profile card in the navigation menu (UF 2.3) — the action is `@/auth`, the surface is `@/profile`.
