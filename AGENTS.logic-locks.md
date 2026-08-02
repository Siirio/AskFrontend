# Approved Logic Locks

## LOCKED: Catalog galleries and responsive result details

**Approved signal:** User clarification on 2026-08-02.

**Protected behavior:** ITEM and SERVICE editors accept up to three real ASK-managed images through file selection, drag-and-drop, and clipboard paste. The user controls order and the first image is primary. Desktop rows preview details on hover/focus; mobile rows open a detail modal on tap. Business avatar and chat are independent actions, and only the avatar opens the Business profile. Match reasons are not rendered. Public Business profiles use one continuous surface and omit empty optional fields.

**Scope:** Business catalog editors, ResultsPage, ResultCard, StorefrontPage, catalog/search DTOs, and media API clients.

## LOCKED: Seller delivery onboarding and profile editing

**Approved signal:** User correction on 2026-07-27.

**Protected behavior:** Seller onboarding has a penultimate delivery-and-pickup screen before final confirmation. It records one coverage value (`NO_DELIVERY`, `SELECTED_CITIES`, `KAZAKHSTAN`, or `WORLDWIDE`), requires at least one city for `SELECTED_CITIES`, records pickup independently, and exposes the same fields for later editing in the Business profile.

**Scope:** SellerOnboardingPage, sellerOnboardingClient, ProfileEditor, BrandProfileDto, Business profile API contract.

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

## LOCKED: Exception-only platform moderation

**Approved signal:** User clarification on 2026-07-29.

**Protected behavior:** Normal active Items, Services, and UniqueOffers from every Business, including legal form `NONE`, publish immediately. Only suspicious content identified by automated checks or explicit reports enters platform moderation. The platform UI must never fill the moderation workload with every new catalog row.

**Scope:** Platform Businesses, Chats, event counters, Item/Service/UniqueOffer publication, moderation queue.

## LOCKED: Ordinary customer-business chats are read-only for platform staff

**Approved signal:** User clarification on 2026-07-29.

**Protected behavior:** In the platform cabinet, `GENERAL_SUPPORT` conversations between a customer and a Business can be inspected and moderated, but platform staff cannot send Messages or close those conversations. Reply controls exist only for platform support and authorized managed-import chats.

**Scope:** AdminSupport, PlatformChatProcessor, messaging contracts.

## LOCKED: Hidden map-derived coordinates and branch hours

**Approved signal:** User clarification on 2026-07-23.

**Protected behavior:** OWNER and MANAGER may edit branch working hours. Latitude and longitude remain internal values derived from map interaction or supported map links and are never rendered as numeric inputs or values.

**Scope:** Branch forms, MapLocationPicker, mapLocationResolver, branch API payloads.

## LOCKED: Restorable search context and contextual chat drawer

**Approved signal:** User correction on 2026-07-27.

**Protected behavior:** A submitted search remains restorable across internal navigation until the customer focuses the search field to begin a new query. Chat actions from results, Item, Service, and public Business profile screens open the shared fixed right drawer without route navigation. The dedicated `Чаты` page keeps its full-page layout.

**Scope:** HomePage, ResultsPage, Navigation, ProductPage, StorefrontPage, ChatPanel, active search session storage.

## LOCKED: Bottom Business profile sidebar card

**Approved signal:** User correction and screenshot reference on 2026-07-27.

**Protected behavior:** The Business-owned profile entry is a separate identity card pinned to the bottom of the left Business cabinet sidebar. It opens the Business profile editor and is not rendered as a regular operational navigation row.

**Scope:** BusinessPage desktop and mobile sidebar rendering.
