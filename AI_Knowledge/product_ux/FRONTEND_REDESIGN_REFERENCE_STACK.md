# Frontend Redesign Reference Stack

Created: 2026-07-04

This file is the durable reference for the full Ask frontend remake. Use it before changing the UI, component structure, visual system, or motion stack.

## Source Priority

1. `C:\MyProjects\Team\Ask\AskFrontend\AGENTS.md` and this reference stack carry the current warm ivory/orange wanted-reference brief with an equivalent graphite dark theme.
2. `C:\MyProjects\Team\Ask\AskFrontend\AI_Knowledge\product_ux\EXPECTED_UX_UI_FLOW_FRONTEND.md` remains the behavioral UX source of truth.
3. `C:\MyProjects\Team\Ask\AskFrontend\AI_Knowledge\client_contracts\FRONTEND_BACKEND_CONTRACT_FRONTEND.md` and backend `AI_Knowledge/backend_tasks/*.md` define API and state boundaries.
4. `DESIGN_AND_VISUALS_FRONTEND.md` is deleted in the current working tree and its old light/teal direction is stale for this remake.

If these sources conflict, use `AGENTS.md` and this reference stack for visual structure, and use the UX/API contracts for product behavior. `Обзор` is the new premium business working surface; keep request/activity content embedded there instead of adding separate `Заявки` or `Команда` top-level pages.

## Non-Negotiable Product Constraints

- Keep the frontend a PWA.
- Keep search-first customer flow: `Поиск`, `История`, `Профиль`.
- Preserve raw query and locked `ITEM`/`SERVICE` scope after submit.
- Do not create standalone business search.
- Do not sort by price by default; default sorting is intent/relevance.
- Do not invent stock, freshness, availability, ratings, partner status, courier promises, or guaranteed booking slots.
- Show product results, suitable supplier/branch checks, supplier responses, chats, and history as separate meanings.
- Show service flow as request-to-book and chat-first confirmation.
- Use backend snake_case/camelCase adapters consistently: `transformKeys()` for responses and `camelToSnakeKeys()` for request bodies.
- Keep business work branch-scoped for owner/staff.
- Profile must become a real brand/contact/branch surface, not a placeholder card.

## Visual Direction

- Light mode uses warm ivory canvas and surfaces with restrained orange emphasis; dark mode uses graphite/charcoal with the same structure and hierarchy.
- Light mode is the default. Theme switching changes semantic tokens only and must not produce different features or layouts.
- Desktop follows the approved wanted references: centered pill navigation, generous warm canvas, rounded low-contrast surfaces, compact search/result density, three-column chat, editorial storefront, and operational business cabinet.
- Mobile keeps the same content order with bottom navigation, drawers, and single-column detail transitions.
- The product-specific narrative device is request-to-trust: a messy raw search becomes structured intent, relevant offers, and clear next actions.
- Business cabinet should feel operational and dense, not like a marketing landing page.

## Component Rules

- Build a real design system before screens: tokens, typography, spacing, radius, shadows, focus, motion, and status colors.
- No nested cards, no card-heavy marketing sections, no oversized hero blocks inside app surfaces.
- Replace native-looking selects on premium surfaces with custom accessible listbox/popover controls.
- Style scrollbars, text selection, focus, loading, errors, disabled states, file upload, empty states, offline states, and long-content states.
- Use icons for tools and commands where a standard symbol exists; keep text labels for commands that need clarity.
- Keep layout dimensions stable for toolbars, tabs, bottom nav, status chips, import rows, tables, and result cards.
- Russian text must wrap cleanly without overlap or clipped controls.

## Architecture Direction

- Current app is Vite + React 19 + TypeScript + lucide-react.
- Current `vite.config.ts` uses `vite-plugin-pwa`; preserve manifest, auto-update service worker behavior, and install assets when changing build config.
- Keep Feature-Sliced Design boundaries where practical: `app`, `pages/widgets/features/entities/shared`.
- The current single large `App.tsx` can be replaced. Reuse only real API helpers and proven contract logic.
- Preserve `src/shared/api/httpClient.ts` behavior or replace it with an equivalent tested API layer.
- Add motion dependencies only when implementation starts and only where used.

## Tool And Skill Stack

- `mcp-tool-router`: capability selection before non-trivial frontend work.
- `impeccable`: anti-slop product/design layer. Local version observed as v3.8.0 with v3.9.1 update available.
- `premium-motion-web`: motion hierarchy and visual QA. Current frontend is missing `motion`, `gsap`, `lenis`, `three`, R3F, Drei, `clsx`, and `tailwind-merge`.
- `frontend-design`: app-specific UI quality rules for spacing, hierarchy, mobile, controls, and visual polish.
- `context7`: current docs for React/Vite/PWA/component libraries before implementation.
- Playwright: required for screenshots and viewport verification before calling the frontend done.
- Figma/Product Design tools: use when a design system, reusable frames, or design-to-code mapping is useful.
- 21.dev or Componentry-style references: inspiration only. Pick at most one signature component idea and two supporting ideas; do not paste a template.

