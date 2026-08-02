# Catalog — Screens & Flow

Traces PRODUCT_VISION **UF 2.1** steps 3–4 (customer) and **UF 3.1** item 2 (seller).

## Screens
| Screen | Route | Rendering |
|--------|-------|-----------|
| Product Card — modal | over /app/catalog | client island |
| Product Card — full page | /app/product/[id] | server |
| Products tab (seller) | inside /app/business | client |
| Import wizard (seller) | inside /app/business | client |

## Customer flow (UF 2.1)
1. A result on the Catalog Page is selected → the **Product Card opens as a modal** with all product information.
2. The card offers **"Proceed to Purchase"** and a **chat button**. They are different actions —
   chat is "ask a question", Proceed is "I intend to buy" (G3, resolved 2026-08-02):
   - **Deeplinks present** → the button opens the seller's public purchase/booking destination.
   - **More than one** → a **modal to choose where to buy**. Deliberate: a brand selling in
     several places must not have that collapsed into one channel we picked for them.
   - **Deeplinks belong to the ITEM/SERVICE, never to a branch** (owner, 2026-08-02). Several
     deeplinks = several places to buy the SAME item, not one link per shop. A branch is a
     physical place; a link on a branch would be a map/location link, which is a different
     concept and not this button.
   - **None** → the in-app chat opens with an **editable draft** pre-filled ("Здравствуйте! Хочу
     приобрести товар «…»…", or the booking wording for a service). **Never auto-sent** — the
     customer edits and sends it.
   - **Never** built from `kaspiUrl`/`ozonUrl`/`wildberriesUrl`: those live on
     `BusinessVerification` as proof the business is real, and are not customer deeplinks.
   - **Blocked on backend** — `deepLink` is a single `String` on `Item`, absent from `Service`,
     and missing from the search projection, so the card cannot see it yet (ROADMAP cross-repo).
     Until it lands, the button is **omitted**, not disabled: a reachable control must DO
     something (project lock).
3. The chat modal can open straight away from the card — no intermediate page (UF 2.1 step 4).
4. A direct visit or a search-engine crawl to `/app/product/:id` renders the same card as a full server-rendered page (D10).

## Seller flow (UF 3.1 item 2)
1. **Products** tab: the list of products, with **Add** and **Import**.
2. Add: product fields + price + **branch selection** (a product can live in several branches — the vision explicitly asks for a friendlier branch picker here).
3. Import: upload .xlsx → map columns → preview (rows flagged valid/warning/invalid) → approve or cancel.

## States (P8.4/P9.3)
- Loading: card skeleton; import preview parsing
- Empty: seller with no products → an empty state that points at Add and Import, not a blank table
- Error: import row errors are shown per-row (INVALID/WARNING), never as one opaque failure
- Price: show the strike-through original only when `effectivePrice` differs from `originalPrice`

## Cross-slice
- The chat button embeds `@/chats` (same knowledge, live feature → import via its `index.ts`, D8).
- The Catalog Page that hosts the modal belongs to `@/search`.

## Route placeholder — until this slice lands (2026-08-02)

`/app/product/:id` is LIVE and reachable today, so it states plainly that the section is
not open rather than looking unfinished: the shared `EmptyState` primitive via
`app/_components/SectionNotOpen.tsx`, with copy in ru/kk/en. It used to render a
bare `<h1>` plus "Section under construction" inside a neumorphic product, which
reads as a broken build rather than as a message (AUDIT_2 N4 / AUDIT_1 B1).

This is the second of the three endings the "a reachable control must DO
something" lock allows — build it, say plainly it is not open, or stop offering
the control. Not invented UI (P9.1): it is the mandatory empty state P9.3
requires of a surface that exists with no content.

Its copy differs from the other three ON PURPOSE: this deep link is DEFERRED, not merely late (there is no public item read), so it points at the modal instead of promising the URL. The raw route id is no longer echoed — printing it told the visitor nothing and read as debug output.

Verified in a browser, light and dark, against a production build.
