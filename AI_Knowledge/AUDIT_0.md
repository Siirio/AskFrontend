# AUDIT_0 — Architecture & Design compliance audit

Status: **record** (2026-07-18). Owner-run audit of the whole `src/` tree against
`ARCHITECTURE_PATTERN_FRONTEND.md` (R1–R6, D1–D22, §7 single-implementation) and
`DESIGN_PATTERNS_FRONTEND.md` (P1–P9). One lock-level violation found and FIXED;
four minor tensions found and DEFERRED with explicit triggers.

**Method:** full-tree read + `npm run build` (the production route table is the
proof for rendering-mode claims) + i18n key-parity check + grep sweeps
(direct `localStorage`/`fetch`/`gsap`, `dark:` colour utilities, raw hex, inline
styles). **Build was green** and the codebase is strongly compliant — R1–R6 hold,
§7 has no second implementations, `shared/` carries no business knowledge, slice
anatomy is correct, ru/kk/en keys are at parity.

**How to use this file:** when a deferred item is fixed, mark it `[x]` with the
date and the commit's effect; do NOT delete it (same rule as the Changelog — the
record is the point). When every item is resolved, fold the summary into
`Changelog.md` and retire this file.

---

## Finding 1 — D6 static-landing lock violated — ✅ RESOLVED 2026-07-18

**Rule:** D6 (+ D18, D19) — *the SEO marketing landing at `/` is statically
rendered.* **Was:** the production build shipped every route dynamic (`ƒ`), `/`
included. **Cause:** next-intl treats `getLocale`/`getMessages`/`getTranslations`
as dynamic until the request locale is seeded; the root layout, `AppProviders`
and the landing page all called them unseeded, opting the whole tree in.
`request.ts` avoiding a cookie read is necessary but not sufficient.

**Fix:** `setRequestLocale(defaultLocale)` at both static entry points
(`src/app/layout.tsx`, `src/app/(marketing)/page.tsx`); corrected the overclaiming
comment in `src/shared/i18n/request.ts`. **Proof (rebuild):** `/` and
`/_not-found` → `○ (Static)`; all `/app/*` → `ƒ (Dynamic)`, unchanged (they read
cookies per D19). No decision reversed — the code now MEETS D6. Full record in
`Changelog.md` (2026-07-18).

---

## Deferred — minor / borderline (low impact, not lock-level)

None of these is reachable-and-wrong in V1; each is safe to leave. Fix them when
the trigger below fires, not as loose debt.

- [ ] **Finding 2 — `toAuthUser` silently degrades a business/staff session to
  `customer`.** `src/auth/model.ts` (`toAuthUser`, the `kind !== "customer" &&
  session.business` branch ~L185–188): a business/staff `role` whose session omits
  `business` context is mapped to `kind: "customer"` with no signal raised — in
  tension with **P9.4** (*"the mismatch is raised, never silently patched"*).
  Degrading to least-privilege is arguably the safe default, and V1 is
  customer-only so the path is **unreachable today**.
  **Trigger — slice #7 (`business-cabinet`), when staff/business login goes live.**
  Fix it *as part of that slice*: that is when the path becomes reachable and when
  you will know what "raise the mismatch" should do (toast / error boundary /
  redirect). Shipping staff login without this fix would ship a silent auth bug.

- [ ] **Finding 4 — unused `AuthSessionResponse` fields (YAGNI/P8.1).**
  `src/auth/model.ts` (`AuthSessionResponse`, ~L83–101): `tokenType`, `expiresAt`,
  `remembered`, `activationRequired`, `availableRoles`, `allRoles` are modelled but
  unused in V1. **P8.3 already permits this** (roadmap-traceable, tied to the
  seller/staff paths). **Self-resolving — slice #7** consumes them; likely no
  action ever needed. Listed only so the deferral is on record.

- [ ] **Finding 5 — Dialog keeps a shadcn arbitrary spacing literal.**
  `src/shared/ui/dialog.tsx` L76: `max-w-[calc(100%-2rem)]` — the `2rem` viewport
  gutter is a spacing value that **D12/P9.2** would prefer as a token (the centering
  percentages are geometry and are fine). It lives inside the primitive; callers
  don't copy it, so it cannot propagate even though every future modal builds on
  Dialog. **Trigger — anytime**, one-line token swap. Low priority.

- [ ] **Finding 3 — `INVALID_CREDENTIALS` mapped in two places (P6.2).**
  `src/auth/hooks.ts`: the `ERROR_KEY_BY_CODE` map (~L152–160) and the inline
  `useLoginFlow` catch (~L349–355) both encode `INVALID_CREDENTIALS →
  invalidCredentials`. Same-file, documented, **defensive** redundancy (the inline
  branch also handles a bare `401`, which the code-keyed map cannot). Cannot spread
  as slices grow. **May never need fixing** — recorded for completeness, no trigger.
