# ASK Frontend — Project Locks

Format: `LOCKED | {what} | {why} | {scope}`

Breaking requires: (1) explicit user approval, (2) proof surrounding extension is insufficient.

## Structure Locks
LOCKED | Slices mirror AskBackend module names; a feature folder exists per slice, 1:1 | One mental map across the product; 1:1 mapping if backend modules ever become services | src/*, AI_Knowledge/features/*
LOCKED | No layer folders — entities/, features/, widgets/, or global components/services/utils | Code is cut by domain, not by technical layer (VSA) | src/ top level, boundaries/no-unknown
LOCKED | Cross-slice imports only through the slice's index.ts | The door rule (R2) — deep imports couple internals and freeze them | boundaries/entry-point
LOCKED | shared/, design-system/, lib/ never import a slice or app/ | One-way dependency (R1) — the toolbox knows nothing about the business | boundaries/element-types
LOCKED | No business words in shared/ — translations are the one sanctioned exception | Domain-aware code belongs to its slice (§5 litmus test) | src/shared/*
LOCKED | ESLint boundary rules are never disabled or weakened to make a change pass | Boundaries are compile-time laws, not conventions | eslint.config.js, CI

## Rendering & State Locks
LOCKED | Route files and layouts stay server components; 'use client' only at interactive components | Public surfaces must server-render — SEO is a core requirement (D7) | src/app/**/page.tsx, layout.tsx
LOCKED | zustand stores are factories consumed via context providers, never module-scope singletons | Module-scope stores leak state across SSR requests | slice store.ts
LOCKED | api.ts / model.ts / store.ts stay free of DOM and browser APIs | They run server-side during SSR now, and lift into React Native packages later (D5) | slice api.ts, model.ts, store.ts

## Data Locks
LOCKED | Components never call fetch or an endpoint URL — only the owning slice's api.ts | Single HTTP implementation; one place to change a contract (§7, P1.2) | all ui/ components
LOCKED | Token access only through shared/api storage helpers; ask.accessToken is the storage key | Cross-app contract + swappable TokenStorage for mobile (P5.2, D6) | shared/api, auth slice
LOCKED | The backend is the data authority — DTO shapes are never invented or patched client-side | A mismatch is raised, never silently faked (P9.4) | slice api.ts, model.ts

## Product Locks
LOCKED | Build only screens, flows and controls that exist in PRODUCT_VISION.md | The vision is the product authority (D9, P9.1). Invented UI is forbidden — if it seems missing, STOP and ASK | all ui/, app/(marketing)
LOCKED | Marketing content lives only in app/(marketing)/ — content only, never imports a slice | One copy of the marketing content; the landing stays static and SEO-first (D6) | src/app/(marketing)
LOCKED | The /app/* prefix and the marketing / route are kept | Preserves the future app. subdomain split without breaking a single URL (D6) | src/app/app/*
LOCKED | No magic visual values — colors, sizes, spacing, radii come from design-system tokens | One visual source (D3, P9.2) | all ui/, tailwind theme
