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

