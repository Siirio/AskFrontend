# Approved Logic Locks

## LOCKED: Business card canvas editor has no right sidebar
- Scope: src/widgets/BusinessCardBuilder/BusinessCardBuilder.tsx; src/widgets/BusinessCardBuilder/types.ts
- Approved signal: user requested: do these and lock the rules
- Protected behavior: The business-card editor is a canvas-first editor: create elements from right-click canvas/section context, edit text inline on double click, edit properties through contextual floating menus/popovers near the canvas, and do not reintroduce a right sidebar inspector for font, color, radius, border, image URL, or element settings.
- Reuse pattern: Preserve the existing implementation pattern unless the unlock condition is met.
- Allowed changes: Small contextual controls, inline editing, keyboard shortcuts, drag/resize/rotate improvements, and persistence-compatible element fields are allowed if they preserve the no-right-sidebar canvas model.
- Unlock condition: Explicit user request to change this behavior or evidence that the core execution pipeline changed.
- Created: 2026-07-06

## LOCKED: Business card uses business-card API and full canvas sections
- Scope: src/pages/BusinessPage/BusinessPage.tsx; src/pages/StorefrontPage/StorefrontPage.tsx; src/shared/api/askClient.ts; src/widgets/BusinessCardBuilder/BusinessCardBuilder.tsx
- Approved signal: user requested: do these and lock the rules
- Protected behavior: The business-card editor loads/saves through /business-card endpoints, stores full CANVAS_SECTION blocks with positions, sizes, styles, content, image URLs, borders, radii, zIndex, and section data, publishes the latest current canvas payload, and public storefront rendering must prefer the published business-card canvas when present.
- Reuse pattern: Preserve the existing implementation pattern unless the unlock condition is met.
- Allowed changes: DTO naming, visual polish, mobile rendering, and additional element properties are allowed if save/reload/publish/public rendering keep exact canvas restoration.
- Unlock condition: Explicit user request to change this behavior or evidence that the core execution pipeline changed.
- Created: 2026-07-06

## LOCKED: Requirements authority and conflict handling

**Approved signal:** User clarification on 2026-07-22.

**Protected behavior:** The user's current instructions together with applicable `AI_Knowledge` feature documentation jointly define intended behavior. Applicable feature documentation must be read before behavior is diagnosed or changed. Existing code is not proof of correctness unless the exact behavior is explicitly locked as working or documented as approved.

**Conflict rule:** Stop and ask the user when instructions, documentation, or locks conflict, or when material behavior, data, authorization, or acceptance criteria are missing. Never silently choose existing code or an assumption.

**Allowed changes:** Synchronize documentation and locks after the user resolves the conflict or approves changed behavior.

## LOCKED: Canonical entity terminology across layers

**Approved signal:** User correction on 2026-07-22.

**Protected behavior:** Frontend state, URL/query values, API clients and documentation use entity terminology unchanged. `BusinessScope` is only `ITEM`, `SERVICE`, or `BOTH`; managed-import payloads use `selectedSourceTypes`.

**Scope:** Seller onboarding, managed import and platform business access.

## LOCKED: Business-scoped managed-import workspace

**Approved signal:** User clarification on 2026-07-23.

**Protected behavior:** Activating a managed-import request immediately gives the assigned platform member access to that Business for the request's `ITEM`, `SERVICE`, or `BOTH` scope for seven days. The frontend uses the business-specific access response and never a global catalog-edit permission.

**Scope:** BusinessPage platform workspace, managedImportClient, platform permission UI.

## LOCKED: Hidden map-derived coordinates and branch hours

**Approved signal:** User clarification on 2026-07-23.

**Protected behavior:** OWNER and MANAGER may edit branch working hours. Latitude and longitude remain internal values derived from map interaction or supported map links and are never rendered as numeric inputs or values.

**Scope:** Branch forms, MapLocationPicker, mapLocationResolver, branch API payloads.
