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
| 2 | `search` | Home (search form + the goods/services mode toggle) + Catalog Page (sectioned list, sort, filters). **Gate G1** parks 3 controls; the rest ships | UF 2.1 · 1–2 |
| 3 | `catalog` | Product Card — modal over the catalog, rendered from the search card payload. **`/app/product/:id` is DEFERRED** (no public item endpoint — cross-repo table). **Gate G3** parks one button. **Also carries the result card's primary catalog image** and the Product Card's up-to-3 gallery (owner append 2026-08-02, PRODUCT_VISION UF 2.1) — `images` is already modelled; only rendering is owed | UF 2.1 · 3–4 |
| 4 | `chats` | Chats Page + thread; then wire the card's chat button to open the chat modal directly (D8 embed) | UF 2.2, UF 2.1 · 4 |
| 5 | `profile` | Profile card in the navigation menu, settings, sign out | UF 2.3 |
|   | — | **Customer path complete end to end** | |
| 6 | `business-cabinet` | Cabinet shell + its OWN tabs: Branches, Unique Offers (backend calls them **drops**), Company Dashboard, Company Profile placeholder (**Gate G2**). Overview/"Requests" composed from `chats` alone. **Seller registration is already DONE (2026-07-27, D26)** — `/app/business/register`, pulled forward because the role modal's "set up your business" was routing into the cabinet's own guard and being bounced, so the choice silently did nothing. The rest of the item is unchanged | UF 3.1 · 1, 4–7 |
| 7 | `catalog` (2nd pass) | The seller half: Products tab — list, add, import wizard (upload → map → preview → approve). Backend calls products **items** | UF 3.1 · 2 |
| 8 | `services` | Services tab — mirrors Products, **no import**. Duplicated, never parameterized (D8, P6.3) | UF 3.1 · 3 |
|   | — | **Seller path complete** | |
| 9 | `app/(marketing)` | The landing at `/` — content only, static, SEO-first. Logged-in redirect to `/app/` via `ask.accessToken`, suppressed by `?from=app` (D6) | UF 1 |
| 10 | — | SEO base: `sitemap.ts`, `robots.ts`, OG images. **Marketing + legal pages only.** D23 puts every `/app/*` surface behind the auth gate **except `/app/auth/*`** — see the corrected note below; `robots.ts` must `Disallow: /app/`, not assume the gate does it | |
| 11 | — | **Launch:** owner-authored legal copy replaces the Terms/Privacy/Cookies placeholders + each `noindex` removed (see Parked fixes — the register consent links depend on it) → e2e suite green → deploy (marketing `/` + platform `/app/*`, one app) | |

Slices 6–8 are one product surface but three slices: the cabinet **composes**, it does not own other domains' data (R2, D8).

> **Renumbered 2026-07-28.** The old slice #5 `requests` was REMOVED from the product — the
> auto-request behaviour it delivered collapses at scale (once every loosely-matching company
> answers, the customer gets exactly the noise ASK exists to remove), and the backend deleted the
> `request` domain on 2026-07-21. Docs archived to `features/_archived/requests/`, which carries
> the full rationale. **UF 3.1 item 1's "Requests" tab is unaffected** — the vision itself says
> "these are all chats", and it is composed from `@/chats`.

**Corrected 2026-08-02 — item 10's crawlability premise was FALSE, and it had
already caused one defect.** The row used to read *"D23 put every `/app/*`
surface behind the auth gate, so none of them is crawlable"*. `Locks.md` states
the exception in the same breath as the rule: **`/app/auth/*` is the ONLY
logged-out-reachable `/app` subtree.** Login and register are therefore fully
crawlable, and they shipped with no `robots` tag — while
`/app/business/register`, which RequireAuth makes unreachable, carried one
justified by quoting this very sentence. The generalisation was applied where it
did not hold and skipped where it did (AUDIT_2 **N9**, closed 2026-08-02).
**What this means for item 10:** the auth pages now carry `robots:{index:false}`
per-route, but `robots.ts` must still `Disallow: /app/` explicitly rather than
trust the gate — a future logged-out-reachable page under `/app` (a public
storefront, a shared link) would otherwise be indexed the day it lands, with
nothing in the tree to stop it. Sitemap stays marketing + legal only.

