# Ask Frontend Agent Rules

These rules guide AI agents and developers working on Ask frontend.

## Core Product Rules

- Ask is a request-routing and availability platform.
- Ask is not only a Telegram or WhatsApp broadcasting tool.
- Ask is not sport-nutrition-only.
- The MVP can be manual: one customer request is routed to relevant suppliers, and suppliers respond manually.
- Long-term product UX must support catalog-backed search, integrations when backend exposes them, automatic availability when justified, and service discovery.
- Do not invent inventory, logistics, schedule, delivery, or availability facts without explicit supplier input or real integration data.

## Development Rules

- Read the nearest project rules before coding.
- Search before creating new files, endpoints, DTOs, services, configs, or docs.
- Do not run `git commit` or `git push` unless explicitly requested in the current turn.
- Do not overwrite existing frontend rules, skill docs, or workflow files without reading and preserving their logic.
- Keep changes scoped to the requested work.
- Do not copy secrets, local Codex configs, auth files, sqlite state, generated caches, plugin caches, or runtime paths into the repo.

## Frontend Direction

- Ask is mobile-first and product-first.
- Frontend may be web, native, or prototype, but it must stay aligned with shared product logic.
- API DTOs and UI view models can be different shapes, but contract drift must be explicit.
- Frontend owns normal UI localization.
- Backend returns stable machine-readable statuses and error codes.
- Frontend must not own backend persistence, migrations, service layers, provider integrations, catalog ingestion, or automatic availability truth.

## Catalog UX Rules

- Smart Search is the main customer discovery path.
- Categories scope/filter search; they must not replace Smart Search with a rigid product picker.
- Early MVP must not imply Ask already knows supplier catalogs.
- Catalog-backed suggestions must be visually honest about confidence and source.
- Manual request routing must remain usable before catalog data is mature.

## Services UX Rules

- Services are not products with a different label.
- Service UX must consider schedules, windows, duration, specialist/provider, branch, confirmation, cancellation, and availability source.
- Do not show guaranteed free slots unless backend/provider data supports them.
- If availability is uncertain, design the flow as confirmation-needed.

## Customer And Supplier UX Rules

- Supplier users need an inbox/work queue, not a single request as the whole surface.
- Customer response feeds must support many replies with compact comparison and expandable detail.
- Chat is scoped to one request and one supplier.
- WhatsApp, Telegram, map, and in-app chat actions are per supplier response.
- Do not duplicate address noise in compact and expanded states.

## AI Workflow Rules

- Use the smallest relevant tool or skill set.
- Use current docs lookup for changing frameworks, SDKs, CLIs, or cloud services.
- Use browser/mobile verification for visible UI changes.
- Use evidence-first debugging for bugs.
- Use lifecycle tooling only for meaningful work, not every prompt.

## When To Challenge

Politely flag risk before editing if a request would:

- turn Ask into only a broadcast app;
- hardcode one local market;
- make old browser staging a product requirement;
- invent unavailable data truth;
- create incompatible frontend/backend contracts;
- conflict with foundation rules without explicitly superseding them.
