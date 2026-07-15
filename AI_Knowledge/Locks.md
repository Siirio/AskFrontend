# ASK Frontend — Project Locks

Format: `LOCKED | {what} | {why} | {scope}`

Breaking requires: (1) explicit user approval, (2) proof surrounding extension is insufficient.

## Structure Locks
LOCKED | Slices mirror AskBackend module names; a feature folder exists per slice, 1:1 | One mental map across the product; 1:1 mapping if backend modules ever become services | src/*, AI_Knowledge/features/*
LOCKED | No layer folders — entities/, features/, widgets/, or global components/services/utils | Code is cut by domain, not by technical layer (VSA) | src/ top level, boundaries/no-unknown-files + boundaries/no-unknown-dependencies
LOCKED | Cross-slice imports only through the slice's index.ts | The door rule (R2) — deep imports couple internals and freeze them | boundaries/dependencies (fileInternalPath "index.ts" policy)
LOCKED | shared/, design-system/, lib/ never import a slice or app/ | One-way dependency (R1) — the toolbox knows nothing about the business | boundaries/dependencies
LOCKED | No business words in shared/ — translations are the one sanctioned exception | Domain-aware code belongs to its slice (§5 litmus test) | src/shared/*
LOCKED | ESLint boundary rules are never disabled or weakened to make a change pass | Boundaries are compile-time laws, not conventions | eslint.config.mjs, the npm run build chain

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
LOCKED | shadcn-generated code is copied and restyled to design-system tokens before first use — Radix supplies behavior only, never a shipped default value | shadcn is scaffolding, not a live design source (D12); P9.2 applies without exception | src/shared/ui/*
LOCKED | GSAP animates transform/opacity only — never width/height/top/left | Layout-triggering properties force a recalculation every frame; this is what keeps motion smooth (D11) | shared/motion.ts, all GSAP usage

## Design Locks
The visual direction was decided by the product owners. These are its invariants — an agent may improve the EXECUTION, never re-open the DECISION. Full operational rules: `.claude/skills/{marketing,platform}-ui-design/SKILL.md`.

LOCKED | No marketplace idioms, anywhere: no star ratings / review scores / 5-point scales, no buy-box, no cart or checkout, no visible match score, and never a price-first default sort | ASK is an intent layer that routes demand to brands WITHOUT commoditizing them. The marketplace is the pattern the training data reaches for by default, so this must be a law, not a preference | all ui/, app/(marketing)
LOCKED | Quiet chrome, ONE accent and it is ORANGE, on warm neutrals — saturation is spent only on the primary/search action | Result cards stage many businesses' own logos and brand colors at once; a loud ASK fights them. The orange must pass WCAG AA on light AND dark with a stated foreground, and must not collide with the offer/discount label | design-system/ tokens, all ui/
LOCKED | Trust badges (data freshness, confirmation speed, card quality, business activity) render as METADATA — never a score, never a green/amber/red traffic light, never anything mistakable for a rating | They are facts about a listing, not opinions about a business. A score is a rating by another name, and this product has no ratings | all ui/ badges
LOCKED | SATURATION IS ACTION; TINT IS INFORMATION. The accent is the only high-chroma fill in the product and marks only actionable things (primary action, focus ring). A Unique Offer is a low-chroma tint with ink text and bold tabular numerals — never an accent fill, never a pill | Solves the discount collision (D13): if orange is BOTH the primary action AND the sale signal they compete, and ASK starts looking like the marketplace it refuses to be. The separation is by register, not hue — so it survives a palette change | design-system/tokens.css, all ui/
LOCKED | The webfont MUST load the `latin-ext` subset — ₸ (U+20B8) lives there, in NO Cyrillic range | A ru/kk product naturally loads only cyrillic+cyrillic-ext; that silently falls every price on the platform back to a system font. Verified, not assumed (D13) | src/app/layout.tsx
