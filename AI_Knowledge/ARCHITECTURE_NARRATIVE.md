# Frontend Architecture Narrative

Ask began as a practical request-routing idea: a customer asks for a product, Ask sends the request to relevant stores, and stores reply manually. That remains a valid MVP because it proves whether customers and suppliers get value before expensive integrations exist.

The deeper product insight is that request broadcasting alone is not enough. If Ask never learns how to work with supplier data, it stays a messenger-like tool. The stronger product is an availability platform: a system that can route manually at first, then gradually understand catalogs, branches, attributes, availability, services, schedules, and integrations.

## From Manual Routing To Availability Platform

The early flow is:

```text
Customer request -> relevant suppliers -> manual supplier replies -> customer compares replies
```

That flow is useful because it reduces customer effort and gives suppliers demand. But it does not scale by itself. Suppliers should not manually answer every obvious availability question forever if they already have data somewhere else.

For frontend, the next technical goal is not to own supplier data ingestion. It is to present Smart Search, supplier replies, catalog-backed hints, and uncertainty states honestly while backend/data systems mature.

## Catalog Is A System, Not A Table

Many suppliers may have data in Excel, MoySklad, POS systems, e-commerce exports, CRM tools, or custom spreadsheets. Frontend should understand this only enough to avoid false UI promises.

Frontend may show catalog-backed search, category filters, import screens, mapping screens, or data-quality states only when backend/API contracts support them. It must not implement source-of-truth, normalization, duplicate detection, or availability calculation in UI state.

Manual request routing must still work before catalog is mature. Catalog should improve routing and availability confidence over time, not block supplier onboarding.

## Smart Search

Smart Search is the primary customer discovery path. It should not collapse into a rigid product picker. A customer may describe a need imprecisely. The system should gradually learn to connect the request with categories, products, attributes, aliases, supplier catalogs, and fallback manual outreach.

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

Frontend should:

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

Manual replies can contain status, price, comment, branch address, contact actions, and explicit supplier notes. Exact stock quantity, delivery SLA, courier availability, automatic availability, service slots, and booking promises require supplier input or real integration data.

If the source is weak, Ask should say confirmation is needed.
