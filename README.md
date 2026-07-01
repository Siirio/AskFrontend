# Ask Frontend

Ask Frontend is the client-side product knowledge foundation for Ask, a local search product for products and services across city businesses.

The frontend should help customers search for what they need, see matching products/services first, understand which business can help when data exists, and fall back to a supplier request only when exact data is missing or uncertain. It should not own backend business truth, provider integrations, catalog ingestion, search indexing, or availability facts.

## Product Direction

The frontend should support these product layers:

1. Mobile-first Smart Search as the main discovery path.
2. Search results for known products and services, with businesses shown as providers/context for those results.
3. Product/service choice when services are introduced.
4. Clear availability and confidence states based on backend data.
5. Confirmation request creation when exact data is missing or stale.
6. Supplier reply comparison after fallback requests.
7. Request-scoped and supplier-scoped chat/contact actions.
8. Clear waiting states after dispatch.
9. Seller/supplier onboarding screens when frontend owns them.
10. API adapters that keep backend DTOs separate from UI view models.

## Target Client Architecture

Android, iOS, and any future website should use the same AskBackend. Platform UI may differ, but the backend communication layer should stay isolated from visual design.

```text
Android UI
iOS UI
Web UI
  -> shared client/API abstraction
  -> AskBackend API
```

## What This Repository Is

This repository currently preserves frontend-facing AI knowledge and product UX direction. It is not yet a deep frontend code-rule manual and should not pretend to define detailed implementation rules before the real app stack exists.

Important files:

- `AGENTS.md`: short agent workflow, first-session pointer, task routing, and product UX guardrails.
- `AI_Knowledge/first_steps/FIRST_READ_THIS.md`: start here when a new person or Codex agent opens the repo.
- `AI_Knowledge/first_steps/IMPLEMENTATION_PIPELINE.md`: how to keep extending this knowledge safely.
- `AI_Knowledge/product_ux/UX_UI_FULL_FLOW.md`: full UX/UI source of truth.
- `AI_Knowledge/product_ux/ARCHITECTURE_NARRATIVE.md`: frontend product and architecture direction.
- `AI_Knowledge/client_contracts/FRONTEND_BACKEND_CONTRACT.md`: frontend-facing backend contract expectations.
- `codex/CODEX_INFRASTRUCTURE.md`: expected Codex plugins, MCP servers, and routing behavior without local config.
- `AI_Knowledge/CHANGELOG_FOUNDATION.md`: what changed in this knowledge foundation.

## Frontend Boundaries

Frontend owns:

- UI composition;
- mobile ergonomics;
- local view models;
- visible localization;
- client-side state transitions;
- API adapter shape;
- visual treatment of confidence, waiting, responses, and contact actions.

Frontend must not own:

- backend persistence, migrations, repositories, or service layering;
- catalog import and normalization logic;
- search indexing or ranking truth;
- provider integrations such as POS, CRM, inventory, fiscal, Telegram, WhatsApp, or scheduling APIs;
- automatic availability truth;
- payment processing assumptions for the early MVP;
- public trust/rating badges that turn internal moderation into customer-facing claims.

## Data Truth

The UI must not invent stock quantity, delivery SLA, courier availability, service free slots, automatic availability, or integration-backed facts.

Manual replies may show status, price, comment, branch address, contact actions, map links, and explicit supplier notes. If the backend or supplier did not provide a fact, the frontend should not imply it.

## Working Principle

The frontend should be useful, honest, mobile-first, and aligned with backend contracts without taking ownership of backend implementation.
