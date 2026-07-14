# ASK Frontend — Roadmap

Status: **living document** (V1 — greenfield, 2026-07-14). Phases execute in order; a phase may start before the previous one is 100% complete only if its "Depends on" allows it. Decision gates (bottom) block the phases that reference them.

This is the **frontend** roadmap. It answers *when and in what order* — the one question the CORE authorities do not. `PRODUCT_VISION.md` says WHAT, `ARCHITECTURE_PATTERN_FRONTEND.md` says WHERE, `DESIGN_PATTERNS_FRONTEND.md` says HOW. Backend work appears here only where it **blocks** the frontend; the backend owns its own plan.

**Starting point:** the repo has zero application code. The only thing that exists is this knowledge system. Every line written from here is born under the enforced rules (architecture §8).

**Maintenance:** when a phase completes, its outcome moves to `Changelog.md` and the phase is deleted from this file. The roadmap holds only what is AHEAD. It is never a history.

---

## Phase 0 — Foundation (now)

Goal: a Next.js app where the boundaries are compile-time laws before a single slice exists. **Tooling before code — this order is not negotiable.**

Phase 0 splits in two, and **the halves run in PARALLEL**. Only 0b needs the design; 0a needs nothing from anyone.

### Phase 0a — Infrastructure (needs no design, start immediately)

- [x] Scaffold Next.js: App Router, TypeScript, `src/` directory, `@/*` alias (architecture §8)
- [x] **The FIRST commit, before any slice:** ESLint + `eslint-plugin-boundaries` + `eslint-plugin-import` per §8 — element types, `entry-point`, `no-unknown`, `no-unknown-files`, `import/no-cycle` (plugin v7 folds the first two into `boundaries/dependencies` — see the dated §8 note). Shipped `lint-fixtures/` with one deliberately-bad import per rule (R1, R2, R3, R5, unknown folder); `npm run lint:fixtures` asserts ESLint **fails** on each. Proven, not assumed.
- [x] Wire `eslint src` + `next build` into the build pipeline — `npm run build` chains lint → fixture proof → `next build`
- [x] `shared/api/httpClient.ts`: one wrapper, callable from server AND client (D7). `ApiError` mirrors the backend's `ErrorResponse`; token storage behind `TokenStorage` (P5.2, D5). No domain endpoints. (No key-transform layer: the backend speaks camelCase JSON — a transform would be dead code, P8.1.)
- [x] `shared/i18n/`: next-intl plumbing + `messages/{ru,kk,en}.json`, keyed per slice namespace (locale fixed to `ru` until the profile settings screen exists — a request-time cookie read would break the static marketing page, D6)
- [ ] App skeleton: root layout, `app/providers/`, `app/_components/` chrome, the `(marketing)` route group and the `/app/*` tree (D6). Structure only — unstyled.
- [ ] Playwright e2e harness running against `next build && next start`
- [ ] Confirm the deploy target and wire a preview deploy

### Phase 0b — The visual layer (needs the tokens)

**The one open decision in the whole phase.** No design file exists — the two sources of truth (the vision, the backend) say nothing about what the app LOOKS like. → **`DESIGN_BRIEF.md` is the brief; §9 holds the ready-to-paste prompts for claude.ai/design. Prompt 1 is the only one that blocks anything.**

- [ ] `design-system/`: the tokens (colors light+dark, type scale, spacing, radii, shadows, motion) mapped into the Tailwind v4 theme (D3). When they land they become the visual source and the architecture decision log gains a row.
- [ ] `shared/motion.ts`: the framer-motion variants (D4 — LazyMotion + `m.`, `useReducedMotion()`). Durations and easings are tokens.
- [ ] `shared/ui/`: the primitives the P9.3 states require — Button, Input, Select, Card, Modal, Toast, Badge, Loading/skeleton, EmptyState. These cannot be built before the tokens: P9.2 forbids a raw hex or px value in a component.

Depends on: nothing (0a) · Prompt 1 of the design brief (0b). **Blocks: everything below.**

## Phase 1 — Slice by Slice

