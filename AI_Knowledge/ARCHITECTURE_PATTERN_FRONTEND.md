# Frontend Architecture Pattern: Vertical Slice Architecture (VSA) on Next.js

Status: **normative** (V1 — greenfield, 2026-07-14). Every human and AI agent MUST read this before writing or moving frontend code. If a change cannot satisfy these rules, stop and raise the conflict instead of improvising.

This document defines the pattern, the strict rules, the enforcement config, and the decision table. What the product IS lives in `PRODUCT_VISION.md`; this file only governs code structure.

This file lives in `AI_Knowledge/` — the repo's one knowledge home. Its siblings:

**CORE authorities** (normative, same status as this file, never compressed):

- `PRODUCT_VISION.md` — the product authority: users, flows, features, filters (D9). The frontend is built from this file plus the AskBackend API — nothing else.
- `DESIGN_PATTERNS_FRONTEND.md` — code-level principles (P-rules); cite alongside these structure rules.

**The living layer** (built on top of the CORE, grows with the code):

- `ROADMAP.md` — phase plan, the DONE definition for a slice, and the open decision gates. It answers *when and in what order*; this file only answers *where*.
- `Locks.md` — invariants. A violation means STOP and ASK; breaking one needs explicit approval.
- `Changelog.md` — dated decisions and their rationale.
- `features/{slice}/` — one folder per slice (`README.md`, `contracts.md`, `ux-ui-flow.md`, `locks.md`), mirroring the AskBackend knowledge system. A **feature folder == a slice, 1:1**; adding a slice means adding its folder in the same commit as §2 and the §8 ESLint pattern.

**Protocol** (at the repo root, read first):

- `../CLAUDE.md` / `../AGENTS.md` — session start, knowledge tiers, before/after-change checklists, lock system, tool routing, commit rules.

References (background, not authority — this file is the authority for this repo):

- Vertical Slice Architecture — Jimmy Bogard: https://jimmybogard.com/vertical-slice-architecture/
- Screaming Architecture — Robert C. Martin: https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html
- Bulletproof React (feature folders + ESLint boundaries): https://github.com/alan2207/bulletproof-react

## 0. Mental Model (read this first)

`src/` contains exactly three kinds of folders:

| Kind | Folders | Job |
|---|---|---|
| Wiring | `app/` | Next.js App Router = the composition root: route files, layouts, providers, global styles, and the content-only marketing landing (D6). Zero business logic. |
| **Domains** | `auth/`, `search/`, `catalog/`, … (full list in §2) | One folder per **backend module**. Owns everything about that domain: pages, components, API calls, types, state. |
| Toolbox | `shared/`, `design-system/`, `lib/` | Domain-free materials (Button, httpClient, tokens). Knows nothing about the business. |

The folders next to `app/` are **business domains, never features**. A feature (search bar, product editor, offers manager) is always a subfolder inside the domain that owns its data — it never becomes a top-level folder. Placement test: **"Which backend module owns this data?" — that module's slice is the folder.** There is no "main page" domain: a page belongs to the domain that does its main job (Home is a search entry → `search/`).

Every domain is a room with **one door**: everything inside is private except what `index.ts` exports (§3). The import laws in three sentences: domains may use the toolbox, the toolbox never uses domains (R1); domains use each other only through the door, never through a window (R2); `app/` sees everyone, no one sees `app/` (R3). These are enforced by ESLint at build time (§8) — laws, not advice.

**Domain-aware vs domain-free.** Domain-aware code knows something about the business — a business word (search result, request, supplier, product, service, business, branch, unique offer) appears in its names, props, types, or strings; it must live in a slice, never in the toolbox. Domain-free code knows only mechanics (UI, transport, platform) and may live in the toolbox. Transplant test: copy the file into an unrelated product (a bank app) — works unchanged → domain-free; needs edits or sounds absurd → domain-aware. Heavy reuse does NOT make code domain-free (§6), and props decide, not looks: a card taking `product: Product` is domain-aware; the same card taking `title, price` strings can be domain-free.

Reuse across domains is decided by the **ownership test (D8, §5)**: *same knowledge → import from the owner; same looks → copy.* Domain-free code follows the rule of three (§5).

## 1. Pattern Summary

Code is organized by **business domain (slice)**, not by technical layer. Each slice owns everything for its domain: pages, components, API calls, models, and state. Slices mirror the AskBackend module names so one mental map covers the whole product (D1). Next.js provides rendering and routing; it does not change the slice rules — route files are thin wiring (§2).

Layer-based taxonomies (`entities/`, `features/`, `widgets/`, `components/`+`services/`+`utils/` splits) are forbidden. Do not create them.

### Deviations from canonical VSA

This is a deliberate hybrid, not textbook Vertical Slice Architecture. When external VSA articles disagree with this file, this file wins.

| Aspect | Canonical VSA | This project | Borrowed from |
|---|---|---|---|
| Slice granularity | Slice = use case ("AddToCart", "CancelOrder") | Slice = **business domain** ("search", "chats"); use-case subfolders allowed inside a slice if it grows | Package-by-feature / modular monolith |
| Slice internals | Free-form per slice | **Fixed anatomy**: `index.ts`, `api.ts`, `model.ts`, `hooks.ts`, `store.ts`, `ui/` (§3) | FSD segments |
| Slice boundary | Informal — "minimize coupling", relies on team discipline | **Public API via `index.ts`**, deep imports forbidden, ESLint-enforced (R2, §8) | FSD public API |
| Cross-layer imports | Not regulated | **One direction only** (slices → shared, never back) + formalized `shared` with the zero-business-logic litmus test (R1, §5) | FSD import rules |

Project-specific constraints found in neither VSA nor FSD:

- **D1:** slices mirror AskBackend module names — one mental map across the whole product (and 1:1 mapping to future services if backend modules are ever extracted).
- **D5:** slice `api/model/store` files stay platform-neutral — load-bearing TODAY because they run on the server during SSR (D7), and again later for React Native shared packages.

Rationale for the hybrid: canonical VSA's known weakness is that cross-slice coupling depends on team discipline. This codebase is written mostly by AI agents, which have no discipline across sessions — so boundaries must be compile-time rules, not conventions. We take cohesion from VSA, enforcement mechanics from FSD, and skip FSD's layer taxonomy entirely.

Presentation one-liner: **"Vertical Slice Architecture with enforced boundaries, on Next.js"** — domain-cut slices mirroring backend modules, fixed slice anatomy with public APIs, import rules enforced by ESLint, rendering wired through thin App Router route files.

## 2. Directory Layout (target)

The routes implement the V1 user flows from `PRODUCT_VISION.md` (UF 1, UF 2.1–2.3, UF 3.1). One Next.js app serves both surfaces: the marketing landing at `/` and the platform under `/app/*` (D6).

