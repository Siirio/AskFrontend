# Native Entity Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped inline creation forms for Branch, Item, Service, and UniqueOffer with task-oriented creation experiences that use the existing backend fields.

**Architecture:** Introduce a reusable accessible editor shell for side drawers and focused step workspaces. Keep request handlers and entity state in their current owners, while moving presentation and progressive disclosure into focused components. Extend the existing wanted stylesheet and locale dictionaries instead of introducing a second visual system.

**Tech Stack:** React, TypeScript, Framer Motion, lucide-react, i18next, existing FCW design tokens.

## Global Constraints

- Preserve AskBackend request and response contracts.
- Use canonical entity terms Item, Service, and UniqueOffer in code and API state.
- Keep the Item link required and permanently visible in the primary form section.
- Do not expose Item or Service active controls during creation; creation sends `isActive: true`.
- Do not display branch latitude or longitude as form fields.
- Do not change the protected business-card canvas.
- Do not run tests at the user’s request.
- Do not commit or push.

---

### Task 1: Reusable creation shell

**Files:**
- Create: `src/shared/ui/EntityEditor/EntityEditor.tsx`
- Modify: `src/app/wanted.css`

**Interfaces:**
- Produces: `EntityEditor`, `EditorSection`, and `EditorDisclosure` presentation components.
- Consumes: existing button, spacing, surface, and theme tokens.

- [ ] Create a portal-backed drawer/focused workspace shell with an accessible title, close action, backdrop, body, and sticky footer.
- [ ] Add responsive styles so drawers become full-screen below the mobile breakpoint.
- [ ] Add shared section, progress, summary, and disclosure styles with complete focus-visible behavior.

### Task 2: Item and Service drawers

**Files:**
- Modify: `src/pages/BusinessPage/ProductsTab.tsx`
- Modify: `src/pages/BusinessPage/ServicesTab.tsx`
- Modify: `src/pages/BusinessPage/BusinessPage.tsx`
- Modify: `src/shared/i18n/locales/ru.json`
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/kk.json`

**Interfaces:**
- Consumes: existing form state and create/update handlers.
- Produces: progressive Item and Service creation drawers.

- [ ] Replace inline create cards with `EntityEditor` drawers.
- [ ] Keep required identity fields visible and move metadata into `EditorDisclosure`.
- [ ] Show schedule only when the Service mode is `SCHEDULED`.
- [ ] Keep activation controls only in edit mode and force active state in create handlers.

### Task 3: Branch creation workspace

**Files:**
- Create: `src/pages/BusinessPage/BranchEditor.tsx`
- Modify: `src/pages/BusinessPage/BusinessPage.tsx`
- Modify: `src/shared/i18n/locales/ru.json`
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/kk.json`

**Interfaces:**
- Consumes: `BranchFormState`, city data, `MapLocationPicker`, and existing branch handlers.
- Produces: two-step create/edit workspace with address and schedule stages.

- [ ] Extract branch form presentation from `BusinessPage`.
- [ ] Implement address and schedule steps with explicit progress and back/next controls.
- [ ] Keep map coordinates internal and show only the resolved human-readable address.
- [ ] Preserve weekly and special hours payload structure.

### Task 4: UniqueOffer composer

**Files:**
- Modify: `src/widgets/DropsEditor/DropsEditor.tsx`
- Modify: `src/shared/i18n/locales/ru.json`
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/kk.json`

**Interfaces:**
- Consumes: existing `BrandDropDto` create/cancel/delete callbacks.
- Produces: three-step UniqueOffer composer with a review stage.

- [ ] Replace the dense drawer body with staged type/details, promotion, and publication sections.
- [ ] Validate name and date ordering before advancing or saving.
- [ ] Present a compact final summary using only existing fields.
- [ ] Preserve create, cancel, delete, AI enrichment, and read-only behavior.

### Task 5: Documentation synchronization

**Files:**
- Modify: `AI_Knowledge/product_ux/EXPECTED_UX_UI_FLOW_FRONTEND.md`
- Modify: `AI_Knowledge/CHANGELOG_FOUNDATION_FRONTEND.md`

**Interfaces:**
- Consumes: the implemented interaction behavior.
- Produces: current product UX documentation for future frontend changes.

- [ ] Record the drawer/workspace split and progressive-disclosure rules.
- [ ] Record that creation hides active flags and uses backend defaults.
- [ ] Review the local diff for accidental contract or protected-surface changes without running tests.
