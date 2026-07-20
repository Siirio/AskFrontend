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
- [x] `shared/api/httpClient.ts`: one wrapper, callable from server AND client (D7). `ApiError` mirrors the backend's `ErrorResponse`; token storage behind `TokenStorage` (P5.2, D5). No domain endpoints. (The original "no key-transform layer — the backend speaks camelCase" note proved WRONG on live integration 2026-07-17: the wire is snake_case; `shared/api/caseTransform.ts` now converts at the transport boundary — D20.)
- [x] `shared/i18n/`: next-intl plumbing + `messages/{ru,kk,en}.json`, keyed per slice namespace (default locale set to `kk` — owner decision 2026-07-20, see Changelog; the ru/kk/en switcher overrides per session, D18/D19)
- [x] App skeleton: root layout, `app/providers/`, `app/_components/` chrome (NavigationMenu), the `(marketing)` route group and the `/app/*` tree (D6). Structure only — unstyled; every string is an i18n key; `/` and `/app/*` prerender static, `product/[id]` dynamic.
- [x] Playwright e2e harness running against `next build && next start` (e2e/smoke.spec.ts: landing, platform shell, every V1 route)
- [ ] Confirm the deploy target and wire a preview deploy, plus a CI check running `npm run build` — an import violation must fail in CI, not only on the machine that chose to build (§8). If Vercel: pin `buildCommand` to `npm run build`, or its default `next build` silently skips the lint chain.

### Phase 0b — The visual layer (needs the tokens)

**The one open decision in the whole phase.** No design file exists — the two sources of truth (the vision, the backend) say nothing about what the app LOOKS like. → **`.claude/skills/marketing-ui-design/SKILL.md` and `.claude/skills/platform-ui-design/SKILL.md` carry the direction now** (D11 GSAP, D12 shadcn scaffolding); the invariants inside it are `Locks.md` "Design Locks". Token generation is the first thing that invokes them.

- [x] `design-system/tokens.css`: the tokens (colors light+dark, type scale, spacing, radii, shadows, motion) mapped into the Tailwind v4 theme. **It is now the visual source — decision log D13.** The three problems the inherited direction left open are closed by measurement, not taste: the accent is the brightest orange at hue 46 that still holds white text at AA (4.67:1), with a *different* value in dark at the same hue because one value provably cannot serve both; the offer/accent collision is solved by register — **saturation is action, tint is information** (a lock); and the typeface is Golos Text, whose subset list must include `latin-ext` because ₸ (U+20B8) is in no Cyrillic range (a lock). 31/31 contrast pairs pass, all in sRGB gamut.
  - [x] **Build-verified 2026-07-15.** `npm run build` green end to end (lint → boundary fixtures → tsc → 9 routes, static/dynamic split intact). Driven in a real browser: the body paints from the tokens in BOTH grounds, `--accent-foreground` flips white→ink across them, and ₸ + the Kazakh letters resolve from Golos rather than falling back. `e2e/design-system.spec.ts` now gives the Design Locks **teeth** — it asserts the wiring (body renders on the token; dark redefines it; the webfont covers ₸), so a token may be retuned freely but the system cannot be silently unwired. Full suite: 5/5.
- [x] Motion tokens (`--duration-*`, `--ease-*`) landed in `design-system/tokens.css`; the CSS reduced-motion gate is in `globals.css`; **`shared/motion.ts` (D14) is the GSAP door** — registers plugins, adopts the motion tokens as GSAP defaults (a CustomEase built from `--ease-out` so the JS curve equals the CSS curve), gates reduced motion once via `gsap.matchMedia()`, never runs on the server (D7). Import GSAP from this module, never from `gsap` directly. Note `--duration-*` is not a Tailwind namespace: reference it as `duration-(--duration-fast)`, never a bare `duration-200` (P9.2).
- [x] `shared/ui/` — all 9 primitives (D14), scaffolded via shadcn CLI and restyled to tokens before first use (D12): Button, Input, Select, Card, Dialog (Modal), Badge, Skeleton (+ own-code Spinner), EmptyState (own-code), Toast (sonner, no `next-themes`; shipped `theme="system"` — corrected 2026-07-17 to follow the resolved `data-theme`, D21). Build + e2e green, both themes screenshot-verified.

**Phase 0b is COMPLETE.** The visual layer exists and is proven. Two threads deliberately deferred to their first real consumer (YAGNI): mounting `<Toaster>` in `app/providers`, and any GSAP-driven micro-motion on the primitives.

