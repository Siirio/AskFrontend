# Ask Frontend

Ask Frontend is the client-side foundation for Ask, a request-routing, availability, catalog, and service discovery product.

The frontend should help customers describe what they need, route that intent through the backend, and compare supplier replies clearly. It should not own backend business truth, provider integrations, catalog ingestion, or availability facts.

The first useful version is simple: a customer describes a product or service need, Ask routes it to relevant suppliers, and suppliers answer manually with availability, price, address, contact options, or clarification. The frontend presents that flow with mobile-first UX and stable API contracts.

## The Problem

Customers often need something now but do not know where it is actually available. They may search several marketplaces, call shops, write to messengers, compare incomplete listings, and still discover that the product is unavailable or the service has no free time.

Suppliers have the opposite problem. They want real demand, but they may not have a clean public catalog, a modern booking system, or time to maintain another heavy admin panel.

The frontend must connect those two sides without pretending that perfect backend data exists on day one.

## Frontend Product Direction

The frontend should support these product layers:

1. Mobile-first customer request creation.
2. Smart Search as the main discovery path.
3. Product/service choice when services are introduced.
4. Supplier reply comparison.
5. Request-scoped and supplier-scoped chat/contact actions.
6. Clear waiting states after dispatch.
7. Seller/supplier onboarding screens when frontend owns them.
8. API adapters that keep backend DTOs separate from UI view models.

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

This keeps heavy request, catalog, service, and availability logic out of separate UI implementations. Platform-specific screens can differ, but they should not each grow their own duplicate business layer.

## Website Direction

The mobile application has two sides:

- customer;
- seller/supplier.

The website is planned primarily for establishments that provide services. Managing service offerings, schedules, free windows, discounts, conditions, specialists, and branches can be too heavy inside a mobile app. A web cabinet gives service providers a more comfortable workspace for larger service data.

For product sellers, catalog data should support Excel and CSV workflows because many stores already keep product lists in those formats and should not recreate catalogs manually inside Ask.

## What Frontend Must Not Own

- Backend persistence, migrations, repository layers, or service layering.
- Catalog import and normalization logic.
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
