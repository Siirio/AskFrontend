# Codex Playbook

This is the task router for AI agents working on Ask Frontend. It keeps frontend agents focused on UX, client state, API contracts, and product truth.

## First Rule

Read `README.md`, `AI_Knowledge/AGENTS.md`, and the relevant section of this playbook before coding. If the task touches catalog UX, services UX, integrations shown in UI, or API contracts, also read `ARCHITECTURE_NARRATIVE.md`.

## Frontend And Mobile Work

Use this route for UI, client contracts, mobile UX, frontend prototypes, search flows, request fallback, supplier flows, or frontend/backend API alignment.

Expected direction:

- Ask is mobile-first and product-first.
- Customer discovery is search-first; request creation is fallback when backend data is insufficient.
- Use Feature-Sliced Design for frontend structure.
- Keep each product feature's UI, model, API adapter, validation, tests, and helpers close to the feature.
- Native mobile clients may become primary; browser prototypes are tools, not product architecture.
- Android, iOS, and web clients should share a backend communication layer where possible.
- Keep API DTOs separate from UI view models.
- Do not invent backend data in the UI.
- Frontend owns normal UI localization; backend returns stable machine-readable statuses and error codes.
- Preserve shared product meaning across frontend and backend.

Before editing, search for existing local patterns and map dependent components, routes, state, API adapters, tests, styles, and copy. Place new code in the closest FSD layer instead of defaulting to broad global folders.

Keep the client/API layer independent from visual design. Platform-specific UI may differ, but duplicated heavy business logic across Android, iOS, and web is a design smell.

## Customer Search UX

- Smart Search is the main discovery path.
- Category is a scope/filter, not a replacement product picker.
- Show known products/services/businesses before request creation when backend data exists.
- Preserve the user's typed search intent when moving from search to fallback request.
- Loading during fallback request sending ends when dispatch is confirmed.
- After fallback dispatch, show a calm waiting state for replies.

## Supplier UX

- Supplier starts from inbox/work queue.
- Request detail is entered after choosing a request.
- Supplier response may allow first answer plus one retry/update if backend/product contract supports it.
- Chat opens as a request/supplier scoped sub-view.

## Catalog UX

Use this route for catalog-backed UI, product suggestions, category filters, attributes shown in UI, and search result confidence.

Frontend should not implement catalog import, normalization, duplicate handling, or source-of-truth logic. It may expose upload/import UX only when backend/API contracts exist.

Catalog-backed search is a core product path. Manual request routing remains the fallback for missing, stale, or uncertain data.

Product catalog UI should account for Excel and CSV import flows because many sellers already keep catalog data in those formats.

## Services UX

Use this route for service discovery UI, schedules shown in UI, appointment requests, free-window display, specialists, branches, bookings, or provider availability.

Services are not products with a different label. Before coding, analyze:

- what the user is trying to book or request;
- whether backend can provide schedule/free-window truth;
- duration, price, provider, branch, and specialist display;
- confirmation and cancellation flow;
- what can be trusted as current availability;
- what must not be hardcoded for one city or provider type.

If availability is not backed by a reliable source, model it as confirmation-needed instead of a guaranteed slot.

Service-provider administration is expected to fit a web cabinet better than a mobile-only flow when it involves offerings, schedules, free windows, discounts, conditions, specialists, and branches.

## Integration Display

Use this route when the UI displays external contacts, map actions, imported catalog signals, provider status, or integration-backed availability.

Rules:

- Do not call provider APIs directly from frontend unless there is an explicit frontend-safe public integration.
- Do not expose credentials or provider internals.
- Do not present external facts as true unless the provider response or explicit supplier input supports them.

## System Analysis Gate

Before code, produce a short analysis when the task affects:

- catalog;
- search results;
- services;
- schedules;
- integrations;
- city/country scaling;
- auth or roles visible in UI;
- API contract shape;
- client state ownership;
- frontend/backend responsibility split.

Use this shape:

```text
Problem:
Actors:
Current evidence:
Proposed model:
MVP shortcut:
Deferred decisions:
Risks:
Verification:
```

## AI Workflow

AI agents should keep the team aligned without becoming a style dictator.

Check whether the task:

- conflicts with Ask vision;
- confuses old prototype behavior with product architecture;
- invents availability, logistics, schedule, or inventory facts;
- hardcodes one city, category, supplier, file, frontend, or provider;
- creates frontend/backend contract drift;
- needs documentation updates.

If there is a conflict, state it concretely, explain the risk, and offer a compatible path.

## MCP And Tool Usage

Use tools selectively:

- local shell/git for simple local state;
- current documentation lookup for changing libraries, SDKs, CLIs, and cloud services;
- browser or Playwright for visible frontend behavior;
- lifecycle tools only for meaningful starts, pivots, and completions;
- provider-specific tools only when authenticated, frontend-safe, and in scope.

Do not copy local MCP configs, tokens, auth files, sqlite state, generated caches, or runtime paths into the repo.
