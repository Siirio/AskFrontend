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
- ~~"My requests" inside the profile area~~ — **removed 2026-07-28.** The `requests` slice was removed from the product and its backend domain deleted; the section was never in PRODUCT_VISION UF 2.3 either. Do not build it (see `contracts.md`).
- The card's *shell* is app chrome (`app/_components/`); its *content* comes from this slice.

## Not in V1
No preferences screen (sizes/style/budget/favorite brands) — the backend supports it, the vision does not ask for it. Do not build it (P9.1).


## Route placeholder — until this slice lands (2026-08-02)

`/app/profile` is LIVE and reachable today, so it states plainly that the section is
not open rather than looking unfinished: the shared `EmptyState` primitive via
`app/_components/SectionNotOpen.tsx`, with copy in ru/kk/en. It used to render a
bare `<h1>` plus "Section under construction" inside a neumorphic product, which
reads as a broken build rather than as a message (AUDIT_2 N4 / AUDIT_1 B1).

This is the second of the three endings the "a reachable control must DO
something" lock allows — build it, say plainly it is not open, or stop offering
the control. Not invented UI (P9.1): it is the mandatory empty state P9.3
requires of a surface that exists with no content.

Reached from the account menu's Settings; the copy points at sign-out, which does work there.

Verified in a browser, light and dark, against a production build.