Goal: the V1 product from `PRODUCT_VISION.md`, one vertical slice at a time. Nothing outside the vision gets built (P9.1).

### A slice is DONE when

1. Built per architecture §3 anatomy (`index.ts`, `api.ts`, `model.ts`, `hooks.ts`, `store.ts`, `ui/`)
2. Routed via a THIN route file; server/client split per D7
3. Every user-facing string is an i18n key under the slice's namespace — no hardcoded copy
4. Loading, empty, error and validation states exist, even where the vision doesn't draw them (P8.4, P9.3)
5. `AI_Knowledge/features/{slice}/` is updated in the SAME commit — docs ship with the code
6. `eslint src` and `next build` are green
7. Its Playwright e2e smoke test passes
8. Public surfaces only: metadata/OG, JSON-LD, sitemap entry

### Order — the customer path first (it is the mission), then the seller

| # | Slice | Delivers | UF |
|---|-------|----------|-----|
| 1 | `auth` | Authorization Page, role-choosing modal, the session foundation every other slice imports (R6) | UF 1 |
| 2 | `search` | Home (search form) + Catalog Page (list, sort, filters). Public, server-rendered. **Gate G1.** | UF 2.1 · 1–2 |
| 3 | `catalog` | Product Card — modal over the catalog + the same component server-rendered at `/app/product/:id` (D10). **Gate G3.** | UF 2.1 · 3–4 |
| 4 | `chats` | Chats Page + thread; then wire the card's chat button to open the chat modal directly (D8 embed) | UF 2.2, UF 2.1 · 4 |
| 5 | `requests` | Fallback requests; then wire them into `search`'s empty state so a dead-end catalog becomes a request | UF 2.1 (empty) |
| 6 | `profile` | Profile card in the navigation menu, settings, sign out | UF 2.3 |
|   | — | **Customer path complete end to end** | |
| 7 | `business-cabinet` | Cabinet shell + its OWN tabs: Branches, Unique Offers, Company Dashboard, Company Profile placeholder (**Gate G2**). Overview/"Requests" composed from `requests` + `chats` | UF 3.1 · 1, 4–7 |
| 8 | `catalog` (2nd pass) | The seller half: Products tab — list, add, import wizard (upload → map → preview → approve) | UF 3.1 · 2 |
| 9 | `services` | Services tab — mirrors Products, **no import**. Duplicated, never parameterized (D8, P6.3) | UF 3.1 · 3 |
|   | — | **Seller path complete** | |
| 10 | `app/(marketing)` | The landing at `/` — content only, static, SEO-first. Logged-in redirect to `/app/` via `ask.accessToken`, suppressed by `?from=app` (D6) | UF 1 |
| 11 | — | SEO base: `sitemap.ts`, `robots.ts`, OG images | |
| 12 | — | **Launch:** e2e suite green → deploy (marketing `/` + platform `/app/*`, one app) | |

Slices 7–9 are one product surface but three slices: the cabinet **composes**, it does not own other domains' data (R2, D8).

Depends on: Phase 0.

## Phase 2 — Expansion

Only after V1 ships. Each item is either work inside an existing slice, or a NEW slice registered per architecture §2 (doc entry + ESLint pattern + feature folder, same commit).

- [ ] `contact` slice — if G3 resolves to the backend's contact-action module (`contactActionId` pattern)
- [ ] `autodump` slice — the AI import flow (paste raw data → AI draft → review → publish); mirrors backend `autodump`
- [ ] Shipping settings in the cabinet — mirrors backend `shipping` (no V1 surface today)
- [ ] Booking UI — a new `booking` slice, when backend booking activates
- [ ] Customer preferences (sizes, style, budget, favorite brands) — the backend supports them; needs a vision entry first (P9.1)
- [ ] City/category SEO landing pages, server-rendered → `search/` + route files
- [ ] Search history — the backend preserves session snapshots; needs a vision entry first

## Phase 3 — Mobile (Expo)

Trigger: mobile development actually starting. **Do not pre-build** (YAGNI, P8.2).