### Phase 0a — the last box
- [x] **CI landed (2026-07-15).** `.github/workflows/ci.yml` — GitHub Actions, since the repo is `Siirio/AskFrontend`. Two jobs on push (master/dev/new_frontend) and every PR: **build** (`npm ci` → `npm run build` = eslint → the boundary-fixture proof → tsc → `next build`, so an import/boundary violation, a stale rule fixture, a type error, or a build break fails the PR) and **e2e** (installs chromium, runs the Playwright harness — GitHub sets `CI=true`, which finally activates the config's CI branch: `forbidOnly`, `retries=2`, `reuseExistingServer=false`; traces upload on failure). Node pinned via `.nvmrc` (single source, read by `node-version-file`). `npm ci` sync verified locally. **The boundaries are now enforced where merges happen, not only on the machine that chose to build (§8).**
- [x] **Deploy host: Vercel (D16), wired 2026-07-15.** `vercel.json` pins `buildCommand: npm run build` so the deploy runs the SAME lint + boundary-fixture gate as CI (the default bare `next build` would skip it — the documented trap, avoided). `framework: nextjs`; Node pinned via `engines.node: 22.x` (Vercel reads that, not `.nvmrc`). **One human step remains** (not an agent's to do): connect the repo in the Vercel dashboard — per-PR preview deploys are automatic after that.

**Phase 0 is COMPLETE** — every box that does not require a human dashboard click is done. Phase 1 (the auth slice) is unblocked.

### Tooling added alongside (not a phase item)
- Prettier + `prettier-plugin-tailwindcss` (D15): `npm run format`, gated in CI by `format:check`. LF pinned via `.gitattributes`. Authored docs and the D3 token source are excluded (`.prettierignore`).

Depends on: nothing (0a) · the token set landing (0b). **Phase 1 is now unblocked.**

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
| 12 | — | **Launch:** owner-authored legal copy replaces the Terms/Privacy/Cookies placeholders + each `noindex` removed (see Parked fixes — the register consent links depend on it) → e2e suite green → deploy (marketing `/` + platform `/app/*`, one app) | |

Slices 7–9 are one product surface but three slices: the cabinet **composes**, it does not own other domains' data (R2, D8).

### Parked fixes (2026-07-14 audit) — attach to the item that triggers them

- [x] **With slice #1 (landed 2026-07-15):** R4 teeth — a small custom flat-config rule `local/no-cross-element-relative-import` catches a relative import escaping its element to a *legal* target (illegal targets were already caught by `boundaries/dependencies`). Proven by `lint-fixtures/src/auth/bad-r4-relative-escape.ts` + a clean within-slice fixture (see the dated §4 note in the architecture doc). All of R1–R5 now carry ESLint teeth.
- [ ] **With item 10 (the landing):** the smoke test locates the `/app` link via bare `getByRole("link")` — it breaks on ambiguity the moment the landing gains a second link. Scope it by `href`, not by accessible name (name would couple the test to translated copy).
- [ ] **With item 10 (the landing): `public/logo_vertical.svg` has no consumer yet** (2026-07-16 audit, P8.1). The asset was exported with `logo_horizontal.svg` but nothing in `src/` references it; the landing is its expected first consumer. If the landing ships without it, delete it then.
- [x] **Done early (2026-07-21, with the platform guard — D23): `/terms`, `/privacy` AND `/cookies` now exist** as static, content-only routes under `app/(marketing)/` (owner rule 3 — legal pages live OUTSIDE `/app`). The register agreement + the nav "Learn more" links resolve; no change to `auth`. Bodies are a neutral "being prepared" placeholder — the legal copy is still the owner's to write, never invented client-side (P9.1). The three pages are `noindex` while placeholder, so they cannot be crawled/cached as the real documents. **LAUNCH BLOCKER (item 12):** owner-authored Terms / Privacy / Cookies copy MUST replace the placeholders before launch — the register consent checkbox links to these pages, so shipping live consent against placeholder text is not acceptable in production; removing each `noindex` (and adding SEO metadata) is the same step, with the full landing (item 10).

### Auth follow-up — Google OAuth (owner directive 2026-07-19, an addition to shipped slice #1)

Both gates that parked this are now cleared: Google login is in `PRODUCT_VISION.md` UF 1 and the `Email-only auth` lock is reversed. Google OAuth is now **required** on the Log in and Sign up pages. Docs are written (auth `contracts.md` / `ux-ui-flow.md` / `README.md` / `locks.md`); implementation is pending.

- [ ] **Frontend:** `src/app/oauth/callback/page.tsx` (transient exchange page) + a "Continue with Google" secondary button on `LoginForm` and `RegisterForm` + a per-request `credentials` option on `httpClient`. The callback reuses `applySessionTo` → `startRoute` (identical to verify/login; `suggestRoleExpansion` arms the role modal). i18n `auth.oauth.*` in ru/kk/en. Optional `NEXT_PUBLIC_OAUTH_ENABLED` flag so the button never renders dead.
- [x] **Backend delivered (2026-07-19, Final Major Update):** `GET /api/v1/auth/session` now exchanges the `ASK_SESSION` bridge cookie for the HS256 JWT (+ `expires_in`) and clears the cookie — exactly the option-2 hand-off. **Frontend is fully unblocked**; the whole item can be built now.

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
- [ ] Expo app: customer search flow first, seller second. Expo Router; NativeWind (Tailwind knowledge transfers); the motion TOKEN values (durations/easings) port to Reanimated — GSAP itself (D11) is web-only and does not lift.
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
| **G1** | **Search sort & filter contract — MOSTLY RESOLVED 2026-07-19.** The vision (§4) wants sorts relevance / distance / cost / unique-offers and filters price / companies / location (100 km · city · map area). The backend replaced `UnifiedSearchRequest` with `POST /api/v1/search` (see `features/search/contracts.md`), which now supports sorts `intent_match` (relevance) · `distance` · `price_asc` (cost), and `filters`/`overrides` for price (`min_price`/`max_price`), `city`, `category`, `scope`. **Still missing:** a Unique-Offers sort, a Companies filter, and the 100 km-radius / map-area location filters. The lock still forbids faking any of these by re-sorting a loaded page client-side. | Only the three unbuilt controls — the Unique-Offers sort tab, the Companies filter, and radius/map-area. **Ships now:** Home, the search form, the Catalog Page, result cards, and the relevance/distance/cost sorts + price/city/category filters — all backend-supported. | **PARTIAL — the missing three raise with backend** |
| **G2** | **Company Profile scope.** The vision marks it "coming in a future update"; no backend endpoints exist. | Nothing. The placeholder IS the spec — ship it and move on. Re-open when the vision describes a screen. | Open, not blocking |
| **G3** | **What does "Proceed to Purchase" do?** The vision puts the button on the Product Card, but we are explicitly NOT a marketplace and there is no checkout. Likely candidate: the backend's `contact` module (`ContactActionController`, the `contactActionId` privacy pattern). If so, a `contact` slice must be registered per §2. | One button's click handler. **Ships anyway:** the whole Product Card — every field, the modal, the `/app/product/:id` page, SEO, and the chat button. | **OPEN — raise with backend + product** |
| **G4** | World-wide domain/brand choice (ask.kz is KZ-branded) | Nothing before Phase 4 | Open, not urgent |

## Cross-Repo Dependencies

What the frontend needs FROM `../Ask_Backend` — tracked here because a missing piece blocks a phase, not because we own it.

| Need | For | Status |
|---|---|---|
| Unique-Offers sort, Companies filter, and 100 km-radius / map-area location filters on `POST /api/v1/search` | G1 → the remaining Catalog Page controls | **Partly delivered 2026-07-19:** relevance/distance/cost sorts + price/city/category filters now exist on `/api/v1/search`; these three remain |
| The "Proceed to Purchase" contract | G3 → the Product Card | Not requested yet |
| CORS origin for THIS client — every backend profile allows only Vite ports (5173/5174); `http://localhost:3000` (dev) + the deploy domain must be added to `ask.cors.allowed-origins` | Any browser call to the real backend | **Local dev DONE (2026-07-18):** `http://localhost:3000` + `http://127.0.0.1:3000` added to Ask_Backend `application-local.yml` (preflight + register 201 verified from the :3000 origin). The **deploy domain** still pending |
| `GET /api/v1/auth/session` returns a real `access_token` under `ASK_SESSION` cookie auth | Google OAuth on the auth pages — the option-2 cookie→Bearer hand-off (`features/auth/contracts.md`) | **DONE 2026-07-19 (Final Major Update):** `/session` accepts the bridge cookie, returns the HS256 JWT + `expires_in`, then clears the single-use `ASK_SESSION`. Frontend fully unblocked |
| `OAUTH2_FRONTEND_REDIRECT_URI` per environment + Google Console redirect URIs + `OAUTH2_GOOGLE_CLIENT_ID/SECRET` set | Google OAuth redirect landing on `/oauth/callback` | Dev/prod defaults aligned to `:3000`/`ask.com.kz` (2026-07-19); **stage must override** the redirect URI, and Google Console must whitelist each backend callback |
| `AUTH_VERIFICATION_TEST_MODE=false`, real secrets, prod CORS origins | Phase 1 · Launch | Backend-owned |

Architecture decisions D1–D10 live in `ARCHITECTURE_PATTERN_FRONTEND.md` §11 — that is the decision log. This file plans; it does not decide.