```text
Ask_Frontend/                    # ONE Next.js app: marketing at `/`, platform at `/app/*` (D6)
  e2e/                           # Playwright end-to-end tests — drives the built app; never imported by src/
  public/                        # static assets served as-is (logo, og images, videos) — NOT the favicon (see §2 note 2026-07-15)
  next.config.ts
  src/
    app/                         # Next.js App Router = the composition root (R3).
                                 # Wiring + content-only marketing pages. ZERO business logic.
      layout.tsx                 #   root layout: <html>, fonts, providers
      icon.svg                   #   favicon — App Router metadata file, auto-injected as <link rel="icon">
      globals.css                #   global styles entry (Tailwind v4 + design-system tokens)
      providers/                 #   client components MOUNTING contexts; logic/hooks live in slices (R6)
      _components/               #   app chrome: navigation menu, profile card, footer — used only by layouts here
      (marketing)/               #   Landing Page (UF 1) + legal pages: static, SEO-first, CONTENT ONLY —
        page.tsx                 #     imports shared/ + design-system only; never slices, no api/store
        LandingRedirect.tsx      #     client island: logged-in `/` visitor → /app unless ?from=app (D6, rule 5)
        terms/page.tsx           #     /terms    → legal page, OUTSIDE /app (owner rule 3, D23)  [static]
        privacy/page.tsx         #     /privacy  → legal page, OUTSIDE /app (owner rule 3, D23)  [static]
        cookies/page.tsx         #     /cookies  → legal page, OUTSIDE /app (owner rule 3, D23)  [static]
                                 #   (`demo/` — the D24 DESIGN LAB — was DELETED 2026-08-01, D31)
      app/                       #   the platform under /app/*
        layout.tsx               #     platform shell: mounts LocaleProvider (D18) — NO nav
        auth/page.tsx            #     /app/auth          → redirect to /app/auth/login
        auth/login/page.tsx      #     /app/auth/login    → @/auth LoginPage (email+password)  [client]
        auth/register/page.tsx   #     /app/auth/register → @/auth RegisterPage (email+code)   [client]
        (main)/                  #     route group (no URL segment) — the GATED, nav-bearing pages
          layout.tsx             #       RequireAuth gate (D23, rule 2) + NavigationMenu; auth sits OUTSIDE this group (ungated, no nav)
          page.tsx               #       /app             → @/search HomePage (+ role modal)  [server]
          catalog/page.tsx       #       /app/catalog     → @/search CatalogPage              [server]
          product/[id]/page.tsx  #       /app/product/:id → @/catalog ProductCard (D10)       [server]
          chats/page.tsx         #       /app/chats       → @/chats                           [client]
          profile/page.tsx       #       /app/profile     → @/profile                         [client]
          business/                #     NOTE: no layout.tsx here — the gate is one level down (D26)
            (cabinet)/layout.tsx   #       RequireDashboardAccess gate — customer-only → /app/business/register (D23 r1, scoped by D26, redirect target by D27)
            (cabinet)/page.tsx     #       /app/business          → @/business-cabinet          [client]
            register/page.tsx      #       /app/business/register → @/business-cabinet           [client]
                                   #         The ONE sibling OUTSIDE (cabinet): a customer must reach
                                   #         it precisely because they are not a seller yet (D26).
                                   #         Still inside (main), so RequireAuth applies.
    auth/                        # ← backend: identity  — Authorization Page, role choosing modal, session (R6)
    search/                      # ← backend: search    — Home (search entry) + Catalog Page (list, sort, filters)
    catalog/                     # ← backend: catalog   — Product Card (modal + page, D10); seller Products tab
    services/                    # ← backend: service   — seller Services tab; service details in the card
    chats/                       # ← backend: chat      — Chats Page, chat thread, business chat views
    # requests/ — REMOVED 2026-07-28 (product decision; see features/_archived/requests/)
    profile/                     # ← backend: identity  — profile card content, settings, sign out
    business-cabinet/            # ← backend: business  — seller workspace shell (UF 3.1): Overview/Requests,
                                 #     Branches, Unique Offers, Company Profile, Company Dashboard;
                                 #     Products/Services/Requests tabs embed the owning slices' features (R2, D8)
    shared/                      # domain-free code ONLY (§5)
      api/                       #   httpClient (usable server- and client-side), transport helpers — NO domain endpoints
      ui/                        #   generic primitives: Button, Input, Card, Modal, Toast, theme-toggle, language-switcher,
                                 #     combobox (filterable pick-one), address-select (the KATO cascade, D30), ...
      geo/kato/                  #   REFERENCE DATA (D30): the Kazakh administrative-territorial classifier —
                                 #     regions/districts eager, one lazily-imported locality chunk per region.
                                 #     Generated by scripts/build-kato.mjs; no domain concept, same tenancy as i18n messages
      i18n/                      #   next-intl plumbing + messages/{ru,kk,en}.json (sanctioned exception, §5) + LocaleProvider (client /app locale switch, D18)
      config/                    #   env access
      theme.ts                   #   the theme mechanism: data-theme store + resolver (D17); domain-free chrome infra
      motion.ts                  #   GSAP utilities: shared ScrollTrigger config, reduced-motion gate (D11)
    design-system/               # CSS tokens and base styles — the single visual source (D3); feeds the Tailwind theme
    lib/                         # platform utilities free of business meaning
```

Backend modules with **no V1 surface** (`autodump`, `contact`) get no slice yet — a slice is created via the process below when the product grows a surface for them.

**Route files are THIN.** A `page.tsx` contains at most: `metadata`/`generateMetadata`, server-side data fetching via the owning slice's `api.ts` (public surfaces), and rendering the slice's page component. No components, no business logic, no styling systems inside route files. The `[server]`/`[client]` markers above are decision D7.

**Product Card presentation (D10):** per the product vision, the Product Card is a modal over the Catalog Page ("Proceed to Purchase" + chat buttons, may open the chat modal directly). Direct visits and search engines get the same card as a full server-rendered page at `/app/product/:id`. Next.js intercepting routes are the sanctioned mechanism (modal in-flow, full page on direct load); both presentations render the same `@/catalog` component.

**Platform boundary (D6):** marketing pages are content-only: they import `shared/` and `design-system/` but never a slice, and have no `api/model/store`. Marketing is the ONLY copy of the marketing content. Logged-in visitors on `/` are redirected to `/app/` by a client-side check of the `ask.accessToken` storage key, suppressed by `?from=app`. The `/app/*` prefix preserves a future `app.` subdomain split without breaking a single URL.

**§2 note — 2026-07-14 (providers):** the tree comment above says `providers/` holds "client components MOUNTING contexts". Precision, learned at scaffold time: the *mounting file itself may be a server component* — `AppProviders` reads next-intl config via `next-intl/server` and renders `NextIntlClientProvider`, which is the client boundary. Do NOT add `'use client'` to a provider-mounting file just to match that comment: it is unnecessary (a client component receiving `children` as props keeps those children server-rendered) and here it would break outright — the file is async and imports server-only APIs. The rule that matters is unchanged: providers are MOUNTED in `app/providers`, DEFINED in their owning slice (R6, P5.3).

**§2 note — 2026-07-15 (favicon placement):** the tree once listed favicons under `public/`. Refined: the FAVICON lives at `src/app/icon.svg` — an App Router *metadata file* Next auto-detects and injects as `<link rel="icon">` (hashed, cached), zero hand-wiring, and it sits in `app/` (the composition root). `public/` stays the home for every OTHER static asset (logo, OG images, videos), referenced by URL. Only the exact names `favicon.ico` / `icon.*` are auto-wired — a file literally named `favicon.svg` is not. Justification: an idiomatic Next.js metadata file beats a hand-written `<link>`, and it keeps asset wiring in `app/` where wiring belongs.

**§2 note — 2026-07-21 (the platform is gated; legal pages sit outside /app — owner rules 1–5):** the `(main)` route group is now the **gated platform**. Its layout wraps every page in `@/auth`'s `RequireAuth` (client guard): a logged-out visitor is redirected to `/app/auth/login` and never sees a `(main)` page or the nav (owner rule 2). The auth pages are the sanctioned exception precisely because they sit OUTSIDE `(main)` — the route-group boundary IS the "gated vs. sign-in entry" line, so no per-URL allowlist exists to drift. `/app/business` adds a nested `business/(cabinet)/layout.tsx` wrapping `RequireDashboardAccess` (moved down a level by D26, so `business/register/` sits outside the gate), so a customer-only session is bounced to `/app/business/register` (owner rule 1, redirect target changed by D27); link visibility (the nav) and route access share ONE predicate, `canAccessDashboard` (auth `model.ts`, P6.2). The guard is CLIENT-SIDE by necessity — the token is in localStorage, not a cookie (D6), so the server/middleware cannot read it; a server/middleware guard waits on the Phase-4 cookie migration (ROADMAP Phase 4). Three **legal routes** — `/terms`, `/privacy`, `/cookies` — were added under `(marketing)/` (static, content-only, D6): the pages every visitor may read live OUTSIDE `/app` (owner rule 3), which also clears the register-agreement 404s (ROADMAP parked fixes). The marketing landing gained a client `LandingRedirect` island carrying a logged-in visitor back to `/app` unless `?from=app` (D6, owner rule 5). The nav has NO signed-out "sign in" entry (owner rule 4) — it only ever mounts inside the guard. Justification + the SEO trade-off on Home/catalog/product are in D23.

**§2 note — 2026-07-21 (the `/oauth/callback` route — completes the tree for Google OAuth):** the tree above omitted a real route that shipped with the required Google OAuth method (PRODUCT_VISION UF 1, owner directive 2026-07-19). `src/app/oauth/callback/page.tsx` serves **`/oauth/callback`** — a **top-level** route, deliberately OUTSIDE both `(marketing)` and `app/`, because it must exactly match the backend's configured `OAUTH2_FRONTEND_REDIRECT_URI`. It is a THIN server route (D7) rendering the `@/auth` `OAuthCallbackPage` client island, which performs the one single-use `ASK_SESSION` cookie→Bearer exchange (`GET /session` with `credentials:"include"`) and redirects on to `startRoute` (token lock, D5/P5.2; features/auth/{contracts,ux-ui-flow}.md). It renders under the ROOT providers only (i18n at `defaultLocale` + the auth store) — NOT the platform layout, so it reads no preference cookie and its shell prerenders **static**; the rendering-contract check (§8 note 2026-07-18) is unaffected (it gates only `/` static and `/app*` dynamic). It sits OUTSIDE the `(main)` gate by the same logic as the auth pages: you cannot require a session to complete a sign-in. Recorded here so §2 stays the complete route map (After-change §6); no new slice, no ESLint-pattern change (it lives under the already-known `app` element).

Adding a **new slice** requires: (1) a matching backend module or an approved product area, (2) an entry added to this file, and (3) the slice name added to the ESLint boundaries pattern in §8 — all in the same commit.

## 3. Slice Anatomy

Every slice has the same internal shape. Files that would be empty are omitted.

```text
src/<slice>/
  index.ts     # PUBLIC API — the only file other slices may import
  api.ts       # AskBackend calls for this domain (built on shared/api/httpClient)
  model.ts     # types, DTO→view-model mappers
  hooks.ts     # data/orchestration hooks (P1.2), composing api.ts + store.ts
  store.ts     # zustand store FACTORY, if the slice needs one (D7)
  ui/          # all components of the slice, pages included
    <Slice>Page.tsx
    ...
```

Rules:

- `index.ts` exports ONLY what other slices/app legitimately need (typically: page components for the router, a few cross-domain components, types). Everything not exported is private. **Named re-exports only — `export *` is forbidden**; the public API stays deliberate and tree-shakable.
- `api.ts` is the only place that calls backend endpoints of this domain. No `fetch`/endpoint strings inside components. `api.ts` MUST be importable from server AND client code (D7): plain functions on `httpClient`, no React, no browser APIs — server route files call it while rendering public surfaces.
- `hooks.ts` holds the slice's data hooks (`useSearchResults()`, `useBusinessProfile()`): a hook composes `api.ts` + `store.ts` and returns state; components consume hooks and render (P1.2). Components and pages never fetch directly.
- `store.ts` exports a store **factory** (`createSearchStore()`), consumed through a React context provider — **never a module-scope `create()` singleton**. Module-scope stores run during server rendering and leak state across requests (D7).
- **`'use client'` policy (D7):** route files and layouts are server components and stay that way. Slice `ui/` components that use state, effects, stores, GSAP, or a Radix-based `shared/ui` primitive declare `'use client'`. Public surfaces (marketing, home, catalog, product card) are server-rendered pages with interactive client islands inside; authenticated surfaces (auth, business-cabinet, chats, profile) are client pages behind a thin server route file.
- Keep `api.ts`, `model.ts`, `store.ts` free of DOM/browser APIs (`localStorage` access goes through `shared/api` storage helpers). This is load-bearing TODAY — these files execute on the server during SSR (D7) — and again later for React Native shared packages (D5).

### Growth inside a slice

A slice grows **down, never sideways** — deeper subfolders, never new top-level folders.

- **Many pages** → flat files in `ui/`, each exported from `index.ts` and given a thin route file in `app/app/` (`search/` owns both Home and Catalog).
- **Many features** → one subfolder per use case inside `ui/`, **private by default** — `index.ts` keeps exporting only what the route files and consuming slices need:

```text
business-cabinet/
  index.ts               # exports ONLY BusinessPage (and deliberately shared components)
  api.ts / model.ts / hooks.ts / store.ts
  ui/
    BusinessPage.tsx     # thin page composing the cabinet tabs
    branches/            # feature subfolders — invisible outside the slice
    unique-offers/
    dashboard/
```

- A cabinet tab that manages ANOTHER domain's data (Products → `catalog`, Services → `services`, the "Requests" tab → `chats`) is built inside the slice that owns the data and embedded into `business-cabinet` via that slice's `index.ts` (R2, D8) — the cabinet is composition, not ownership.
- A feature becomes a new top-level slice ONLY when it maps to its own backend module, via the §2 process (doc entry + ESLint pattern in the same commit).

## 4. Import Rules (strict)

- **R1 — Downward only.** Slices MAY import from `shared/`, `design-system/`, `lib/`. `shared/`, `design-system/`, `lib/` MUST NOT import from any slice or from `app/`.
- **R2 — Cross-slice via public API only.** A slice MAY import another slice, but ONLY from its `index.ts` (e.g. `import { ProductCard } from "@/catalog"`). Deep imports (`@/catalog/ui/ProductCard`) are forbidden.
- **R3 — App is the composition root.** Route files in `app/` import slice public APIs and render their pages; `app/providers` mounts contexts; layouts wrap pages. No slice imports from `app/`.
- **R4 — Aliases only.** All non-relative imports use the `@/` alias. Relative imports (`./`, `../`) are allowed only WITHIN one slice, and never reach above the slice root (`../../` leaving the slice is forbidden).
- **R5 — Minimize cross-slice edges.** Before adding a cross-slice import, check the decision table (§6). Cycles between slices are forbidden; if two slices need each other, the shared piece moves down to `shared/` (if domain-free) or the boundary is wrong — raise it.
- **R6 — Auth is the foundation slice; context ownership.** Any slice may import `@/auth` (current user, role, `useAuth`); `auth/` imports no other slice — the one sanctioned hub stays cycle-free. In general: a React context object and its consumer hook are DEFINED in the owning slice and exported via its `index.ts`; `app/providers` only mounts the provider component (this is how P5.3 coexists with R3).

**§4 note — 2026-07-14 (R4 wording + teeth):** R4 was written with only slices in mind; read "slice" as **element** — one slice, `app/`, or one toolbox folder (`shared/`, `design-system/`, `lib/`). Relative imports are legal only WITHIN one element and never reach above that element's root; crossing elements always uses `@/`. Enforcement status: R1–R3 and R5 have ESLint teeth, and a relative import that escapes to an *illegal* element is already caught by `boundaries/dependencies` (it classifies by resolved path, not by how the import is written). The one uncovered case — a relative import escaping to a *legal* target (e.g. `../../shared/api/httpClient` from inside a slice) — is review-enforced until dedicated tooling lands with the first slice (parked in `ROADMAP.md`): off-the-shelf `import/no-relative-parent-imports` cannot express R4, because `../` within a slice is legal. Justification: the 2026-07-14 audit found R4 to be the only import law without teeth and its wording ambiguous for non-slice folders.

**§4 note — 2026-07-15 (R4 now has teeth):** the one uncovered case above — a relative import escaping its element to a *legal* target — is now enforced. A small custom flat-config rule, `local/no-cross-element-relative-import` in `eslint.config.mjs`, resolves each relative import and reports it when the target's element differs from the importing file's element (element = one slice, `app/`, or one toolbox folder, taken from the segment after the last `/src/` — so the identical logic maps both the real tree and the `lint-fixtures/src/` proof tree). Off-the-shelf rules could not express this (a `../` inside a slice is legal), which is why it is a custom rule rather than a config of an existing one. Like every other law it is **proven, not assumed**: `lint-fixtures/src/auth/bad-r4-relative-escape.ts` (a relative escape to `shared/`, which `boundaries/dependencies` allows and therefore never flags) must fail on this rule, and `lint-fixtures/src/auth/ui/legal-relative-import.ts` (a within-slice `../`) must stay clean — both gated by `scripts/check-lint-fixtures.mjs`. R1–R5 all now carry ESLint teeth. Landed with Phase 1 slice #1 (the ROADMAP "Parked fixes" item).

## 5. Shared Layer Rules

`shared/` contains **zero business knowledge**. Litmus test: *if a component/function mentions a domain concept (search result, request, supplier, product, service, business, branch, unique offer), it is NOT shared.*

- Generic and reusable → `shared/` (Button, Modal, Select, httpClient, i18n plumbing).
- **Rule of three / ownership test (D8):** a component used by one slice lives in that slice, private. When a second slice needs it, the choice is NOT free — decide by ownership:
  - **Domain-free** (passes the litmus test above): the 2nd consumer **duplicates** it. Only the 3rd consumer promotes it to `shared/ui`. Never promote earlier.
  - **Domain-aware, same knowledge:** the 2nd slice embeds the owner's live feature — the component keeps calling the owning slice's `api.ts`/`store.ts`, same data, same behavior → **import via the owner's `index.ts`** (R2).
  - **Domain-aware, same looks only:** the 2nd slice needs its own data or behavior → **duplicate into the consuming slice** and let the copies diverge. Never parameterize one component to serve both callers (DESIGN_PATTERNS P6.3).
  - One-liner: *same knowledge → import from the owner; same looks → copy.*
- Domain-specific API DTOs live in slice `model.ts`/`api.ts`, not `shared/api/dto.ts`. `shared/api` keeps only the transport (`httpClient`, key transforms, `ApiError`, token storage interface).
- The ownership test (D8) also governs **types**: importing another slice's type via its `index.ts` is allowed only when consuming that slice's values (props for a component it exports, data its `api.ts` returned). Describing your own slice's data always uses your own `model.ts` type, even if the shape looks identical — a reused type is a hidden compile-time coupling between slices.
- **Sanctioned exception — translations:** `shared/i18n/messages/*` contains business strings, the ONE place business words may appear under `shared/`, because locale resources load as one tree per language. Slices own their namespace keys; no other business knowledge may ride along.

## 6. Decision Table — "Where does new code go?"

| You are adding… | It goes to |
|---|---|
| A new page/route | Owning slice `ui/`, exported from `index.ts`, plus a THIN route file `app/app/<path>/page.tsx` re-exporting it (server/client per D7) |
| A backend API call | Owning slice `api.ts` |
| A DTO type / mapper | Owning slice `model.ts` |
| Client state for one domain | Owning slice `store.ts` — factory + context provider (D7) |
| A data-fetching/orchestration hook | Owning slice `hooks.ts` (P1.2) |
| A component used by one slice | That slice's `ui/` (private, not exported) |
| A component needed by a 2nd slice | Ownership test (§5, D8): embeds the owner's live feature (same data/behavior) → import via owner's `index.ts`; otherwise duplicate into the consuming slice |
| A business-cabinet tab managing another domain's data | The owning slice (Products → `catalog`, Services → `services`, the "Requests" tab → `chats`), embedded via its `index.ts` (§3, R2) |
| Sorting/filter logic and types for the catalog | `search/` — the search module owns list/sort/filter data (`PRODUCT_VISION.md` §4) |
| A domain-free primitive (3+ consumers) | `shared/ui` |
| A domain-aware "reusable" component (e.g. ResultCard, OfferBadge) | The owning slice — NEVER `shared/ui` |
| A marketing/landing section | `app/(marketing)/` — content only, toolbox imports, never a slice (D6) |
| i18n strings | `shared/i18n/messages/*`, under the slice's namespace key (sanctioned exception, §5) |
| An env variable read | `shared/config` |
| Cross-cutting browser utility (scroll, a11y) | `lib/` |
| A provider (auth, theme) | Context + hook defined in the owning slice (R6); `app/providers` mounts it |
| App chrome (navigation menu, profile card shell, footer) | `app/_components/`, consumed by `app/` layouts — never `shared/ui` |
| A unit/component test | Co-located next to the file it tests (`X.test.tsx` in the same folder) |
| An end-to-end test | `e2e/` at package root, outside `src/` |
| Something that fits nowhere | STOP — propose a rule change in this file, do not invent a folder |

## 7. Single-Implementation Principle

Exactly one mechanism per concern. Adding a second is an architecture violation, not a style choice.

| Concern | The one implementation | Banned alternatives |
|---|---|---|
| HTTP | `shared/api/httpClient.ts` — one wrapper, usable from server and client code | raw `fetch` in components, axios |
| Routing | Next.js App Router: thin route files re-exporting slice pages (§2) | react-router, ad-hoc `window.location` navigation |
| Rendering | D7 policy: server components by default; `'use client'` only at interactive components | flipping a public surface to client rendering for convenience |
| Client state | zustand store factories via context providers (slice `store.ts`, D7) | module-scope store singletons, new state libraries, prop-drilled globals |
| JS animation | GSAP (D11) — `useGSAP()` + refs, `ScrollTrigger` for scroll-driven reveal, shared utilities in `shared/motion.ts`. Animate `transform`/`opacity` only — never `width`/`height`/`top`/`left` (forces layout recalculation every frame). Reduced motion via `@media (prefers-reduced-motion: reduce)`, checked in `shared/motion.ts` once, not per component | framer-motion, a second animation library, hand-rolled WAAPI, animating layout-triggering properties |
| UI primitive foundation | shadcn CLI as SCAFFOLDING only (D12) — copies Radix-based unstyled primitives into `shared/ui/`, every class immediately restyled to `design-system/` tokens before the component is used anywhere. Radix supplies behavior (focus trap, keyboard nav, ARIA); tokens supply 100% of the visual value, no exception | shipping a shadcn default color/spacing/radius value (P9.2 has zero tolerance); a component library used as a live dependency instead of copied-and-owned source; Radix imported outside `shared/ui/` |
| Styling | Tailwind v4 utilities on design-system tokens (D3) | inline `style={{}}` except computed dynamic values; CSS-in-JS; mixing systems in one component |
| i18n | next-intl, messages in `shared/i18n/messages` (D2); client locale switch scoped to `/app` via `shared/i18n/LocaleProvider` (D18) | react-i18next, hardcoded user-facing strings, a per-request cookie read that breaks the static landing (D6) |
| Theme (light/dark) | `data-theme` attribute + `shared/theme.ts` store, resolved by the pre-paint script (D17); tokens redefined under `:root[data-theme="dark"]` | next-themes (D14), a second theme mechanism, duplicating the palette across a media query and an attribute, any `dark:` colour utility |
| Icons | lucide-react (D2) | second icon set, ad-hoc inline SVGs for standard glyphs |
| Images | `next/image` for every raster image (D2 — SEO/perf goal) | raw `<img>` |
| Formatting | Prettier + `prettier-plugin-tailwindcss` for class order (D15); `npm run format`, CI-gated by `format:check` | a second formatter (Biome, dprint); ESLint stylistic rules that fight Prettier; hand-formatting |
| Route access control | Client-side guards in `@/auth` — `RequireAuth` (session) + `RequireDashboardAccess` (role), mounted at the `(main)` layout and `business/` layout; the ONE role predicate is `canAccessDashboard` (auth `model.ts`), shared with the nav (D23) | middleware/server auth checks (impossible until the token is a cookie, Phase 4); per-page ad-hoc `useEffect` redirects; a second "is this user allowed" predicate |

## 8. Enforcement (required tooling)

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

ESLint (`eslint-plugin-boundaries` + `eslint-plugin-import`) — element types and rules R1–R3, R5:

```js
// eslint.config.js (flat config, excerpt)
settings: {
  "boundaries/elements": [
    { type: "app",    pattern: "src/app/**" },
    { type: "slice",  pattern: "src/(auth|search|catalog|services|chats|profile|business-cabinet)/**", capture: ["slice"] },
    { type: "shared", pattern: "src/(shared|design-system|lib)/**" }
  ]
},
rules: {
  "boundaries/element-types": ["error", {
    default: "disallow",
    rules: [
      { from: "app",    allow: ["app", "slice", "shared"] },
      { from: "slice",  allow: ["shared", "slice"] },            // cross-slice allowed…
      { from: "shared", allow: ["shared"] }
    ]
  }],
  "boundaries/entry-point": ["error", {                          // …but only via index.ts (R2)
    default: "disallow",
    rules: [
      { target: ["slice"],          allow: "index.ts" },         // slices: door only
      { target: ["shared", "app"],  allow: "**" }                // toolbox/app internals freely importable
    ]
  }],
  "boundaries/no-unknown-files": "error",                        // file outside every element = error
  "boundaries/no-unknown": "error",                              // unlisted top-level folder = error (§10 teeth)
  "import/no-cycle": ["error", { maxDepth: 4 }]                  // R5 teeth — boundaries cannot detect cycles
}
```

The slice list in the `boundaries/elements` pattern MUST stay in sync with §2; the `no-unknown` rules turn a forgotten sync into a lint error instead of a silent exemption.

**The config must be proven, not assumed:** a `lint-fixtures/` set of deliberately-bad imports (one per rule: R1, R2, R3, R5, unknown folder) with a CI step asserting ESLint FAILS on each. Enforcement tooling lands in the FIRST commit — before any slice exists — so every line of the codebase is born under the rules.

CI/verification: `next build` (includes tsc) and `eslint src` MUST pass before any commit; lint is wired into the build pipeline, not left to convention. An import-rule violation is a build failure, not a review comment.

**§8 note — 2026-07-15 (CI landed):** this requirement now has a runner. `.github/workflows/ci.yml` (GitHub Actions) gates push and every PR with a **build** job (`npm ci` → `npm run build`, i.e. `eslint src` → the `lint:fixtures` proof → `next build`) and an **e2e** job (the Playwright harness against the production build). A boundary violation fails the PR, not only the machine that chose to build. Node is pinned in `.nvmrc`. Deploy is not wired yet (host is a human decision); when it is, its build command MUST be `npm run build` — a bare `next build` skips the lint + fixture chain.

**§8 correction — 2026-07-14 (appended at scaffold time; the excerpt above is kept for the rule INTENT):** the installed `eslint-plugin-boundaries` v7 renamed the enforcement surface the excerpt was written against: `element-types` and `entry-point` are folded into the one canonical `boundaries/dependencies` rule (`entry-point` is deleted in v8), `no-unknown` is now `no-unknown-dependencies`, and options use `policies` with object selectors. `eslint.config.mjs` therefore expresses R1+R2+R3 as `boundaries/dependencies` policies — R2 via `fileInternalPath: "index.ts"` on the slice target — and keeps `boundaries/no-unknown-files`, `boundaries/no-unknown-dependencies`, `import/no-cycle` as written. Element patterns are anchored `**/src/…` so the identical config also governs the `lint-fixtures/src/` proof tree. The laws R1–R5 are unchanged; `npm run lint:fixtures` (a mandatory stage of `npm run build`) proves each law still fails its fixture and that legal imports stay clean. Justification: founding the repo on rules the plugin deletes in its next major would violate the spirit of §8 (enforcement as law); the config is proven by fixtures, not assumed from this excerpt. Likewise TypeScript 6 removed `baseUrl` (error TS5101): `tsconfig.json` declares `"paths": { "@/*": ["./src/*"] }` alone, which resolves relative to the tsconfig — the alias is unchanged.

**§8 note — 2026-07-18 (the D6/D19 rendering contract now has teeth):** the static-landing lock (D6) and the dynamic-`/app/*` rule (D19) were previously verified only by a human reading the `next build` route table — so a dropped `setRequestLocale` seed could flip `/` back to dynamic with the build still green (it did: the 2026-07-18 audit caught `/` shipping as `ƒ`, not `○`). `scripts/check-rendering.mjs` now asserts the contract against `.next/prerender-manifest.json` — `/` present in `routes` = static (D6); no `/app` or `/app/*` key present = dynamic (D19) — and is a **mandatory stage of `npm run build`** (`… && next build && npm run verify:rendering`), so it gates local builds, CI, and the Vercel deploy identically. Proven both ways like the lint fixtures: it passes on the real build and fails (exit 1) on a manifest with `/` removed or an `/app` route made static. Adding a static `/app` route, or a dynamic `/` surface, is now a build failure — revisit D6/D19 before changing the check.

**§8 note — 2026-08-01 (the measurement lock now has teeth):** `scripts/check-tokens.mjs` joins the same family, for the design lock *"Every colour pair the product renders is MEASURED, and the measurement is written down beside the values"*. That lock was enforced by nothing but the WCAG table's presence: the numbers were computed once in 2026-07 and never re-derived, so a token edited without re-running the proof left the table describing colours that no longer existed, and the build stayed green. Two review findings the same day showed both halves of the gap — the summary line claimed **31 measured pairs against 13 documented rows** (it had said so since `f91b558`, and the table can only be 26), and the no-JS dark fallback was held in step with the `[data-theme="dark"]` block by a *comment* asking whoever edits one to remember the other, drift being invisible in review, invisible in a diff, and visible only to a visitor with scripts blocked. The check recomputes every documented ratio from the file's own OKLCH values (OKLCH → OKLab → LMS → linear sRGB → WCAG 2.x luminance) and asserts it **matches the table AND clears its floor**, derives the pair count from the table instead of trusting the prose, verifies every token is in sRGB gamut, and diffs the two dark blocks token by token. It reads the SOURCE, so unlike the rendering check it needs no build and runs BEFORE `next build` (`… && npm run verify:tokens && next build && …`); `npm run verify:tokens` runs it alone. Proven both ways like its siblings: green on the real file, exit 1 on each defect class — a drifted no-JS value, a token whose ratio no longer matches its documented number, and a miscounted summary line. The 26 pairs were re-derived at introduction and all 26 reproduce the committed numbers exactly, so the table was accurate; only the count was not. Where prose and computation disagree, the computation is now the claim.

## 9. Sources of Truth (D9)

The frontend is built from exactly **two sources of truth**:

1. **`PRODUCT_VISION.md`** — the product authority: who the users are, the user flows (UF 1–3.1), the surfaces each role gets, and the V1 filter/sort options. If a screen, flow, or control is not in the vision, it is not built — if something seems missing, STOP and raise it (P9.1), never invent.
2. **The AskBackend API** — the data authority: contracts, DTO shapes, and module names (which define the slice names, D1). The backend modules are `identity`, `search`, `catalog`, `service`, `chat`, `request`, `business`, `contact`, `autodump`; §2 maps V1 slices onto them.

Where the vision and the backend contract disagree (missing field, different cardinality), the backend wins for DATA and the vision wins for INTENT — and the mismatch is raised, never silently patched (P9.4). Visual values come only from `design-system/` tokens (D3); there is no external design file to consult.

## 10. Agent Guardrails

- MUST NOT create `entities/`, `features/`, `widgets/` folders or any top-level folder not listed in §2 (`boundaries/no-unknown` enforces this).
- MUST NOT build screens, flows, or controls absent from `PRODUCT_VISION.md` (D9, P9.1) — if something seems missing, STOP and raise it.
- MUST NOT create a landing/marketing slice or duplicate marketing content inside slices — marketing lives ONLY in `app/(marketing)/` (D6).
- MUST NOT add business-aware code to `shared/` (litmus test in §5; translations are the one sanctioned exception).
- MUST NOT deep-import across slices or add a second implementation of a §7 concern.
- MUST NOT create module-scope zustand stores, or flip a public surface to client rendering for convenience (D7).
- MUST NOT disable or weaken the ESLint boundary rules to make a change pass.
- MUST update §2 of this file in the same commit when adding a slice or moving a domain.
- When unsure between two slices, choose the one matching the backend module that owns the data.

## 11. Decision Log

| ID | Date | Decision | Status |
|---|---|---|---|
| D31 | 2026-08-01 | **The `*_old` archive and the `/demo` design lab are DELETED, and `tokens_old.css` is renamed back to `tokens.css`** (owner directive). This RETIRES D24 and reverses the "keep the retired styles as `*_old`" half of D25 — the other half (the skin itself, the scoping mechanism) is untouched. **The reason to keep either had expired.** The `*_old` set was a restorable reading archive of the pre-D25 skin; 26 files and ~3,000 lines of it sat inside `src/`, where they type-checked, linted and answered every grep, while git already held the same content in a form that restores as a coherent whole (`git revert`) rather than as a file swap that no longer even compiles — `globals.css` removed `focus-ring-field`, so `input_old`/`select_old` would have rendered focus-less if dropped back in, a fact the file had to document rather than fix. `/demo` was the D24 lab holding the unmeasured neumorui specimen for comparison; that comparison finished at D25 and its output is written down in `neumorphism.css`'s three recorded darkenings and its WCAG table, which is the durable form of a specimen. **The rename is the load-bearing part.** `tokens.css` was renamed `tokens_old.css` in the D25 sweep although it never stopped being imported and still owns the ONE `@theme inline` block for the repo plus the live marketing palette — a filename asserting the opposite of the truth, which cost enough that AUDIT_1 carried item D-4 purely to warn the next reader not to believe it. Deleting the real archive removed the only reason for the misnomer. **Costs, accepted:** the product has no design lab, so the next visual exploration needs a place decided before it starts (a scratch branch is the cheap answer; re-opening `/demo` is a new decision, not an automatic one), and the "one named exemption from the vision lock" that D24 supplied is gone — which STRENGTHENS the product lock rather than weakening it, since every remaining surface must now exist in `PRODUCT_VISION.md`. Two Product Locks retired with it (Locks.md), and `neumorphism.css`'s header prose that pointed at the lab as a live sibling now reads as history | Accepted |
| D30 | 2026-07-31 | **`shared/geo/` is opened for REFERENCE DATA, and the KATO administrative registry is its first tenant** — with `shared/ui/address-select.tsx` (the cascade) and `shared/ui/combobox.tsx` (a filterable pick-one field) built on it. Ported from another project's Vue control. **Three decisions inside one:** (1) *Placement* — KATO names oblasts, districts and settlements and mentions no domain concept, so it passes §5's litmus test exactly as `i18n/messages` does; a slice-owned copy would be re-copied by the Branches tab, the future service-location picker and any address field after that. (2) *Shape* — the 1.9 MB export is split by `scripts/build-kato.mjs` into eager `regions.json` (2.4 KB) + `districts.json` (22 KB) and 17 lazily-`import()`ed locality chunks (24–145 KB), because 1.1 MB of settlements in the bundle of a registration form is not a trade worth making; the 3 republican cities have no localities and so no chunk. (3) *Scope* — **Kazakhstan only.** The port's worldwide country select was dropped rather than carried: `REGISTRATION_COUNTRY_CODE` is fixed to KZ and `BusinessLegalForm` offers KZ_IP/KZ_TOO/NONE, so a country picker would have exactly one real answer — the dead control the "reachable must DO something" lock forbids — and its `country-state-city` dependency would ship a second worldwide dataset for a path no backend DTO accepts. A second market is **G4**'s question; the country level is then added ABOVE the cascade, not inside it. `Combobox` is a THIRD combobox implementation on purpose, not a promotion of `CityField`/`CategoryField`: those two are free-text fields whose typed value IS the answer, this one only ever filters and always resolves to a listed option — a `freeText` flag would be one component serving two contracts (P6.3) | Accepted |
| D29 | 2026-07-29 | **`catalogSetupMode: ASK_MANAGED_IMPORT` becomes a real, submitted choice — REVERSES the same-day-earlier D28-adjacent decision to ship it disabled** (owner UI review of the built registration wizard). Re-reading `kz.ask.business.onboarding.api.dto.SellerOnboardingRequest` showed `ASK_MANAGED_IMPORT` is a valid enum value in its own right — the thing that does NOT exist is a SEPARATE follow-up screen (`POST /businesses/{id}/managed-imports`, roadmap #8) for scoping/pricing an import after the business is created. Those are two different gaps, and only the second one is still open. Making the field itself selectable does not rebuild the "reachable control that does nothing" dead end business-cabinet/locks.md's now-retired lock was protecting against, AS LONG AS the copy is honest that no instant dialog follows — `catalogSetup.managedImport.priceNote` was rewritten to say a human will follow up, not promise a quote. See business-cabinet/locks.md's Retired Locks for the full before/after and contracts.md for the DTO detail | Accepted |
| D28 | 2026-07-29 | **`leaflet` + `react-leaflet` adopted as the ONE map library — first mapping dependency in the product** (owner directive, 10-item registration-wizard revision). Free, keyless, OpenStreetMap-tiled: no vendor account, no billing surface, consistent with every other "free/keyless" call already in the stack. Used exactly once so far — `business-cabinet/ui/BranchMapModal.tsx`, the step-3 branch picker — because `CreateBranchRequest` (read from `kz.ask.business.branch.api.dto.CreateBranchRequest.java`) requires `latitude`/`longitude`, reversing the 2026-07-28 registration design that had explicitly excluded a map-picker modal. Address search and reverse-geocoding go through OpenStreetMap's Nominatim service directly via `fetch` inside the slice's `api.ts` (`searchAddress`, `reverseGeocode`) — NOT an AskBackend contract, but kept in `api.ts` anyway so "components never call fetch directly" still has one home. Leaflet touches `window` at import time, so the actual map surface (`BranchMapCanvas.tsx`) is loaded via `next/dynamic(..., { ssr: false })` from the modal, never imported at module scope elsewhere — the one exception to "route files/layouts stay server components" is scoped to this one lazy boundary, not to the modal or the step itself. The default marker image assets were skipped entirely in favor of a `divIcon` styled by `.neu-map-pin` (design-system/neumorphism.css, the accent GRADIENT fill — same non-text-fill category as `.neu-fill-accent`'s avatar/switch/slider/checkbox), avoiding the classic Leaflet-under-a-bundler broken-marker-icon problem without adding an asset pipeline exception | Accepted |
| D27 | 2026-07-28 | **`RequireDashboardAccess` now bounces a customer-only session to `/app/business/register`, not `/app` — AMENDS D23/D26's redirect target, leaves their route-group grammar untouched.** Since D26, `business/register/` has sat outside the `(cabinet)` guard specifically so a non-seller could reach it, but the guard itself still sent that same visitor to Home — so a customer who typed or bookmarked `/app/business` was bounced past the door D26 built, onto a page with no obvious path back to registering. Locks.md's "a control that is reachable must DO something" (D26-era lock) applies to the redirect itself, not just the destination page: a bounce that lands somewhere with no next step is the same shape of dead end. Fix is the redirect target only — `router.replace("/app")` → `router.replace("/app/business/register")` in `RequireDashboardAccess.tsx` — no new route, no new group, no change to `canAccessDashboard` or the nav link's own logic (P6.2 still holds: the nav already shows/hides Dashboard from the same predicate). Net effect: a customer hitting the Dashboard route is routed straight into the registration flow; on successful onboarding `useRefreshSession()` + the modal/registration page's own redirect (D26) carries them into the cabinet, so the full loop is register → land in cabinet, not-yet-seller → land in register | Accepted |
| D26 | 2026-07-27 | **A route GROUP, not a per-URL allowlist, is how a guard's scope is narrowed — and the `business-cabinet` slice gets its first code, seller registration, ahead of the cabinet it serves** (owner directive, closing a shipped no-op). The role-choosing modal's "set up your business" routed to `/app/business`, where `RequireDashboardAccess` bounced the customer-only session that had just chosen it: a reachable fork that silently did nothing, invisible in review because the modal's target and the guard were each individually correct. **AMENDS D23**, which put that guard at `business/layout.tsx` and therefore over the whole `/app/business/*` prefix — right while the cabinet was the only thing there, wrong the moment REGISTRATION arrived, since a customer must reach `/app/business/register` precisely because they are not a seller yet. The fix keeps D23's grammar rather than adding an exception to it: `business/(cabinet)/` now carries the guard, and `business/register/` is its one sibling outside. **Placement IS status** — a new cabinet tab is protected by being put in the group, with nothing to remember, exactly as `(main)` is the auth gate line. Both stay inside `(main)`, so `RequireAuth` is untouched. **The second half is the session refresh:** `POST /api/v1/business/onboarding` promotes the account to BUSINESS_OWNER server-side, so without re-reading `GET /auth/session` the client's `canAccessDashboard` still answers false and the guard bounces the new seller out of the cabinet they just created. `useRefreshSession()` is added to `@/auth` and exported through its `index.ts` — the session is auth's to own (R6), and a slice patching the store itself would be asserting a role the backend never confirmed (P9.4). **Costs, accepted:** the slice ships before the surface it is named for (justified — it is the door the cabinet's guard is guarding, not a speculative primitive, P8.1); `catalogSetupMode` is pinned to `MANUAL` and `countryCode` to `KZ`, both because the alternatives lead to controls that do nothing (managed import is roadmap #8; the legal forms on offer are Kazakhstan's, and a second market is gate G4) — pinning is the same YAGNI call, recorded so it is a decision rather than an oversight. No ESLint change needed: `business-cabinet` was already in the slice list | Accepted |
| D25 | 2026-07-27 | **ORANGE NEUMORPHISM is the platform's visual direction, applied by SCOPE rather than by replacing the token system** (owner directive: adopt the `/demo` skin everywhere except the marketing landing, which will get its own direction later; keep the retired styles as `*_old`). The skin is a promotion of the D24 lab port of **neumorui** (`rukonpro/neumorui`, https://neumorui.vercel.app), whose ONE idea is that depth replaces borders: an element is the same colour as its surface and reads as raised or recessed from a paired light/dark shadow. **The mechanism is the decision.** `tokens_old.css` (renamed from `tokens.css`) keeps the single `@theme inline` block, because `@theme inline` INLINES literal values for radii/shadow geometry but resolves colours through `var(--token)` — so `design-system/neumorphism.css` redefines only the colour PRIMITIVES inside a `.neu-skin` scope and every colour utility in the platform re-tints for free, while the landing keeps the old palette. One Tailwind theme, two skins, no fork and no `dark:`-style duplication. Depth and radius geometry cannot be reached that way, which is exactly why they are `.neu-*` component classes in `@layer components` (below the utilities layer, so a plain utility still overrides one without `!important`) rather than invented tokens — P9.2 holds, the values simply live in a class instead of a variable. **`.neu-skin` is applied in exactly ONE place**, the platform layout, so placement IS status the same way the `(main)` group is the auth gate line. **Three values from the lab could not ship and were changed, all darkenings, all measured:** the lab's `#ff6a2c` holds white at 2.86:1 (now the non-text `--neu-accent-vivid`, with the gradient's dark stop `#c1440e` at 5.14:1 carrying every label); `#7a6c58` secondary text measured 4.39:1 (re-derived); the success/warning/danger inks were tint-on-tint values failing as text. **The costs, accepted:** two design locks retired (quiet chrome; saturation-is-action narrowed to text-bearing fills — see Locks.md "Retired Locks"), and Radix PORTALS became a standing hazard, since content rendered into `<body>` escapes the scope — where colour utilities take the marketing palette AND every `.neu-*` rule matches nothing. Corrected same-day after the first attempt (re-declaring the variables on the portal node) proved not to scale: overlays now portal INSIDE the scope via `container={useSkinPortalContainer()}` (`shared/ui/skin-portal`), so the whole skin applies by inheritance with nothing duplicated. Now its own lock, plus a second one forbidding a transform/filter/perspective on the wrapper, which would re-anchor every fixed overlay. Sonner is the inverse case: it renders in place, so its host must stay INSIDE the wrapper, and its shape is stated unlayered because sonner's own stylesheet is unlayered and beats any layered rule | Accepted |
| D24 | 2026-07-21 | **`/demo` is a permanent internal DESIGN LAB — the one named, scoped exemption from the "only what the vision describes" product lock** (owner directive: keep it permanently and register it). It exists because the visual system (colour, type, tone, components, widgets, motion, transitions) has to be prototyped and AGREED somewhere before it reaches a product surface — Phase 0b produced tokens and 9 primitives, but the three surfaces that will set the tone (search form, result card, cabinet shell) are unbuilt, and prototyping them inside a slice would mean shipping unapproved UI to a real route. **Placement is the whole decision:** `src/app/demo/page.tsx` sits OUTSIDE `(marketing)` (putting it there would make it marketing content and break D6's "marketing is the ONLY copy of the marketing content") and OUTSIDE `/app/*` (putting it under `(main)` would auth-gate it, and putting it beside `auth/` would expose an ungated platform page — the D23 gate line is drawn by placement, so a stray page silently inherits the wrong status). It is `noindex`, so it is never a public face of the product. **Costs, accepted:** copy here is scaffolding, NOT i18n-keyed (the slice-DONE rule 3 is a rule about slices, and this is not one), and the page is exempt from the vision lock — but from NOTHING else: the Design Locks bind here without exception (tokens only, one orange accent, saturation-is-action / tint-is-information, no marketplace idioms), because a pattern proven against relaxed rules would not survive promotion. **Nothing is promoted by moving a file:** a pattern agreed in `/demo` is REBUILT inside the slice that owns its data, under the full rules. Needs no ESLint change — `**/src/app` already covers it as one element | **RETIRED 2026-08-01 (D31)** — /demo deleted by owner directive. Kept, not removed: the placement reasoning below is why a future lab would go back in the same spot, and the exemption it granted is now GONE, so the vision lock binds every surface without exception |
| D23 | 2026-07-21 | **The platform `/app/*` is gated by client-side route guards — AMENDS D7's "public surfaces" for Home/catalog/product** (owner directive, rules 1–5). A logged-out visitor MUST NOT enter `/app/*` (rule 2); a customer-only session MUST NOT open the Dashboard (rule 1). Both are enforced by guards defined in `@/auth` and mounted in the app composition root (R3): `RequireAuth` in the `(main)` layout (redirect → `/app/auth/login`) and `RequireDashboardAccess` in `business/layout.tsx` (redirect → `/app`). The auth pages stay reachable logged-out because they sit OUTSIDE `(main)` — the route-group boundary is the gate line, not a per-URL allowlist. The guard is CLIENT-SIDE because the session token is localStorage-only (D6/token lock), invisible to the server/middleware; a server guard arrives with the Phase-4 httpOnly-cookie migration. The nav loses its signed-out "sign in" entry (rule 4) — it mounts only inside the guard. Legal pages (`/terms`, `/privacy`, `/cookies`) are added under `(marketing)/`, OUTSIDE `/app` (rule 3), static + content-only (D6); the landing gains a `LandingRedirect` island carrying a logged-in visitor to `/app` unless `?from=app` (rule 5). **Trade-off, accepted by the owner directive:** Home, Catalog and the Product page — which D7 framed as PUBLIC, SEO-crawlable surfaces — are now behind the session gate, so they are NOT publicly crawlable in V1. This narrows D7's "public surfaces" to the marketing landing + legal pages; the public city/category SEO pages remain a Phase-2 item (ROADMAP), so nothing that was shipping is lost. One access predicate, `canAccessDashboard`, is shared by the nav and the guard (P6.2) | Accepted |
| D22 | 2026-07-18 | **The storage door (P5.2) owns resilience and cross-tab change notification — no caller re-implements either.** An xhigh code review found the "unavailable localStorage" guarantee lived in ONE caller (LocaleProvider's `sessionLocale`, added 2026-07-17) while its siblings on the same door were exposed: a dropped token write left the UI authenticated with every request going out unauthorized; a dropped theme write snapped the toggle back to "system" and let the next OS flip discard the explicit choice. Fix at the door, not per caller: `shared/api/storage.ts` keeps an in-memory write-through fallback (a key whose latest write failed to persist reads back its in-session value; persistence across loads is all that's lost) and exposes `storage.subscribe(key, listener)` wrapping the native `storage` event — so token/theme/locale changes in ANOTHER tab propagate (AuthProvider re-restores the session with a stale-response guard; theme re-applies `data-theme`; locale re-notifies). `sessionLocale` is retired — every current and future caller inherits both behaviors from the one mechanism | Accepted |
| D21 | 2026-07-17 | **The Toaster follows the resolved `data-theme` — closes a D17 leftover in the D14 sonner wrapper** (owner-approved via the 2026-07-17 rules audit). D14 shipped the own-code Toaster with `theme="system"`, correct in the pre-toggle era when light/dark WAS the OS preference. D17 made `data-theme` the one theme mechanism, but the Toaster kept resolving the OS directly — a second theme path (§7 violation): a user choosing light on a dark OS got dark-chrome toasts on a light UI. Now `shared/theme.ts` exports `getResolvedTheme()` (reads the `data-theme` attribute — the single switch) and the Toaster subscribes via `subscribeTheme`/`useSyncExternalStore`; the token-bound CSS variables are unchanged. D14's refusal of `next-themes` stands untouched | Accepted |
| D20 | 2026-07-17 | **Wire-case boundary in the ONE transport — corrects the Phase-0a "no key-transform" note, which live integration disproved.** The backend serializes JSON in **snake_case** (`spring.jackson.property-naming-strategy: SNAKE_CASE`, base application.yml, on every deploy branch since backend "Prod Ready" 2026-06-25); the 0a note had verified *Java field names*, never the wire, so camelCase request fields landed `null` server-side (register 400'd on `password_confirmation` in the first real call). Per the data-authority rule (D9, P9.4 — the backend wins for DATA, and its wire format IS data): `shared/api/caseTransform.ts` (pure deep key mappers, P5.1) is applied ONLY inside `httpClient` — request bodies snakify, response bodies (success AND error) camelize, query params untouched (Spring binds `@RequestParam` by Java parameter name, unaffected by Jackson). Slices and every TS type stay camelCase; no slice ever sees a snake key; e2e stubs speak the real wire so the boundary is exercised by every scenario. Proven end-to-end against the running backend: register → verify → session → login → logout, plus 401/403/409 error shapes | Accepted |
| D19 | 2026-07-17 | **Platform preferences are cookie-mirrored; /app/* server-renders them — EXTENDS D17/D18** at the owner's request, after the client-only approach proved glitchy in use: every reload of /app/* first painted the default locale (and a "system"-highlighted theme toggle), then flipped to the stored preference — and the async route metadata overwrote the client-set tab title with the default-locale one. Now `ask.locale` and `ask.theme` are stored in BOTH localStorage (the client store, D17/D18 unchanged) and a same-named cookie (the server's copy, synced by the owning provider/mechanism); the platform layout (`app/app/layout.tsx`) reads the cookies and seeds `LocaleProvider` (`initialLocale`) and `ThemePreferenceSeed` (theme-toggle), and the auth routes' `generateMetadata` resolves the tab title from the cookie. First paint is therefore already correct — no flash, no title race. **Trade-off: /app/* is now dynamically rendered** (it reads cookies); accepted — the platform is stateful chrome, not an SEO surface. **The marketing landing at `/` never reads a cookie and stays static — the D6 lock is intact**; D18's "no per-request cookie read" now scopes to the landing. next-intl remains the ONE i18n system; the global request config still serves the default locale | Accepted |
| D18 | 2026-07-15 | **Client-side locale switch on the platform (/app) — EXTENDS the i18n/D6 decision** at the owner's request. `shared/i18n/LocaleProvider` (client), mounted in the platform layout, nests inside the root `NextIntlClientProvider` and re-provides ru/kk/en messages (bundled client-side) for the stored locale (`ask.locale`), so switching is a pure client re-render with NO per-request cookie read — the static SEO marketing landing at `/` stays statically rendered (D6 preserved). Scoped to `/app`; the marketing landing stays ru. App chrome that must follow the switch (NavigationMenu) becomes a client component. The eventual home for this control is the profile settings screen (UF 2.3); it lives on the auth chrome now. next-intl remains the ONE i18n system (§7) — this is a locale-selection layer, not a second library | Accepted |
| D17 | 2026-07-15 | **Theme toggle added — REVERSES the "no theme toggle" stance of D13** at the product owner's request. Light/dark is now selected by a `data-theme` attribute on `<html>` (not `prefers-color-scheme` directly): a tiny inline pre-paint script in `app/layout.tsx` resolves the stored preference (`ask.theme`; "system" resolves the OS and re-resolves on OS change) into a concrete light/dark attribute — no flash, and the measured OKLCH palette stays in ONE place (the dark values moved from a media query to `:root[data-theme="dark"]`, never duplicated). `next-themes` stays refused (D14): the store is own-code `shared/theme.ts`, the control is `shared/ui/theme-toggle` (light/dark/system). The 31 verified contrast pairs and every token value are unchanged; only HOW a theme is selected changed, and components still never write `dark:` for colour | Accepted |
| D16 | 2026-07-15 | **Deploy host: Vercel** (native Next.js build; no Docker/nginx, unlike the prior Vite frontend). `vercel.json` pins `buildCommand` to `npm run build` so the deploy runs the SAME lint + boundary-fixture gate as CI — Vercel's default bare `next build` would skip it, deploying unguarded while CI stayed green. Node pinned via `engines.node` (`22.x`) because Vercel reads that, not `.nvmrc`. Connecting the repo (→ automatic per-PR preview deploys) is a one-time human step in the Vercel dashboard | Accepted |
| D15 | 2026-07-15 | **Formatter: Prettier** + `prettier-plugin-tailwindcss` (canonical class order). One formatter per §7; ESLint stays boundaries-only, so the two never fight (no `eslint-config-prettier` needed — nothing to disable). Enforced: `format:check` gates CI. Line endings pinned to LF via `.gitattributes` + Prettier `endOfLine` so a Windows working copy and the Linux runner agree. Excluded from formatting (`.prettierignore`): vendored + authored skills (`.claude/`), the normative knowledge docs (`AI_Knowledge/`, `CLAUDE.md`, `AGENTS.md` — they change by human append, never silent rewrite), and `src/design-system/` (the D3 visual source). `.editorconfig` carries the universal basics for file types Prettier does not own | Accepted |
| D1 | 2026-07-14 | Vertical Slice Architecture with enforced boundaries; slices mirror AskBackend module names (1:1 mapping to future services if modules are ever extracted) | Accepted |
| D2 | 2026-07-14 | Greenfield Next.js (App Router), web-first: SSR + SEO from day one. Stack: TypeScript, Tailwind v4 (D3), zustand via factories (D7), next-intl, lucide-react, `next/image`, Playwright. (JS animation was framer-motion via D4 — reversed and replaced by GSAP, D11. `shared/ui` primitive foundation is shadcn CLI + Radix, D12.) | Accepted |
| D3 | 2026-07-14 | Styling: Tailwind v4 on `design-system/` tokens — the single visual source, mapped into the Tailwind theme; inline `style={{}}` banned except computed dynamic values | Accepted |
| D4 | 2026-07-14 | framer-motion is the single JS animation system (LazyMotion + `m.`), shared variants in `shared/motion.ts`, reduced motion via `useReducedMotion()` | **REVERSED 2026-07-14 by D11** |
| D5 | 2026-07-14 | Slice `api/model/store` files stay platform-neutral — they run server-side during SSR now, and lift into React Native shared packages later | Accepted |
| D6 | 2026-07-14 | One Next.js app: content-only marketing landing at `/` (route group `(marketing)`, statically rendered) + platform at `/app/*`. `ask.accessToken` is the token storage key; logged-in `/` visitors redirect to `/app/` client-side unless `?from=app`. The `/app/*` prefix keeps a future subdomain split URL-stable | Accepted |
| D7 | 2026-07-14 | Rendering & state policy: route files/layouts are server components; public surfaces (marketing, home, catalog, product card) server-render, fetching via the slice's `api.ts`; authenticated surfaces are client pages. `store.ts` exports store factories consumed via context providers; module-scope store singletons are banned (server request-state leakage). **AMENDED by D23 (2026-07-21):** home/catalog/product are STILL server-rendered but are now behind the client-side auth gate — no longer publicly reachable/crawlable; the "public surfaces" this row names now means the marketing landing + the legal pages only. The rendering policy (server components, client islands) is unchanged | Accepted (amended by D23) |
| D8 | 2026-07-14 | Cross-slice reuse is decided by the ownership test, not judgment: domain-free → duplicate at the 2nd consumer, promote to `shared/ui` at the 3rd; domain-aware keeping the owner's data/behavior → import via owner's `index.ts`; domain-aware with own data/behavior → duplicate into the consumer. Applies to types as well as components (§5) | Accepted |
| D9 | 2026-07-14 | **Sources of truth:** `PRODUCT_VISION.md` is the product authority (screens, flows, controls); the AskBackend API is the data authority (contracts, DTOs, module/slice names). Nothing is built from any other source (P9) | Accepted |
| D10 | 2026-07-14 | Product Card is a modal over the Catalog Page (per the vision), with the same component server-rendered as a full page at `/app/product/:id` for direct visits and SEO; Next.js intercepting routes are the sanctioned mechanism | Accepted |
| D11 | 2026-07-14 | **framer-motion removed (reverses D4)**, before any code depended on it (zero deps, zero source, `shared/motion.ts` never created); **GSAP adopted as its replacement**, same day, once the design workflow was being set up. Single JS animation system per §7: `useGSAP()` + refs, `ScrollTrigger` for scroll-driven storytelling, shared utilities in `shared/motion.ts`. Animate `transform`/`opacity` only — never `width`/`height`/`top`/`left`, which force a layout recalculation every frame; that one rule is what keeps GSAP-driven motion smooth. Reduced motion checked once in `shared/motion.ts`, not per component | Accepted |
| D14 | 2026-07-15 | **Phase 0b closed — the `shared/ui` primitive foundation and the GSAP wrapper landed** (fulfils the D2 deliverable + D11/D12). GSAP installed (`gsap` + `@gsap/react`); `shared/motion.ts` is the one door — it registers the plugins, adopts the design-system motion tokens as GSAP defaults (durations/eases read from CSS, so CSS and GSAP cannot drift), and answers the reduced-motion gate once via `gsap.matchMedia()`. Nine primitives scaffolded via the shadcn CLI and **restyled to tokens before first use** (D12, zero-tolerance P9.2): Button, Input, Select, Card, Dialog (=Modal, D10), Badge, Skeleton, plus own-code Spinner and EmptyState, plus Toast on **sonner**. Two deliberate dependency calls: (a) `next-themes`, which the shadcn sonner wrapper pulls, was REFUSED — ASK has no theme provider or toggle (light/dark is pure CSS `prefers-color-scheme` on the tokens; the vision has no such control, P9.1), so the Toaster is own-code with `theme="system"`; (b) no `tw-animate-css` — its enter/exit classes were stripped from Dialog/Select rather than add a second motion system beside GSAP (§7). The shadcn→ASK token remap is NOT mechanical: shadcn's `accent` is a subtle hover grey, but ASK's `accent` is the brand ORANGE — a find-replace would have painted orange on every hover, breaking the saturation-is-action lock; quiet variants hover to `surface-sunken` instead. The focus signature is one `@utility focus-ring` (2px ring, 2px offset, no blur) applied identically everywhere. Two support tokens added: `--overlay` (a warm scrim, dark in both themes) and the `focus-ring` utility. Build + e2e green; both themes screenshot-verified | Accepted |
| D13 | 2026-07-15 | **The design tokens landed — `design-system/tokens.css` is the visual authority** (fulfils D3; Tailwind v4 + `@tailwindcss/postcss` added to `package.json`, no new *decision*, D3 already chose them). Authored in **OKLCH**, so a lightness step means the same thing at every hue and the ramps are honest rather than eyeballed. The three problems the inherited direction left OPEN are now closed, each by measurement: **(a) the accent** is `oklch(0.575 0.161 46)` — hue 46 sits deliberately between Amazon's yellow-orange (hue 63) and the dusty terracotta of the #1 AI-design cliché; chroma 0.161 is the sRGB gamut ceiling at that lightness; and 0.575 is the *brightest* orange that still holds white text at AA (4.67:1). Light and dark carry **different accent values at the same hue** because one value provably cannot serve both — the light accent measures 3.84:1 on the dark surface, legal but muddy — so `--accent-foreground` is a token (white in light, ink in dark). **(b) The discount collision is solved by REGISTER, not hue: *saturation is action, tint is information.* The accent is the only high-chroma fill in the product and marks only actionable things; a Unique Offer is a low-chroma tint (chroma 0.032 against the accent's 0.161) whose weight comes from bold tabular numerals. They cannot compete because they are not in the same register. **(c) The typeface** is Golos Text — Cyrillic-native, drawn for a high-traffic public-service UI where people finish a task and leave. All **31 rendered contrast pairs verified ≥ their WCAG floor; every value inside the sRGB gamut**. Components **never write `dark:` for colour** — `@theme inline` resolves each utility to a primitive the dark media query redefines. No theme toggle: the vision has no such control (P9.1) | Accepted |
| D12 | 2026-07-14 | **shadcn CLI adopted as SCAFFOLDING for `shared/ui` primitives** (Button, Input, Select, Card, Modal, Toast, Badge, Loading/skeleton, EmptyState — the D2 deliverable in the design brief). It is copied into the repo, not installed as a live dependency: Radix (its accessibility/behavior layer — focus trap, keyboard nav, ARIA) becomes a real `package.json` dependency, but every visual class shadcn generates is restyled to `design-system/` tokens before the component is used anywhere — P9.2's zero-tolerance-for-raw-values rule is unchanged and unrelaxed. A shadcn default value shipping unrestyled is a violation, not a style choice | Accepted |

New decisions append a row; changing an Accepted decision requires owner approval.

**§11 correction — 2026-07-21 (D18's "the marketing landing stays ru" is superseded):** D18 (2026-07-15) twice states that the marketing landing renders in Russian. That sub-detail is now **stale**, superseded by a SEPARATE, already-approved owner decision — the default locale moved `ru` → `kk` on 2026-07-20 (Changelog 2026-07-20; `defaultLocale` in `shared/i18n/locales.ts`). The server always serves `defaultLocale`, so the static landing at `/` now server-renders **kk (Kazakh)**, not ru — every place D18/D19 says "ru" as the landing/default language, read **kk**. This is a factual correction to a stale detail, NOT a change to the D18 decision itself (the client-side `/app` locale switch stands unchanged), so it needs no new owner approval — it merely propagates the 2026-07-20 default-locale decision into this authority, per After-change §7 ("a change that made a doc entry wrong → fix it").
