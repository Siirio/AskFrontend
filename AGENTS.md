# AskFrontend Agent Rules

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
- Never show internal implementation, backend/frontend architecture, stack, PWA, token, renderer, builder, plugin, or design-system explanations in the product UI; these belong only in docs and code, not visible screens.

## Anti-Marketplace Guardrails (2026-07-01)

Ask is NOT a marketplace. The frontend must never:
- **Sort results by price by default.** Default sort is intent_match (relevance). Price sort is user-selectable, not default.
- **Show uniform commodity cards.** Every result card has a standardized decision layer AND brand expression (color, logo, cover).
- **Show "cheaper alternative" or buy-box logic.** Never compare brands as interchangeable SKUs.
- **Collapse brands into a single comparison table.** Each brand result explains WHY it matches this specific intent.
- **Show raw AI confidence scores.** Backend sends human-readable match reasons; frontend displays them as-is.
- **Make brand storefronts look like marketplace pages.** Brand storefronts are LEGO-like block constructors, not uniform product grids.

### Match reason block (mandatory on every result card)
Every card shows: "Подходит, потому что: oversized fit, в бюджете, самовывоз сегодня, локальный бренд."

### Brand-aware card structure
- Standardized layer: price, availability, branch, pickup, match_reason, quick actions.
- Brand layer: brand color accent, logo, cover thumbnail, brand name + short descriptor.

### Brand storefront (page opened from any brand card)
- Hero block (cover + tagline)
- Collections / drops
- Popular products
- "Why us" block
- Materials / production / story
- Lookbook photos
- Branches / pickup points
- Telegram / Instagram / site links
- Quick chat button
- Current promos / new arrivals

## Visual Style

- Dark graphite/charcoal base, warm ivory text (#f4eee6), controlled orange accent (#ff5a1f), Inter font.
- Never old warm ivory/brown/Trebuchet style. Never old light/teal (#0d9b7c) direction.
- See `AI_Knowledge/product_ux/FRONTEND_REDESIGN_REFERENCE_STACK.md` for full visual and motion guardrails.
- Design tokens: `--bg: #070807`, `--panel: rgba(22,22,21,0.86)`, `--text: #f4eee6`, `--orange: #ff5a1f`.

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
