# AskFrontend Agent Rules

## Requirements Authority

- The user's current instructions together with applicable `AI_Knowledge` documentation are the source of truth for product behavior and implementation decisions.
- Existing code is not evidence of approved behavior unless the relevant behavior is explicitly `LOCKED` as working or is documented as approved.
- Before diagnosing, reviewing, implementing, extending, preserving, or deleting behavior, compare the user's instruction with the applicable `AI_Knowledge` feature documentation and locks.
- If the user's instruction conflicts with documentation or a lock, if documentation conflicts internally, or if material behavior, data, authorization, or acceptance criteria are under-specified, stop and ask the user. Do not resolve the conflict by treating existing code or an assumption as authoritative.
- Use backend entity terminology unchanged in frontend state, API clients, URL/query values, and documentation because parallel UI synonyms create contract drift; `BusinessScope` is always `ITEM`, `SERVICE`, or `BOTH`.

These are the nearest project instructions for AskFrontend.

## First Session

Read:
1. `AI_Knowledge/first_steps/FIRST_READ_THIS_FRONTEND.md`
2. `AI_Knowledge/product_ux/EXPECTED_UX_UI_FLOW_FRONTEND.md`
3. `AI_Knowledge/product_ux/ARCHITECTURE_NARRATIVE_FRONTEND.md`
4. `AI_Knowledge/product_ux/DESIGN_AND_VISUALS_FRONTEND.md`

## Product Guardrails

- AskFrontend is the web/PWA client for the Ask platform. Mobile-first, search-first.
- Search is the primary entry point, not a category catalog.
- Raw query is preserved everywhere.
- No invented facts: don't show "in stock" unless backend confirms it.
- No public ratings on MVP.
- Scope (Товары/Услуги) is locked per search session.
- All application and customer-discovery routes require a restored authenticated session; anonymous users are redirected to `/auth` with their intended internal return URL because search must never bypass login or registration.
- Item and Service create forms never expose active-state controls and always create records with `isActive: true`; active state may be changed only after creation because drafts are not part of this flow.
- The city control is a location selector and never routes to the user account; public Business profiles are separate from owner User profiles and search-result rows open the Business profile by `businessId`.
- Account settings never render legal documents or agreements for customer or Business contexts because legal acceptance belongs to registration and dedicated legal routes, not account management.
- Business overview conversations open in the shared fixed right-side chat drawer instead of rendering an inline thread inside dashboard layout containers.
- Never show internal implementation, backend/frontend architecture, stack, PWA, token, renderer, builder, plugin, or design-system explanations in the product UI; these belong only in docs and code, not visible screens.

## Anti-Marketplace Guardrails (2026-07-01)

Ask is NOT a marketplace. The frontend must never:
- **Sort results by price by default.** Default sort is `relevance`. Price sort is user-selectable, not default.
- **Show uniform commodity cards.** Every result card has a standardized decision layer AND brand expression (color, logo, cover).
- **Show "cheaper alternative" or buy-box logic.** Never compare brands as interchangeable SKUs.
- **Collapse brands into a single comparison table.** Each result retains its business identity and presentation.
- **Show raw AI confidence scores or match reasons.** Search may carry match-reason metadata, but the customer UI does not render it.

### Match reason block
Backend-provided match reasons are metadata only and are not rendered. Restoring them requires a new explicit owner decision.

### Brand-aware card structure
- Standardized layer: price, availability, branch, pickup, quick actions.
- Brand layer: brand color accent, logo, cover thumbnail, brand name + short descriptor.

### Public business profile
The customer-facing business route renders the current public `business-profile` response. The removed storefront-builder API is not a frontend contract.
- Materials / production / story
- Lookbook photos
- Branches / pickup points
- Telegram / Instagram / site links
- Quick chat button
- Current promos / new arrivals

## Visual Style

- The approved UI is the warm ivory/orange wanted-reference system in light mode, with the same structure and hierarchy adapted to graphite/charcoal in dark mode.
- Light mode is the default. Dark mode is user-selectable and must not change layout, information hierarchy, or component behavior.
- Controlled orange accent (#ff6a1a), warm neutral surfaces, dark readable text, Inter font.
- Never use the old teal (#0d9b7c) direction.
- See `AI_Knowledge/product_ux/FRONTEND_REDESIGN_REFERENCE_STACK.md` for full visual and motion guardrails.
- Use semantic design tokens from `src/design-system/tokens.css`; do not hardcode a theme-specific canvas into components.

## Tech Stack

- React + TypeScript + Vite
- lucide-react for icons (functional UI only, not large brand assets)
- API_BASE_URL: http://localhost:9090
- Backend sends snake_case; frontend converts via transformKeys() in httpClient.ts

## Generative UI Renderer

- Frontend is a **safe schema renderer**, not a free-form HTML host.
- Backend/AI returns UI recipe JSON with `component` + `props`; frontend renders only whitelisted components.
- Whitelist: `ProductCard`, `ServiceCard`, `DropCard`, `BusinessCandidateCard`, `StorefrontHero`, `ContactActions`, `DistanceBadge`, `MatchReasons`.
- Never render arbitrary HTML, raw React, or unvalidated markdown from backend/AI.

## Contact Actions

- UI shows: Telegram, Instagram, WhatsApp, 2GIS, Site, Ask Chat as action buttons.
- Click goes through `contactActionId` — backend resolves the actual contact/redirect securely.
- Never show raw phone/username in UI unless backend explicitly returns it as public display value.
- Contact hash is internal dedup infrastructure, never shown to users.

## Storefront Builder

- Brand storefront = constrained Canva-like builder (Puck or custom), NOT free-form Webflow.
- Blocks: Hero, Products, Drops, About, Lookbook, Branches, Contacts, FAQ, Promo, "Why this matches".
- Frontend renders published storefront pages from backend block config.
