# Profile — Screens & Flow

Traces PRODUCT_VISION **UF 2.3** (configure something, log out, or find additional pages).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Profile card (in the navigation menu) | any /app/* | client |
| Profile / settings | /app/profile | client |

## Flow (UF 2.3)
1. Home → **navigation menu**.
2. The menu shows a **profile card**: logo · name · settings · learn more · sign out.
3. **Settings** → `/app/profile`.
4. **Learn more** → the marketing pages at `/` (D6 — never a re-implementation inside a slice).
5. **Sign out** → `@/auth` logout, then the landing.

## States (P8.4/P9.3)
- Loading: session restoring → the card renders a skeleton, never a flash of "logged out"
- Error: profile save failure → Toast + inline field errors
- Validation: email format, display-name length

## Cross-slice
- Sign out is an `@/auth` action (R6, D8) — this slice renders the control, `auth/` performs it.
- "My requests" inside the profile area is `@/requests` embedded via its `index.ts` — same knowledge, live feature, never a copy.
- The card's *shell* is app chrome (`app/_components/`); its *content* comes from this slice.

## Not in V1
No preferences screen (sizes/style/budget/favorite brands) — the backend supports it, the vision does not ask for it. Do not build it (P9.1).
