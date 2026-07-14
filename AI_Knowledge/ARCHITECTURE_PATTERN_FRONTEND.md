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
| Slice granularity | Slice = use case ("AddToCart", "CancelOrder") | Slice = **business domain** ("search", "requests"); use-case subfolders allowed inside a slice if it grows | Package-by-feature / modular monolith |
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
  public/                        # static assets served as-is (favicons, og images, videos)
  next.config.ts
  src/
    app/                         # Next.js App Router = the composition root (R3).
                                 # Wiring + content-only marketing pages. ZERO business logic.
      layout.tsx                 #   root layout: <html>, fonts, providers
      globals.css                #   global styles entry (Tailwind v4 + design-system tokens)
      providers/                 #   client components MOUNTING contexts; logic/hooks live in slices (R6)
      _components/               #   app chrome: navigation menu, profile card, footer — used only by layouts here
      (marketing)/               #   Landing Page (UF 1): static, SEO-first, CONTENT ONLY —
        page.tsx                 #     imports shared/ + design-system only; never slices, no api/store
      app/                       #   the platform under /app/*
        layout.tsx               #     platform shell wrapping every /app/* page
        page.tsx                 #     /app               → @/search HomePage (+ role modal)  [server]
        auth/page.tsx            #     /app/auth          → @/auth AuthPage (sign up/log in)  [client]
        catalog/page.tsx         #     /app/catalog       → @/search CatalogPage              [server]
        product/[id]/page.tsx    #     /app/product/:id   → @/catalog ProductCard (D10)       [server]
        chats/page.tsx           #     /app/chats         → @/chats                           [client]
        profile/page.tsx         #     /app/profile       → @/profile                         [client]
        business/page.tsx        #     /app/business      → @/business-cabinet                [client]
    auth/                        # ← backend: identity  — Authorization Page, role choosing modal, session (R6)
    search/                      # ← backend: search    — Home (search entry) + Catalog Page (list, sort, filters)
    catalog/                     # ← backend: catalog   — Product Card (modal + page, D10); seller Products tab
    services/                    # ← backend: service   — seller Services tab; service details in the card
    chats/                       # ← backend: chat      — Chats Page, chat thread, business chat views
    requests/                    # ← backend: request   — customer requests, supplier tasks (cabinet "Requests")
    profile/                     # ← backend: identity  — profile card content, settings, sign out
    business-cabinet/            # ← backend: business  — seller workspace shell (UF 3.1): Overview/Requests,
                                 #     Branches, Unique Offers, Company Profile, Company Dashboard;
                                 #     Products/Services/Requests tabs embed the owning slices' features (R2, D8)
    shared/                      # domain-free code ONLY (§5)
      api/                       #   httpClient (usable server- and client-side), transport helpers — NO domain endpoints
      ui/                        #   generic primitives: Button, Input, Card, Modal, Toast, ...
      i18n/                      #   next-intl plumbing + messages/{ru,kk,en}.json (sanctioned exception, §5)
      config/                    #   env access
      motion.ts                  #   THE shared framer-motion variants (D4)
    design-system/               # CSS tokens and base styles — the single visual source (D3); feeds the Tailwind theme
    lib/                         # platform utilities free of business meaning
