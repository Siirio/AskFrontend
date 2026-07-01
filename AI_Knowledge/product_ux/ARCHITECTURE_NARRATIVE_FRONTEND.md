# Frontend Architecture Narrative

Ask began as a practical request-routing idea, but the current product strategy is search-first. Ask is a local search platform where a customer first sees found products or services across city businesses.

The deeper product insight is that request broadcasting alone is not enough. If Ask never learns how to work with supplier data, it stays a messenger-like tool. The stronger product is a local search and availability platform: a system that presents known products, services, provider businesses, branches, attributes, schedules, and availability confidence, then falls back to manual requests when data is missing or uncertain.

## From Request Routing To Search-First Platform

The target flow is:

```text
Customer submits one scoped raw query
  -> Ask opens one locked search session
  -> Found tab shows catalog/search results
  -> Supplier Check tab automatically checks suitable businesses
  -> Chats tab appears only after real conversation starts
```

Manual request routing should not feel like a separate customer action after search. For MVP, the main fallback path is automatic supplier check: when Ask has suitable supplier candidates, it sends the preserved raw query to them as a business-facing request/activity. The customer sees this as `Подходящие магазины`, not as an outgoing chat message.

For frontend, the next technical goal is not to own supplier data ingestion. It is to present Smart Search, search results, catalog-backed hints, supplier replies, and uncertainty states honestly while backend/data systems mature.

## Catalog Is A System, Not A Table

Many suppliers may have data in Excel, MoySklad, POS systems, e-commerce exports, CRM tools, or custom spreadsheets. Frontend should understand this only enough to avoid false UI promises.

Frontend may show catalog-backed search, category filters, import screens, mapping screens, or data-quality states only when backend/API contracts support them. It must not implement source-of-truth, normalization, duplicate detection, or availability calculation in UI state.

Catalog-backed search is a core product path. Manual request routing must still work for missing, stale, or uncertain data, but catalog-backed results should appear first when backend data exists.

## Smart Search

Smart Search is the primary customer discovery path. It should not collapse into a rigid product picker. A customer may describe a need imprecisely. The system should connect the search intent with categories, products, services, attributes, aliases, supplier catalogs, and fallback manual outreach.

When catalog confidence is low, Ask should route the request for confirmation rather than invent availability.

## Services Are A Separate Direction

Services are a core product direction alongside products. A user chooses whether they are looking for a product or a service. The service model is fundmentally different from products — services involve time and capacity.

### Core Philosophy: Chat-First, Button-for-Fixation

Ask Services is **not a booking calendar** — it is **chat + structured fixation of a final agreement**. The primary communication channel is the regular Ask chat. Buttons/actions record the result of an agreement already reached in chat.

### Three-Tier Service Maturity Model

#### Level 1: MVP Request-to-Book (current)

- Customer sends a request with desired time (`requestedStartAt`).
- Time is **desired** — not a guaranteed slot.
- Business confirms, declines, or continues discussion in chat.
- No automatic guarantee of a free slot.

#### Level 2: Minimal Confirmed Appointment Tracking (current)

- After chat, business fixes the final **confirmedStartAt / confirmedEndAt**.
- This creates a confirmed appointment record in the `booking` table.
- The confirmed interval blocks future suggested time options for this service/branch (minimal overlap check).
- This is NOT full CRM — no resources, masters, shifts, automatic slot availability.

#### Level 3: Future Calendar System (NOT in current scope)

- Masters, resources, employee schedules, overlaps, integrations, automatic slot availability.
- **Nothing from this level is implemented now.**

### Three-Level Time Model

Service requests track three distinct time levels:

- `requestedStartAt` — time the customer specified when creating the request (desired time). Never changed by backend.
- `proposedStartAt` — time the business counter-offered via `SUGGEST_OTHER_TIME`. Can be updated on repeated proposals.
- `confirmedStartAt` / `confirmedEndAt` — finally agreed time, fixed by the business via `CAN_PROVIDE`. Only this time creates a confirmed appointment.

### ActivityDisplayStatus

`ActivityDisplayStatus` is the **only** status visible in the Activity UI. It is **never stored** in the database — computed at runtime:

| Status | Condition | Meaning |
|---|---|---|
| `DISCUSSING` | Default | In discussion. Actions: respond, confirm, decline, suggest other time. |
| `CONFIRMED` | `CAN_PROVIDE` + `confirmedStartAt != null` | Time agreed. `booking` record created. |
| `CONFIRMATION_DECLINED` | `CANNOT_PROVIDE` | Business declined. |

### Future Directions

A full service model may need:

- service providers and branches;
- specialists or resources;
- schedules and free windows;
- durations and price rules;
- confirmation, cancellation, and rescheduling;
- source of availability and provider integrations;
- automatic slot availability.

Services cannot be modeled as products with a different label.

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

## Anti-Marketplace Architecture (2026-07-01)

Ask is NOT a marketplace. It is an intent layer that routes qualified demand to brands without taking away their identity.

### Core Positioning

- Marketplace sells products on a shelf.
- Instagram/Telegram sell atmosphere and trust.
- **Ask sells the match between customer intent and the right brand.**

### What Ask Standardizes vs. Preserves

| Standardize (decision layer) | Preserve (brand identity) |
|---|---|
| Availability, price, branch, pickup | Visual style, photos, tone of voice |
| Confirmation status, data freshness | Brand story, collections, drops |
| Relevance to query, intent match | "Why us" narrative |
| Quick actions: clarify, chat, open | Official channels: Instagram, Telegram, site |
| Supplier response quality tracking | Brand world, community, culture |

### Brand-Aware Storefronts

Each brand gets a LEGO-like page constructor inside Ask:
- **Brand Kit:** color, logo, cover, tone of voice, 3-5 photos, description, links.
- **Page Blocks:** hero, collections, products, about, drops, contacts, branches.
- Standardized data for search; flexible brand expression for storefront.

### Ranking Philosophy

No absolute "best brand" rating. Only "best match for THIS intent."
- Default sort: intent_match (query relevance + style + availability + distance + data confidence).
- Price is a filter factor, not the default sort king.
- Visible badges: data freshness, confirmation speed, card quality, business activity.

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

Search results can show known products, services, provider businesses, prices, branches, and availability confidence only when the backend has a trustworthy source. Manual replies can contain status, price, comment, branch address, contact actions, and explicit supplier notes. Exact stock quantity, delivery SLA, courier availability, automatic availability, service slots, and booking promises require supplier input or real integration data.

If the source is weak, Ask should say confirmation is needed.