### Parked fixes (2026-07-14 audit) — attach to the item that triggers them

- [x] **With slice #1 (landed 2026-07-15):** R4 teeth — a small custom flat-config rule `local/no-cross-element-relative-import` catches a relative import escaping its element to a *legal* target (illegal targets were already caught by `boundaries/dependencies`). Proven by `lint-fixtures/src/auth/bad-r4-relative-escape.ts` + a clean within-slice fixture (see the dated §4 note in the architecture doc). All of R1–R5 now carry ESLint teeth.
- [ ] **With item 10 (the landing):** the smoke test locates the `/app` link via bare `getByRole("link")` — it breaks on ambiguity the moment the landing gains a second link. Scope it by `href`, not by accessible name (name would couple the test to translated copy).
- [ ] **With item 10 (the landing): `public/logo_vertical.svg` has no consumer yet** (2026-07-16 audit, P8.1). The asset was exported with `logo_horizontal.svg` but nothing in `src/` references it; the landing is its expected first consumer. If the landing ships without it, delete it then.
- [x] **Done early (2026-07-21, with the platform guard — D23): `/terms`, `/privacy` AND `/cookies` now exist** as static, content-only routes under `app/(marketing)/` (owner rule 3 — legal pages live OUTSIDE `/app`). The register agreement + the nav "Learn more" links resolve; no change to `auth`. Bodies are a neutral "being prepared" placeholder — the legal copy is still the owner's to write, never invented client-side (P9.1). The three pages are `noindex` while placeholder, so they stay out of search results and are never surfaced as the real documents. **LAUNCH BLOCKER (item 12):** owner-authored Terms / Privacy / Cookies copy MUST replace the placeholders before launch — the register consent checkbox links to these pages, so shipping live consent against placeholder text is not acceptable in production; removing each `noindex` (and adding SEO metadata) is the same step, with the full landing (item 10).

### Auth follow-up — record the registration consent (found 2026-07-28, a LIVE defect in shipped slice #1)

**The sign-up consent checkbox currently goes nowhere.** `RegisterForm` collects
`acceptedUserAgreement` and `hooks.ts` sends it, but the backend removed that field from
`CustomerRegisterRequest`, and Spring Boot ignores unknown JSON properties by default — so
registration returns 201 and the consent is silently discarded. Nothing in the UI reveals it.
This is a legal artefact, not decoration: the checkbox links to Terms/Privacy and gates the form.

- [x] **DONE 2026-08-01.** After a successful `verify` (the point where a Bearer token first
      exists), `useVerifyStep` calls `POST /api/v1/legal/registration-acceptances` with the codes
      the form actually presented — `USER_TERMS` + `PRIVACY_POLICY` — plus the active `locale`.
      `acceptedUserAgreement` is gone from the register body; `countryCode`/`locale` are now sent
      there instead. An interim implementation had put the call in `RoleSelectionModal`, which
      recorded nothing for the "business" answer and recorded consent for Google sign-ups that
      are shown no agreement — see `features/auth/contracts.md`.
- [ ] **Do not invent the document set.** `GET /api/v1/legal/documents` is in the backend's public
      allowlist but has **no controller**, so the client cannot discover which documents/versions
      are active. Send only the two codes the form visibly links to, and raise the missing endpoint
      (cross-repo table). Sending codes for text the user was never shown would be a worse defect
      than the one being fixed.
- Blocking-adjacent to launch item 11: shipping live consent against placeholder legal copy is
  already called out there. This item makes the consent *recorded*; that item makes it *true*.

### Auth follow-up — Google OAuth (owner directive 2026-07-19, an addition to shipped slice #1)

Both gates that parked this are now cleared: Google login is in `PRODUCT_VISION.md` UF 1 and the `Email-only auth` lock is reversed. Google OAuth is now **required** on the Log in and Sign up pages. Docs are written (auth `contracts.md` / `ux-ui-flow.md` / `README.md` / `locks.md`); implementation is pending.

