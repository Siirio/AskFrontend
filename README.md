# Ask Frontend

Ask Frontend is the client-side foundation for Ask, a local search product for products and services across city businesses.

The frontend should help customers search for what they need, see matching products/services first, understand which business can help when data exists, and fall back to a supplier request only when exact data is missing or uncertain. It should not own backend business truth, provider integrations, catalog ingestion, search indexing, or availability facts.

The main user flow is search-first. If a product or service is already in Ask data, the customer finds it immediately. If Ask does not have enough data, the frontend can guide the customer into a confirmation request to suitable sellers or service providers.

## The Problem

Customers often need something now but do not know where it is actually available. They may search several marketplaces, call shops, write to messengers, compare incomplete listings, and still discover that the product is unavailable or the service has no free time.

Suppliers have the opposite problem. They want real demand, but they may not have a clean public catalog, a modern booking system, or time to maintain another heavy admin panel.

The frontend must connect those two sides without pretending that perfect backend data exists on day one.

## Frontend Product Direction

The frontend should support these product layers:

1. Mobile-first Smart Search as the main discovery path.
2. Search results for known products, services, and businesses.
3. Product/service choice when services are introduced.
4. Clear availability/confidence states based on backend data.
5. Confirmation request creation when exact data is missing or stale.
6. Supplier reply comparison after fallback requests.
7. Request-scoped and supplier-scoped chat/contact actions.
8. Clear waiting states after dispatch.
9. Seller/supplier onboarding screens when frontend owns them.
10. API adapters that keep backend DTOs separate from UI view models.

## Target Client Architecture

Android, iOS, and any future website should use the same AskBackend. The frontend side may have different UI per platform, but the part that communicates with the backend should be isolated from visual design.

The target idea is:

```text
Android UI
iOS UI
Web UI
  -> shared client/API abstraction
  -> AskBackend API
```

This keeps heavy search, request fallback, catalog, service, and availability logic out of separate UI implementations. Platform-specific screens can differ, but they should not each grow their own duplicate business layer.

## Feature-Sliced Design

Ask Frontend should use Feature-Sliced Design as the main architecture style. The goal is scalability and local reasoning: when a developer works on Smart Search, search results, request fallback, supplier inbox, response feed, service cabinet, catalog import UI, or chat, the related UI, state, API adapter, validation, tests, and helpers should stay close to that feature instead of being scattered across unrelated folders.

Expected layers:

- `app`: application bootstrap, providers, routing shell, global styles.
- `pages`: route-level screen composition.
- `widgets`: larger UI blocks composed from features and entities.
- `features`: user actions and product flows such as searching, creating a fallback request, filtering responses, sending a supplier reply, uploading a catalog file, or editing a service schedule.
- `entities`: frontend domain models such as request, supplier, response, catalog item, service, and schedule.
- `shared`: UI primitives, utilities, API transport base, config, and platform adapters.

The backend communication layer must stay design-independent. Platform UI can differ, but Android, iOS, and web should not duplicate heavy business logic.

## Website Direction

The mobile application has two sides:

- customer;
- seller/supplier.

The website is planned primarily for establishments that provide services. Managing service offerings, schedules, free windows, discounts, conditions, specialists, and branches can be too heavy inside a mobile app. A web cabinet gives service providers a more comfortable workspace for larger service data.

For product sellers, catalog data should support Excel and CSV workflows because many stores already keep product lists in those formats and should not recreate catalogs manually inside Ask.

Search-first UX requires the frontend to prioritize known products/services before request creation. Request screens remain important, but they are fallback or confirmation flows, not the only customer entry point.

## What Frontend Must Not Own

- Backend persistence, migrations, repository layers, or service layering.
- Catalog import and normalization logic.
- Search indexing or result ranking truth.
- Provider integrations such as POS, CRM, inventory, fiscal, Telegram, WhatsApp, or scheduling APIs.
- Automatic availability truth.
- Payment processing assumptions for the early MVP.
- Public trust/rating badges that turn internal moderation into customer-facing claims.

## Data Truth

The UI must not invent stock quantity, delivery SLA, courier availability, service free slots, automatic availability, or integration-backed facts.

Manual replies may show status, price, comment, branch address, contact actions, map links, and explicit supplier notes. If the backend or supplier did not provide a fact, the frontend should not imply it.

## AI Knowledge

`AI_Knowledge/` contains frontend-relevant guidance for Codex agents and developers. It is intentionally narrower than the backend foundation.

Important files:

- `AI_Knowledge/FIRST_READ_THIS.md`
- `AI_Knowledge/AGENTS.md`
- `AI_Knowledge/CODEX_PLAYBOOK.md`
- `AI_Knowledge/ARCHITECTURE_NARRATIVE.md`
- `AI_Knowledge/skills/frontend-ask.md`
- `AI_Knowledge/skills/architecture-system-analysis.md`
- `AI_Knowledge/skills/ai-workflow-consistency.md`

## Non-Goals

- Do not make the frontend a backend architecture manual.
- Do not copy backend-only skills or infrastructure setup here.
- Do not hardcode one city, one category, one supplier, one file format, or one prototype workflow.
- Do not treat browser prototype mechanics as product truth.

## Working Principle

The frontend should be useful, honest, mobile-first, and aligned with backend contracts without taking ownership of backend implementation.