```

Backend modules with **no V1 surface** (`autodump`, `contact`) get no slice yet — a slice is created via the process below when the product grows a surface for them.

**Route files are THIN.** A `page.tsx` contains at most: `metadata`/`generateMetadata`, server-side data fetching via the owning slice's `api.ts` (public surfaces), and rendering the slice's page component. No components, no business logic, no styling systems inside route files. The `[server]`/`[client]` markers above are decision D7.

**Product Card presentation (D10):** per the product vision, the Product Card is a modal over the Catalog Page ("Proceed to Purchase" + chat buttons, may open the chat modal directly). Direct visits and search engines get the same card as a full server-rendered page at `/app/product/:id`. Next.js intercepting routes are the sanctioned mechanism (modal in-flow, full page on direct load); both presentations render the same `@/catalog` component.

**Platform boundary (D6):** marketing pages are content-only: they import `shared/` and `design-system/` but never a slice, and have no `api/model/store`. Marketing is the ONLY copy of the marketing content. Logged-in visitors on `/` are redirected to `/app/` by a client-side check of the `ask.accessToken` storage key, suppressed by `?from=app`. The `/app/*` prefix preserves a future `app.` subdomain split without breaking a single URL.

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
- **`'use client'` policy (D7):** route files and layouts are server components and stay that way. Slice `ui/` components that use state, effects, stores, or framer-motion declare `'use client'`. Public surfaces (marketing, home, catalog, product card) are server-rendered pages with interactive client islands inside; authenticated surfaces (auth, business-cabinet, chats, profile) are client pages behind a thin server route file.
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

- A cabinet tab that manages ANOTHER domain's data (Products → `catalog`, Services → `services`, Requests → `requests`) is built inside the slice that owns the data and embedded into `business-cabinet` via that slice's `index.ts` (R2, D8) — the cabinet is composition, not ownership.
- A feature becomes a new top-level slice ONLY when it maps to its own backend module, via the §2 process (doc entry + ESLint pattern in the same commit).

## 4. Import Rules (strict)

- **R1 — Downward only.** Slices MAY import from `shared/`, `design-system/`, `lib/`. `shared/`, `design-system/`, `lib/` MUST NOT import from any slice or from `app/`.
- **R2 — Cross-slice via public API only.** A slice MAY import another slice, but ONLY from its `index.ts` (e.g. `import { ProductCard } from "@/catalog"`). Deep imports (`@/catalog/ui/ProductCard`) are forbidden.
- **R3 — App is the composition root.** Route files in `app/` import slice public APIs and render their pages; `app/providers` mounts contexts; layouts wrap pages. No slice imports from `app/`.
- **R4 — Aliases only.** All non-relative imports use the `@/` alias. Relative imports (`./`, `../`) are allowed only WITHIN one slice, and never reach above the slice root (`../../` leaving the slice is forbidden).
- **R5 — Minimize cross-slice edges.** Before adding a cross-slice import, check the decision table (§6). Cycles between slices are forbidden; if two slices need each other, the shared piece moves down to `shared/` (if domain-free) or the boundary is wrong — raise it.
- **R6 — Auth is the foundation slice; context ownership.** Any slice may import `@/auth` (current user, role, `useAuth`); `auth/` imports no other slice — the one sanctioned hub stays cycle-free. In general: a React context object and its consumer hook are DEFINED in the owning slice and exported via its `index.ts`; `app/providers` only mounts the provider component (this is how P5.3 coexists with R3).

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
| A business-cabinet tab managing another domain's data | The owning slice (Products → `catalog`, Services → `services`, Requests → `requests`), embedded via its `index.ts` (§3, R2) |
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
| JS animation | framer-motion, LazyMotion + `m.`, shared variants in `shared/motion.ts`; reduced motion via `useReducedMotion()` (D4) | second animation library, hand-rolled WAAPI |
| Styling | Tailwind v4 utilities on design-system tokens (D3) | inline `style={{}}` except computed dynamic values; CSS-in-JS; mixing systems in one component |
| i18n | next-intl, messages in `shared/i18n/messages` (D2) | react-i18next, hardcoded user-facing strings |
| Icons | lucide-react (D2) | second icon set, ad-hoc inline SVGs for standard glyphs |
| Images | `next/image` for every raster image (D2 — SEO/perf goal) | raw `<img>` |

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
    { type: "slice",  pattern: "src/(auth|search|catalog|services|chats|requests|profile|business-cabinet)/**", capture: ["slice"] },
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
| D1 | 2026-07-14 | Vertical Slice Architecture with enforced boundaries; slices mirror AskBackend module names (1:1 mapping to future services if modules are ever extracted) | Accepted |
| D2 | 2026-07-14 | Greenfield Next.js (App Router), web-first: SSR + SEO from day one. Stack: TypeScript, Tailwind v4 (D3), zustand via factories (D7), framer-motion (D4), next-intl, lucide-react, `next/image`, Playwright | Accepted |
| D3 | 2026-07-14 | Styling: Tailwind v4 on `design-system/` tokens — the single visual source, mapped into the Tailwind theme; inline `style={{}}` banned except computed dynamic values | Accepted |
| D4 | 2026-07-14 | framer-motion is the single JS animation system (LazyMotion + `m.`), shared variants in `shared/motion.ts`, reduced motion via `useReducedMotion()` | Accepted |
| D5 | 2026-07-14 | Slice `api/model/store` files stay platform-neutral — they run server-side during SSR now, and lift into React Native shared packages later | Accepted |
| D6 | 2026-07-14 | One Next.js app: content-only marketing landing at `/` (route group `(marketing)`, statically rendered) + platform at `/app/*`. `ask.accessToken` is the token storage key; logged-in `/` visitors redirect to `/app/` client-side unless `?from=app`. The `/app/*` prefix keeps a future subdomain split URL-stable | Accepted |
| D7 | 2026-07-14 | Rendering & state policy: route files/layouts are server components; public surfaces (marketing, home, catalog, product card) server-render, fetching via the slice's `api.ts`; authenticated surfaces are client pages. `store.ts` exports store factories consumed via context providers; module-scope store singletons are banned (server request-state leakage) | Accepted |
| D8 | 2026-07-14 | Cross-slice reuse is decided by the ownership test, not judgment: domain-free → duplicate at the 2nd consumer, promote to `shared/ui` at the 3rd; domain-aware keeping the owner's data/behavior → import via owner's `index.ts`; domain-aware with own data/behavior → duplicate into the consumer. Applies to types as well as components (§5) | Accepted |
| D9 | 2026-07-14 | **Sources of truth:** `PRODUCT_VISION.md` is the product authority (screens, flows, controls); the AskBackend API is the data authority (contracts, DTOs, module/slice names). Nothing is built from any other source (P9) | Accepted |
| D10 | 2026-07-14 | Product Card is a modal over the Catalog Page (per the vision), with the same component server-rendered as a full page at `/app/product/:id` for direct visits and SEO; Next.js intercepting routes are the sanctioned mechanism | Accepted |

New decisions append a row; changing an Accepted decision requires owner approval.