## External References And Use Cases

- [HeroUI](https://heroui.com/en/docs/react/getting-started): optional accessible component baseline for popovers, dropdowns, dialogs, tabs, and forms if adopting Tailwind v4/React Aria patterns. Use as infrastructure, not as the visual identity.
- [HeroUI releases](https://heroui.com/en/docs/react/releases): current HeroUI v3 direction includes Tailwind v4, React Aria, OKLCH tokens, reduced-motion hooks, and compound components.
- [10x.app](https://www.10x.app/): reference for native-app ambition and production Swift/native feel. Not a UI kit.
- [Refero](https://refero.design/): flow and screen reference mining for web/iOS patterns.
- [Refero Styles](https://styles.refero.design/): AI-readable `DESIGN.md` examples from real product websites; use to compare token discipline and avoid generic style.
- [Realtime Colors](https://www.realtimecolors.com/): palette and contrast validation on a real UI mock before finalizing the graphite/ivory/orange system.
- [Mobbin](https://mobbin.com/): mobile flow references, including wallet/card/search/onboarding patterns and PLATA-like app screens.
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/): required implementation reference for manifest, icons, service worker, update behavior, and dev testing.

## PWA Gate

Implementation must include:

- `vite-plugin-pwa` or an equivalent maintained PWA setup.
- Manifest with `name`, `short_name`, `description`, `theme_color`, icons, and maskable icon.
- Install icons and maskable assets. SVG icons are acceptable in local implementation; export 192x192 and 512x512 PNGs before app-store-grade handoff.
- Registered service worker and clear update behavior.
- Offline/poor-network handling that does not look like browser default failure.
- Mobile viewport, safe-area, installability, and theme color checked.

## Screen Acceptance Checklist

- Auth split layout: customer/business, register/login/verify, role errors, password/contact validation, real loading/error states.
- Customer search: raw query, city/category scope, product/service segmented mode, results, suitable suppliers, chats after real chat, empty/history/snapshot states.
- Product result cards: brand-aware, anti-marketplace, no fake availability, clear branch/chat actions.
- Service result cards: desired time and request-to-book truth, no fake guaranteed slots.
- Business `Обзор`: request/activity inbox, branch context, clear next action, no separate top-level `Заявки`.
- Products and services: create/edit/enable/disable/delete, category controls, empty and import prompts.
- Import: upload, auto-mapping, custom mapping, preview validation, approve/cancel, final result.
- Branches/profile: brand/contact/branch management and team inside branch detail.
- Modals/drawers: custom accessible premium surfaces with keyboard and focus handling.
- Global states: loading, empty, error, disabled, offline, reduced motion, long text, small mobile, wide desktop.

## Organization Page Design (2026-07-16)

Emil Kowalsky design applied to BusinessPage branches + employees — merged into a single `organization` sidebar tab.

### Design Principles Applied
- **Editorial typography hierarchy**: h3 section headers, body-s subtitles with counts, minimal decoration
- **Thin borders over heavy cards**: `var(--fcw-border-width-thin)` borders on `var(--fcw-radius-lg)` containers, no card wrappers
- **Generous whitespace**: `var(--fcw-space-xl)` gap between branches and team sections, separated by 1px divider
- **Status through dots**: 6px colored dots + monochrome text instead of heavy status badges
- **Outlined tags**: role/badge tags use `border` + transparent background instead of filled backgrounds
- **Content-first density**: operational feel — dense enough to scan, spaced enough to breathe
- **One interaction per element**: clickable staff rows get subtle border transition on selection, not hover elevation

### Layout Structure
```
organization/
├── Branches section
│   ├── Header (title + count + Add Branch CTA)
│   ├── Add/Edit branch form (AnimatePresence, Card)
│   └── Branch list
│       ├── Branch row (name, address, city/online tags, staff toggle, edit)
│       └── Staff panel (expandable: add form, member rows, edit controls)
├── 1px divider
└── Team section (business-level employees)
    ├── Header (title + count + Add Employee CTA)
    ├── Add employee form (AnimatePresence, Card)
    └── Employee list (minimal rows with dot-status)
```

### Role Visibility
- **Owner**: sees branches + staff + team, can add/edit branches/staff/employees
- **Manager**: sees branches + staff + team, can add staff + employees (no branch add/edit)
- **Worker**: sees nothing (organization tab hidden from sidebar entirely)

## Final Verification Before Shipping

- Static TypeScript check.
- Browser checks when the task explicitly includes automated visual verification.
- Reduced-motion and responsive CSS must remain implemented even when the user requests manual click-through testing.
- API contract check against auth, search, business product/service, chat, profile, branch, and import endpoints.

## Search and cabinet corrections (2026-07-27)

- The home search has no enclosing square surface; the large rounded search field is the primary visual object.
- A submitted search remains the active customer context across internal navigation until the customer focuses the search field to begin another query.
- Chat actions outside the full `Чаты` screen use the fixed right drawer and preserve the screen underneath.
- The Business profile is a distinct bottom sidebar card with Business identity and branch location context.