- [x] **Frontend — SHIPPED (verified 2026-08-01, driven end to end against a real Google
  account).** `src/app/oauth/callback/page.tsx` (transient exchange page) + a "Continue with Google" secondary button on `LoginForm` and `RegisterForm` + a per-request `credentials` option on `httpClient`. The callback applies the session via `applySessionTo` and lands on Home (`POST_AUTH_PATH`), identical to verify/login; the role modal is armed from **`?registration=1`** on the callback URL. i18n `auth.oauth.*` in ru/kk/en. Optional `NEXT_PUBLIC_OAUTH_ENABLED` flag so the button never renders dead. **Consent copy added 2026-08-01** — the Google button registers as well as signs in (`CustomOAuth2UserService` creates the account for an unknown email, from the Login page too), so both pages state the agreement beside the button and `useOAuthCallback` records `USER_TERMS` + `PRIVACY_POLICY` on a first-time sign-up. *(Corrected 2026-08-01: this line described the callback as routing via `startRoute` and arming the modal from `suggestRoleExpansion` — the first was deleted with the route mappers, the second was deleted by the backend on 2026-07-30.)*
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
| **G1 — ✅ CLOSED 2026-08-04** | **Every blocker delivered by backend `c56f75c` + `526871a`.** `MAX_CANDIDATES` is GONE (the gateway returns a real `Page<SearchHitDto>` with a true `hasNext`), `page` lost `@Max(20)`, `unique_offers` joined the sort regex, `explicitFilters.businessIds` (max 100) is the Companies filter, `explicitFilters.mapArea` is the bounding box, and `SearchResponse.companyFacets` supplies the Companies option list — computed with every filter EXCEPT `businessIds`, so selecting a company never collapses the multi-select. **Infinite scroll and all three parked controls are buildable.** Three NEW backend asserts constrain the UI: `sort=distance` requires `userLocation`, and `city`/`radiusMeters`/`mapArea` are mutually exclusive | Nothing. Everything ships | **CLOSED** |
| **G3 — ✅ CLOSED 2026-08-04** | **Delivered by `c56f75c`.** `PurchaseDestination {label, url}` is an `@ElementCollection` with `@OrderColumn(display_order)` on BOTH `Item` and `Service`, and `SearchCardResponse.purchaseDestinations` carries it to the card. The product answer landed first (`098fd44`), the code second — exactly the order their contracts.md prescribed | Nothing. The button is buildable with the Product Card (roadmap #3) | **CLOSED** |
| **G1** | **Search sort & filter contract — NARROWED 2026-07-28** (re-read against `dev` `ee542d9`). The vision (§4) wants sorts relevance / distance / cost / unique-offers and filters price / companies / location (100 km · city · map area). `POST /api/v1/search` supports sorts `relevance` · `distance` · `price_asc`, and `explicitFilters` for `minPrice`/`maxPrice`, `city`, `category`, `country`, `openNow`, **and `radiusMeters` (1–100 000)**. **The 100 km radius is DELIVERED** — that control leaves the parked list. **Still missing:** a Unique-Offers sort, a Companies filter, and a map-area (bbox) filter. The lock still forbids faking any of these by re-sorting a loaded page client-side. **OPEN QUESTION added 2026-07-29 (backend commit `9a90f5c`, not yet resolved — see below).** | Three controls: the Unique-Offers sort tab, the Companies filter, and map-area. **Ships now:** Home, the search form + mode toggle, the Catalog Page, sectioned results, result cards, the relevance/distance/cost sorts, and price/city/category **+ the 100 km radius** filters. | **SCOPE RESOLVED 2026-08-02 (owner): server-side always + infinite scroll — see below.** The three controls stay parked, but their nature changed: they now REQUIRE real server params (a client-side layer is forbidden), and infinite scroll is additionally blocked by `MAX_CANDIDATES = 200` |
| **G1b** | **Search `mode` — RESOLVED 2026-07-28 (owner).** `mode` is `@NotNull` and `SearchScope` admits only `ITEM`/`SERVICE`; there is no "search everything", so something must choose. | Nothing. The search form gets a **goods/services toggle**, appended to PRODUCT_VISION UF 2.1 with justification. The `No product/service scope toggle` slice lock was retired the same day — its premise (a unified endpoint where the AI infers intent) no longer exists. | **CLOSED** |
| **G2** | **Company Profile scope.** The vision marks it "coming in a future update"; no backend endpoints exist. | Nothing. The placeholder IS the spec — ship it and move on. Re-open when the vision describes a screen. | Open, not blocking |
| **G3 status update, 2026-08-02 (backend `098fd44`/`b02105a`)** | **The backend AGREED, in its own authorities — and then did not build it yet.** `098fd44` is documentation-only and writes our raise into `Ask_Backend/AI_Knowledge/ProductVision.md` (*"An Item or Service may publish multiple labeled customer purchase destinations… never to a branch"*) plus **two new locks each** on `item/locks.md` and `service/locks.md` — destinations belong to the entity, and verification/moderation links are never eligible. Verified at `b02105a`: `Item.deepLink` is **still a single `String`**, `Service` **still has none**, and the search projection **still does not carry them**. Their own `item/contracts.md` states the order: the singular field *"must be replaced or migrated before this target contract is exposed"*, and public search *"must expose the Item purchase destinations before the customer-facing `Proceed to Purchase` action is rendered."* | Unchanged — one button's click handler | **PRODUCT-CLOSED, BACKEND-BLOCKED.** Nothing is owed by the owner or by us; the raise is agreed and queued. Do not re-ask it |
| **G3** | **What does "Proceed to Purchase" do? — RE-OPENED 2026-07-28: its candidate is DEAD.** The vision puts the button on the Product Card, but we are explicitly NOT a marketplace and there is no checkout. The standing answer was the backend's `contact` module (`contactActionId` privacy pattern) — **that module was DELETED 2026-07-21**, and `contactActions` is gone from `SearchCardResponse`. No contact-action concept remains anywhere on the wire. What survives on the card is `businessProfile.{number, email, websiteUrl, instagramUrl, telegramUrl}` — the business's **public** channels, NOT a privacy-preserving handle. Routing the button there exposes real contact details, which is a product decision, not a fallback an agent may choose. | One button's click handler. **Ships anyway:** the whole Product Card — every field, the modal, and the chat button. | **RESOLVED 2026-08-02 (owner), appended to PRODUCT_VISION UF 2.1.** Seller-supplied public **deeplinks** → a modal to choose where to buy when there is more than one → in-app chat with an editable, never-auto-sent draft when there are none. Verification links are NEVER reused as a customer deeplink. **Now blocked on backend, not on product:** `deepLink` must become a collection, `Service` has no such field at all, and the search projection does not carry it |
| **G4** | World-wide domain/brand choice (ask.kz is KZ-branded) | Nothing before Phase 4 | Open, not urgent |

### G1 — RESOLVED 2026-08-02 (owner): server-side always, plus infinite scroll

**The answer is none of the three options below — it is stronger than option 2.** Filtering and
sorting are performed by the SERVER across the whole catalogue, always; the client never refines
only the cards it holds. Pagination is replaced by **infinite scroll** on phone and desktop:
changing a filter or sort resets the list, re-queries the server, and scrolling appends the rest.
Appended to `PRODUCT_VISION.md` §4 the same day with its justification.

**Consequences, worst first:**

1. **The three parked controls now REQUIRE server parameters.** Unique-Offers sort, Companies
   filter and map-area (bbox) can no longer be delivered as a client-side refinement layer — the
   decision forbids exactly that. This turns a "nice to have" into a hard cross-repo dependency.
2. **`MAX_CANDIDATES = 200` makes "until they run out" impossible today.**
   `StructuredSearchProcessor:49` caps ranking at 200 candidates for ANY page, and `page` is
   `@Max(20)` besides — so infinite scroll hits a wall at roughly 200 results however many items
   match. **This blocks the whole item.**
3. **The backend's own lock now contradicts the owner.** `Ask_Backend/AI_Knowledge/features/search/locks.md`:
   *"Results Filter & Sort V1 only reorders or removes cards from the currently loaded page."*
   It must be retired. Note the backend already SHIPPED server-side filtering
   (`SearchFilterRequest`: category, city, country, minPrice, maxPrice, openNow, radiusMeters,
   with a cross-field assert) — the lock contradicted its own code before it contradicted us.
4. **`search/` gains a `store.ts`.** Accumulated pages must outlive a render, which reverses
   `hooks.ts`'s "nothing here needs to outlive one render" premise. Legitimate: the store holds
   honest server pages, it does not refine them.

Our own `features/search/locks.md` server-capability lock is **confirmed, not changed**.

The original ambiguity, kept because it records why the question was asked:

### G1 — scope question added 2026-07-29, NOT decided (documented only, per owner instruction)

Backend commit `9a90f5c` added a `search/locks.md` lock and a `search/ux-ui-flow.md`
section describing **"Filter & Sort V1"**: relevance is the only server-ordered
pass; distance/cost/unique-offer ordering are described as **client-side
reorderings** of the cards already loaded for the current page (no new search
request), and price/company/city/radius/map-area are described as **client-side
removals** from that same loaded set, with company choices/counts "derived from
the same loaded cards."

Read literally, that also covers price/city/radius/distance/price_asc — filters
and sorts this client currently sends to the SERVER on every change (`hooks.ts`
`useUpdateCatalogParams` → `router.push` → route re-fetch). That would reverse
the existing lock ("never re-sort or re-filter a page of results client-side,"
`search/locks.md`) for more than just the three gate-parked controls, and would
mean today's `hooks.ts` premise ("nothing here needs to outlive one render, no
`store.ts`") no longer holds.

**Not resolved which of these it means:**
1. ALL catalog filters/sorts move client-side over one loaded page (bigger
   change — new client state, rewritten `SortControl`/`FilterPanel`, locks.md
   rewrite).
2. Only the 3 previously-parked controls (Companies, Unique-Offers sort,
   map-area) become a new client-side refinement layer ON TOP of today's
   server round-trip, which keeps working unchanged for relevance/distance/
   price_asc/price/city/radius.
3. Raise the ambiguity with backend before either.

No implementation should start against this gate until someone (not an agent
inferring from backend prose) picks one of the three.

**→ Answered 2026-08-02 (see above). None of the three was chosen: the owner ruled
server-side-always, which is stricter than option 2 and the opposite of option 1. Option 3's
"raise it with backend" still happens — not to resolve OUR behaviour, which is now settled, but
because the backend's lock and its own `SearchFilterRequest` disagree, and that is theirs to fix.**

## Cross-Repo Dependencies

What the frontend needs FROM `../Ask_Backend` — tracked here because a missing piece blocks a phase, not because we own it.

> **Re-verified 2026-08-02 against backend `dev` `b02105a`** (two commits past the `cdc47dc`
> both audits were written on). **No row below was closed by those commits.** `098fd44` agreed
> the G3 CONTRACT in the backend's own vision and locks without implementing it; `b02105a`
> shipped catalog image galleries, which is new capability rather than a listed dependency.
> The G1 rows in particular are untouched: `MAX_CANDIDATES` is still `200`, `page` is still
> `@Max(20)`, the sort regex still has no unique-offers value, `SearchFilterRequest` still has
> no companies or bbox filter, and the contradicted `Results Filter & Sort V1` lock is still
> in `Ask_Backend/AI_Knowledge/features/search/locks.md` verbatim.

| Need | For | Status |
|---|---|---|
| **Confirm that `search/README.md`'s "match reasons … are not displayed" is a note about the BACKEND's own UI, not a product change** | The result card's "why this matched" list, which we render today | **RAISED 2026-08-02 (owner ruling: keep rendering them).** `b02105a` rewrote the backend's § *Result presentation* to say match reasons *"remain response metadata but are not displayed"*. `PRODUCT_VISION.md` makes that list the intent layer's core affordance and the thing that distinguishes ASK from marketplace ranking, so we continue to render it. Flagged because two authorities now disagree in writing, and the next agent to read the backend's prose first (as CLAUDE.md instructs) will see a contradiction. **The rest of that section — hover-preview panel, mobile detail modal — is likewise not adopted**; only the primary card image was, via the owner's vision append |
| **Resolve a KATO place to a `cityId`** — by KATO **code**, or by seeding KATO codes onto the `city` table, or by accepting a city NAME on `CreateBranchRequest` and matching server-side | **B3 — `cityId` on drafted branches.** Without it `branch_city` is null and every branch registered through this UI is invisible to the city filter | **RAISED 2026-08-02, replacing the "verify the overlap first" note both audits carried. The overlap was MEASURED and it is ZERO:** the `city` table is 23 bare Russian names (`V2__reference_data.sql` — `Алматы`, `Кокшетау`, …) while KATO always carries a type marker (`г. Алматы` / `Алматы қ.`). Across all **11 954** KATO names in both languages, exact matches: **0**. `GET /cities/resolve?name=` would 404 on every call. **Not fixable client-side:** KATO holds `с. Караганда` (village) beside `г. Караганда` (city), so prefix-stripping silently files a rural branch under the city — worse than the honest null. `KzPlace` already carries `code`, the real classifier key, precisely so it can be reconciled |
| **Raise `MAX_CANDIDATES` (currently 200) and the `page` `@Max(20)` ceiling** | **Infinite scroll (G1).** `StructuredSearchProcessor:49` caps ranking at 200 candidates for ANY page: `candidateLimit = min(200, max((page+1)*pageSize*3, pageSize*3))`. At the default `pageSize` of 20 the scroll dies around page 10 — **~200 results maximum per query, however many items match** | **RAISED 2026-08-02 — BLOCKS G1 ENTIRELY.** The owner's rule is "scroll until the goods or services run out"; today they run out at 200 because of the ranking window, not because the catalogue ended. Needs a deep-paging strategy, not just a bigger constant |
| **Retire the `Results Filter & Sort V1` lock** | G1 | **RAISED 2026-08-02.** `Ask_Backend/AI_Knowledge/features/search/locks.md` says refinement "only reorders or removes cards from the currently loaded page". The owner ruled the opposite on 2026-08-02 (PRODUCT_VISION §4). Note it also contradicts the backend's OWN code: `SearchFilterRequest` already implements server-side `category`/`city`/`country`/`minPrice`/`maxPrice`/`openNow`/`radiusMeters` with a cross-field assert |
| **`deepLink` as a COLLECTION on Item, plus the same field on Service, plus both in the search projection** | **G3 — the "Proceed to Purchase" button.** Three separate gaps: (1) `Item.deepLink` exists but is a single `@Size(max=2048) String` — the owner approved MULTIPLE deeplinks with a chooser modal, so it needs to be a list of label+URL pairs (e.g. `KASPI`/`OZON`/`WEBSITE` + url), or the modal renders bare URLs; (2) **`Service` has no `deepLink` at all** — 0 hits in `offer/service`; (3) `SearchDocument` does not carry it, so it never reaches `SearchCardResponse` and the Product Card cannot see it | **RAISED 2026-08-02 — (3) BLOCKS G3 ENTIRELY.** **Scope ANSWERED 2026-08-02 (owner): the deeplink belongs to the ITEM or SERVICE, never to a branch.** A branch is a physical place; the only link that would ever hang off one is a map/location link, which is a different concept and is NOT part of G3. So the shape is a list of label+URL pairs on the item — no branch foreign key, no per-branch variants. Several deeplinks on one item means several places to buy the SAME item, which is exactly the case the chooser modal exists for. **Explicitly out of scope:** `kaspiUrl`/`ozonUrl`/`wildberriesUrl` from onboarding — `SellerOnboardingProcessor:64` writes those to `BusinessVerification` as proof the business is real, and reusing verification data as a shopping link is forbidden by the vision append |
| Unique-Offers sort, Companies filter, and a map-area (bbox) filter on `POST /api/v1/search` | G1 → the last three Catalog Page controls | **Radius DELIVERED 2026-07-27** as `radiusMeters` (1–100 000) — the vision's 100 km filter is now buildable. These three remain, and **as of 2026-08-02 they are a HARD dependency, not a preference**: the owner ruled all filtering/sorting server-side, so a client-side refinement layer is no longer an available fallback |
| **A public item/service read — `GET /api/v1/items/{id}` (or equivalent)** | **Slice #3's `/app/product/:id` deep link.** There is NO public item endpoint on `dev`: the security allowlist permits only `/search`, `/cities`, `/categories`, `/businesses/*/business-profile`, `/businesses/*/drops`, `/business-media/files/*`. `/api/v1/businesses/{id}/items` is authenticated AND business-scoped — a list endpoint, unusable as a detail read. The Product Card modal ships from the search payload; the deep link cannot | **RAISED 2026-07-28 — blocks the `/app/product/:id` half of D10 only; the modal ships** |
| **Populate `openingSummary` on `SearchCardResponse`, or remove the field** | An open/closed indicator on result cards | **RAISED 2026-07-28.** Declared on the DTO but never assigned in `StructuredSearchProcessor.toCard()` — always null. (`BranchResponse` populates it correctly; the search card does not.) Same failure shape as `suggestRoleExpansion` |
| **Return badge TOKENS, not English prose** — `badges[]` currently emits literal `"official channel"`, `"complete card"`, `"pickup"` | Result-card badges in ru/kk | **RAISED 2026-07-28 — not blocking.** The client maps the three known tokens to i18n keys and drops unknown ones (slice lock), so nothing ships in English. A stable token contract would make that mapping safe against a silent backend addition |
| **A way to READ a user's legal acceptances** — either `pendingLegalDocuments` (or equivalent) on `AuthSessionResponse`, or `GET /api/v1/legal/acceptances` | **The consent GATE** (owner decision 2026-08-01): users with no acceptance on record get a blocking modal over the platform until they accept. That design is what makes best-effort consent writing safe — a write lost to a network error self-heals at the next load — but it needs to know WHO to gate | **RAISED 2026-08-01 — blocks the gate entirely.** `kz/ask/legal/api/LegalController` is write-only: `POST /acceptances`, `POST /registration-acceptances`, and **no `@GetMapping` anywhere in `kz/ask/legal/`** (verified against `dev` `cdc47dc`). `AuthSessionResponse` carries no consent field either. The data exists (`LegalAcceptance`, `LegalAcceptanceRepository`) and is simply not exposed. **Prefer the SESSION field:** the gate must cover every `/app/*` route and the session is already re-read on every restore, so a separate GET would add a round-trip to every load — the same reasoning that makes `canAccessDashboard` a session-derived predicate. Pairs with the `/legal/documents` row below: knowing who has accepted is only half the answer without knowing which documents are active |
| **`GET /api/v1/legal/documents` — in the public allowlist, but NO controller exists** | Knowing which legal documents/versions to submit to `POST /api/v1/legal/registration-acceptances` | **RAISED 2026-07-28.** Also flagged: `/api/v1/businesses/*/storefront` is allowlisted with no controller. Two dead entries in `SecurityConfig` |
| The "Proceed to Purchase" contract | G3 → the Product Card | **RE-RAISED 2026-07-28.** The `contact` module that was the presumed answer was deleted 2026-07-21; the gate needs a fresh product answer, not a follow-up |
| ~~CORS origin for THIS client~~ | Any browser call to the real backend | **✅ FULLY RESOLVED — verified 2026-08-02 at `b02105a`, row kept per this file's own rule.** Local dev landed 2026-07-18; the **deploy-domain half is now done too** and this row had not noticed. `application.yml` and `application-prod.yml` both carry `ask.cors.allowed-origins` = `https://ask.com.kz`, `https://stage.ask.com.kz`, **`https://ask-frontend-stage-ask7.vercel.app`** (our Vercel host), alongside the localhost:3000 pair. Nothing is pending. **Do not re-send this raise** — it was still on the outbound list as "deploy domain pending" and would have asked the backend for work already shipped, which is exactly the `suggestRoleExpansion` failure recorded two rows below |
| `GET /api/v1/auth/session` returns a real `access_token` under `ASK_SESSION` cookie auth | Google OAuth on the auth pages — the option-2 cookie→Bearer hand-off (`features/auth/contracts.md`) | **DONE 2026-07-19 (Final Major Update):** `/session` accepts the bridge cookie, returns the HS256 JWT + `expires_in`, then clears the single-use `ASK_SESSION`. Frontend fully unblocked |
| `OAUTH2_FRONTEND_REDIRECT_URI` per environment + Google Console redirect URIs + `OAUTH2_GOOGLE_CLIENT_ID/SECRET` set | Google OAuth redirect landing on `/oauth/callback` | Dev/prod defaults aligned to `:3000`/`ask.com.kz` (2026-07-19); **stage must override** the redirect URI, and Google Console must whitelist each backend callback |
| **Redeploy `localhost:2020` / the shared backend from `dev`** — it was last seen running a `master` build | **This client targets `dev`** (owner decision 2026-07-27). Until the redeploy: sign-up's verify step fails (`master` wants `auth_challenge_id`, we send `verification_id`), `POST /api/v1/business/onboarding` **404s** so `/app/business/register` cannot complete, and `GET /categories` returns a tree instead of the flat suggestion list the combobox reads. All three clear on redeploy; none is a client defect. **Slice #2 raises the stakes:** `POST /api/v1/search` on `master` still speaks the old `scope`/`intent_match`/`filters`+`overrides` shape, so the reconciled contract cannot be verified against a `master` build at all | **STILL OPEN — re-probed 2026-08-02 and `:2020` is DOWN** (connection refused, no response at `/actuator/health`). Which branch it would serve remains unverified, exactly as on 2026-07-28. Probe before trusting any local result; do not assume `master` OR `dev` from a prior session's note |
| ~~**Populate `suggestRoleExpansion` on `AuthSessionResponse`**~~ — declared and assigned nowhere (2026-07-27) | The role-choosing modal (PRODUCT_VISION UF 1 step 3) | **RESOLVED 2026-07-30 — this need no longer exists; row kept per the file's own rule.** The backend **deleted** the field outright (re-verified 2026-08-01: zero hits in `src/main/java`) and closed the gap a better way — `CustomOAuth2UserService` sets `registrationRequired = user == null` and `OAuth2AuthSuccessHandler` appends **`?registration=1`** to the callback redirect. Both halves are now served by real backend data: email sign-up arms the modal from `purpose === "REGISTER"` on the challenge, Google from that query param. **The row stayed "RAISED — blocking the OAuth half" until 2026-08-01**, asking the backend for a field it had already removed, while the work it claimed to block had shipped |
| ~~Decide what happens to `acceptedUserAgreement`~~ — **ANSWERED by the backend 2026-07-28** | The register agreement checkbox is a legal artefact, not decoration | **RESOLVED — now a CLIENT task, see the auth follow-up below.** The backend shipped a `legal` module: `POST /api/v1/legal/registration-acceptances` (Bearer) taking `documentCodes` from `USER_TERMS · PRIVACY_POLICY · SELLER_TERMS · PERSONAL_DATA_CONSENT · MANAGED_IMPORT_TERMS · PROHIBITED_PRODUCTS_POLICY · CONTENT_POLICY`, plus `countryCode` and `locale`. The consent has a real home; the client is what has not moved |
| `AUTH_VERIFICATION_TEST_MODE=false`, real secrets, prod CORS origins | Phase 1 · Launch | Backend-owned |

Architecture decisions D1–D10 live in `ARCHITECTURE_PATTERN_FRONTEND.md` §11 — that is the decision log. This file plans; it does not decide.
