# Frontend Architecture Narrative

Ask began as a practical request-routing idea, but the current product strategy is search-first. Ask is a local search platform where a customer first sees found products or services across city businesses.

The deeper product insight is that request broadcasting alone is not enough. If Ask never learns how to work with supplier data, it stays a messenger-like tool. The stronger product is a local search and availability platform: a system that presents known products, services, businesses, branches, attributes, schedules, and availability confidence, then falls back to manual requests when data is missing or uncertain.

## From Request Routing To Search-First Platform

The target flow is:

```text
Customer search -> product/service/business results -> clear source and availability confidence
  -> fallback request to suitable suppliers when exact data is missing
```

Manual request routing remains useful because it handles missing catalogs, stale availability, uncertain services, and supplier confirmation. But it is no longer the only core flow. Suppliers should not manually answer every obvious availability question forever if they already have data somewhere else.

For frontend, the next technical goal is not to own supplier data ingestion. It is to present Smart Search, search results, catalog-backed hints, supplier replies, and uncertainty states honestly while backend/data systems mature.

## Catalog Is A System, Not A Table

Many suppliers may have data in Excel, MoySklad, POS systems, e-commerce exports, CRM tools, or custom spreadsheets. Frontend should understand this only enough to avoid false UI promises.

Frontend may show catalog-backed search, category filters, import screens, mapping screens, or data-quality states only when backend/API contracts support them. It must not implement source-of-truth, normalization, duplicate detection, or availability calculation in UI state.

Catalog-backed search is a core product path. Manual request routing must still work for missing, stale, or uncertain data, but catalog-backed results should appear first when backend data exists.

## Smart Search

Smart Search is the primary customer discovery path. It should not collapse into a rigid product picker. A customer may describe a need imprecisely. The system should connect the search intent with categories, products, services, attributes, aliases, supplier catalogs, and fallback manual outreach.

When catalog confidence is low, Ask should route the request for confirmation rather than invent availability.

## Services Are A Separate Direction

Ask should support services in the future. A user may choose whether they are looking for a product or a service.

Products are physical items. Services involve time and capacity. A service model may need:

- service providers;
- branches;
- specialists or resources;
- schedules;
- free windows;
- durations;
- price rules;
- confirmation;
- cancellation;
- source of availability;
- provider integrations.

Services cannot be modeled as products with a different label. Before coding service search or booking, the team should write a system analysis covering source of truth, availability updates, integration options, MVP shortcuts, and scaling risks.

## Frontend Architecture Direction

Frontend architecture should stay focused on client experience, API contracts, view models, state transitions, and mobile usability.

Ask Frontend should use Feature-Sliced Design. This keeps feature work scalable: a feature's UI, state, API adapter, validation, tests, and local helpers stay near the product flow instead of being spread across broad global folders. Prefer feature-local composition over large catch-all folders such as one huge `components`, `services`, or `utils`.

Frontend should:

- organize code through FSD layers such as `app`, `pages`, `widgets`, `features`, `entities`, and `shared`;
- keep user actions in `features`, domain-facing frontend models in `entities`, reusable primitives in `shared`, and route composition in `pages`;
- keep the backend communication layer isolated from visual design;
- keep Android, iOS, and web clients aligned through a shared client/API abstraction where possible;
- keep API DTOs separate from UI view models;
- localize visible UI text;
- treat backend status and error codes as stable machine-readable input;
- avoid inventing backend facts;
- preserve mobile-first ergonomics;
- keep mock/prototype behavior clearly separate from production API assumptions;
- verify visible behavior with browser/mobile checks when UI changes.

## Integration Boundaries

Frontend should not call private provider APIs directly. External systems such as Telegram, WhatsApp, maps, inventory, POS, CRM, e-commerce, fiscal, and scheduling systems should appear in the UI only through safe backend contracts or public client-safe actions.

## Mobile And Frontend Direction

The future product is mobile-first. Native mobile apps may become the primary clients. Browser tools and prototypes can exist, but they should not define backend architecture.

Frontend and backend can be separate repositories owned by different developers. The shared contract is product meaning plus stable APIs, not one old prototype implementation.

Android, iOS, and any future website should use one AskBackend. They may differ in UI and platform behavior, but they should not duplicate heavy search, request fallback, catalog, service, and availability logic separately. The shared client/API layer is the boundary between platform-specific design and backend communication.

The mobile app has two sides: customer and seller/supplier. The website is planned mainly as a service-provider cabinet, because managing offerings, schedules, free windows, discounts, conditions, specialists, and branches is more comfortable on a larger workspace than inside a mobile app.

Product catalog work still matters for sellers. The frontend may expose Excel and CSV upload/import UX when backend contracts exist, because stores often already keep product data in those formats.

## Scaling Direction

Ask may start in one city and expand to more cities, Kazakhstan, CIS, or other markets. Avoid hardcoding:

- one city;
- one language;
- one category;
- one supplier type;
- one spreadsheet shape;
- one provider;
- one frontend;
- one deployment vendor.

The architecture should be practical, not enterprise theater. But it must avoid decisions that make growth impossible.

## Data Truth

Ask must not invent facts.

Search results can show known products, services, businesses, prices, branches, and availability confidence only when the backend has a trustworthy source. Manual replies can contain status, price, comment, branch address, contact actions, and explicit supplier notes. Exact stock quantity, delivery SLA, courier availability, automatic availability, service slots, and booking promises require supplier input or real integration data.

If the source is weak, Ask should say confirmation is needed.