- [ ] Monorepo (pnpm workspaces or Turborepo): `apps/web`, `apps/mobile`, `packages/*`
- [ ] Extract `packages/api-client` (httpClient, transforms, `ApiError`, `TokenStorage` interface), `packages/models`, `packages/i18n`, `packages/stores` — the slice `api.ts`/`model.ts`/`store.ts` files lift mechanically **if D5 platform-neutrality held**. That is the whole payoff of D5; if a browser API leaked into those files, this phase gets expensive.
- [ ] Expo app: customer search flow first, seller second. Expo Router; NativeWind (Tailwind knowledge transfers); Moti/Reanimated (the `shared/motion.ts` variant values port).
- [ ] `TokenStorage` implementations: web `localStorage`, mobile `SecureStore`
- [ ] Interim: a PWA can be added to the Next app instead — requires a decision-log row first (P7.2)

## Phase 4 — Scale (deferred until a second market is real)

Do NOT build these early. Recorded so today's decisions don't block them.

- [ ] More locales — the i18n structure already supports it
- [ ] CDN in front of static/ISR pages, then the `app.` subdomain split if marketing and platform scaling diverge. The `/app/*` prefix (D6) already makes this URL-stable — no route churn.
- [ ] Auth upgrade: httpOnly session cookie + CSRF, replacing the localStorage bearer token. Do it WITH the subdomain split; it also unlocks server-side auth checks for authenticated SSR.
- [ ] Domain/brand strategy for global markets (**G4**)
- [ ] If backend modules are ever extracted into services: extraction happens **behind a gateway that preserves the single `/api/*` contract**. The frontend is NOT rewritten and must NOT gain per-service URLs; cross-service aggregation lives in the gateway, never as fetch loops in the client. Slices already map 1:1 to backend modules (D1).

---

## Decision Gates

**A gate blocks a CONTROL, not a phase.** Nothing here blocks Phase 0. Nothing here stops a slice from being built — each gate parks one widget or one button until someone answers it, and the rest of the slice ships. Build up to the gate, leave the parked piece out, keep moving.

| Gate | Question | Parks (everything else in that slice still ships) | Status |
|---|---|---|---|
| **G1** | **Search sort & filter contract.** The vision (§4) promises sorting by relevance / distance / cost / unique offers, and filters for price / companies / location (100 km · city · map area). `UnifiedSearchRequest` accepts only `query`, `cityId`, `limit`. The backend must extend the contract — a lock forbids faking it by re-sorting a loaded page client-side. | The extra sort tabs and filter controls on the Catalog Page. **Ships anyway:** Home, the search form, the Catalog Page, result cards, relevance sort (the backend default) and the city filter — both already supported. | **OPEN — raise with backend** |
| **G2** | **Company Profile scope.** The vision marks it "coming in a future update"; no backend endpoints exist. | Nothing. The placeholder IS the spec — ship it and move on. Re-open when the vision describes a screen. | Open, not blocking |
| **G3** | **What does "Proceed to Purchase" do?** The vision puts the button on the Product Card, but we are explicitly NOT a marketplace and there is no checkout. Likely candidate: the backend's `contact` module (`ContactActionController`, the `contactActionId` privacy pattern). If so, a `contact` slice must be registered per §2. | One button's click handler. **Ships anyway:** the whole Product Card — every field, the modal, the `/app/product/:id` page, SEO, and the chat button. | **OPEN — raise with backend + product** |
| **G4** | World-wide domain/brand choice (ask.kz is KZ-branded) | Nothing before Phase 4 | Open, not urgent |

## Cross-Repo Dependencies

What the frontend needs FROM `../Ask_Backend` — tracked here because a missing piece blocks a phase, not because we own it.

| Need | For | Status |
|---|---|---|
| Sort & filter params on `UnifiedSearchRequest` | G1 → the Catalog Page | Not requested yet |
| The "Proceed to Purchase" contract | G3 → the Product Card | Not requested yet |
| `AUTH_VERIFICATION_TEST_MODE=false`, real secrets, prod CORS origins | Phase 1 · Launch | Backend-owned |

Architecture decisions D1–D10 live in `ARCHITECTURE_PATTERN_FRONTEND.md` §11 — that is the decision log. This file plans; it does not decide.
