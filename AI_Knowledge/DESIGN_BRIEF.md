# ASK — Design Brief

Status: **input document** (2026-07-14). The brief handed to a designer — human, or Claude Design. It is not an authority; it is the *question*. The ANSWER (token values, component specs, screens) becomes `design-system/` and the visual source of truth (D3), recorded as a decision-log row when it lands.

Read with `PRODUCT_VISION.md` (what the product is) and `features/{slice}/ux-ui-flow.md` (the screens, per slice).

**§9 holds the ready-to-paste prompts for claude.ai/design.**

---

## 1. What you are designing

**ASK** is local product and service search across the businesses of a city. A customer describes what they need in plain language — any language, slang, typos — and ASK returns real catalog results from real businesses, ranked by how well they match the *intent*, not by who is cheapest.

It is an **intent layer**, not a marketplace. It routes qualified demand to brands **without commoditizing them**.

Mission: **save the customer time when choosing the best product.**
The problem: too many marketplaces, endless comparison, no clear way to know how to choose.

Market: Kazakhstan (Astana first). Currency ₸. Languages ru / kk / en.

## 2. Who uses it

- **Customers (buyers)** — search, compare, open a product, chat with the business, send a request when nothing fits.
- **Business owners & staff (sellers)** — manage products, services, branches, offers; answer incoming requests and chats.

## 3. The one thing that must come through

> **We are not a marketplace. Do not design one.**

Every visual instinct trained on Wildberries, Ozon, Amazon or Yandex Market is wrong here. The design MUST NOT contain:

| Never | Why |
|---|---|
| A price-first grid where the cheapest wins | Price ascending commoditizes brands. Default sort is *intent match*. |
| A buy-box — one product, many sellers, collapsed into one row | Each brand owns its own presentation. SKU comparison is marketplace behavior. |
| Star ratings, review scores, 5-point scales | There are no public ratings in this product. None. |
| A visible match score or percentage on a card | The internal score is never shown to a customer. |
| A cart, basket or checkout | ASK does not transact. |

**Instead:** every result card has two layers.

- **Brand layer** — business name, logo, brand color, cover, badges. This is the brand's stage.
- **Decision layer** — price, why it matched, availability, distance, the actions available.

### The consequence for your palette

If ASK's own brand color is loud, it fights the twenty brand logos and brand colors on screen at once. **ASK's chrome must be quiet** — a neutral, confident canvas that lets *other people's brands* sing. Save saturation for a single accent (the search action) and let everything else recede.

### The accent is ORANGE (decided, 2026-07-14)

One accent, and it is orange. That fits the rule above — everything else recedes. But orange drags in three traps, and they must be solved deliberately:

1. **The discount collision.** Orange/red *is* the sale colour in every marketplace on earth. ASK has Unique Offers rendering as `−30%` / `−5000 ₸` labels. If orange is both the primary action *and* the discount signal, they fight — and the product starts looking like the thing it refuses to be. The offer label and the search button must not compete.
2. **Contrast.** Orange is the hardest accent to make WCAG AA compliant. Most attractive oranges fail with white text. The chosen shade must pass on light *and* dark surfaces, with a stated foreground colour.
3. **Amazon.** Amazon's accent is orange. We are explicitly not a marketplace. A saturated consumer orange puts us in exactly the wrong company.

The neutral should run **warm** — a cold blue-grey fights orange. And remember the feel: *fast, certain, calm, precise*. That means a **controlled** orange, not a shouty one.

### Badges are information, not judgment

The visible trust signals are **data freshness · confirmation speed · card quality · business activity**. These are facts about a listing, not opinions about a business. Design them to read as *metadata* — never a score, never a green/amber/red traffic light, never anything mistakable for a rating.

### "Save time" is the design goal, literally

A customer must scan a result card and decide **in under two seconds**. Scannability beats decoration. If an element does not help someone decide faster, it is costing them the very thing we promise.

## 4. Surfaces to design

Traced to the user flows in `PRODUCT_VISION.md`. Priority order.

| # | Surface | Route | Notes |
|---|---------|-------|-------|
| 1 | **Home** — nav, headline, search form | `/app` | The front door. The search form IS the product. |
| 2 | **Catalog Page** — results, sorting, filters | `/app/catalog` | Sort: relevance (default) · distance · cost · unique offers. Filters: price · companies · location (100 km / city / map area). |
| 3 | **Product Card** — modal AND full page | `/app/product/:id` | Same component, two presentations. All info + "Proceed to Purchase" + chat button. |
| 4 | **Result card** (inside #2) | — | The hardest, most important object in the product. Two layers (§3). Scannable in <2s. |
| 5 | **Auth** — sign up / log in | `/app/auth` | Email + a 6-digit code. No password on the customer path. |
| 6 | **Role-choosing modal** | over `/app` | Right after first entry: buyer or seller. |
| 7 | **Chats** — list, thread, and a modal over the card | `/app/chats` | Text only. No attachments, no read receipts, no typing indicators. Unread counts exist. |
| 8 | **Profile card** in the nav | any `/app/*` | Logo · name · settings · learn more · sign out. |
| 9 | **Business Cabinet** | `/app/business` | Requests · Products (+import) · Services · Branches · Unique Offers · Company Profile *(placeholder)* · Company Dashboard. |
| 10 | **Landing** | `/` | Marketing. Static, SEO-first. The problem, the promise, RASE. |

### States — non-negotiable, design them all

Loading · **empty** · error · validation. The empty catalog is the most important state in the product: when search finds nothing it must offer a **fallback request** to businesses. An empty result page is never a dead end.

## 5. Technical constraints (it must be buildable as-is)

| Constraint | What it means for you |
|---|---|
| **Tailwind v4 tokens** | Every color, size, space and radius must be expressible as a token. If a value can't be a token it can't exist — components are forbidden raw hex/px (P9.2). |
| **Light AND dark** | Both first-class. Design both; don't derive dark by inverting. |
| **Cyrillic** | The typeface MUST support Russian *and* Kazakh (ә ғ қ ң ө ұ ү һ і). Russian runs ~30% longer than English — layouts can't be tight to the text. |
| **lucide-react only** | No custom icon set, no one-off SVG glyphs. |
| **Server-rendered** | Home, catalog, product card and landing render server-side for SEO. Nothing critical above the fold may depend on client JS. |
| **framer-motion** | Motion is wanted — but must degrade to nothing under `prefers-reduced-motion`. Durations/easings as tokens. |
| **Responsive** | Desktop and mobile web both matter now. Mobile-first for the customer flow. |

## 6. Deliverables

**D1 — The token set** (the critical one). A Tailwind v4 `@theme` block with real values, light + dark: colors (surface, foreground, muted, border, accent, destructive, success, warning), font family + type scale, spacing, radii, shadows, and motion (`--ease-*`, `--duration-*`) for `shared/motion.ts`. Plus a one-paragraph rationale: *why this palette stays quiet enough for brand colors to dominate the cards.*

**D2 — `shared/ui` primitive specs.** Button (variants), Input, Select, Card, Modal, Toast, **Badge**, Loading/skeleton, EmptyState. For each: anatomy, sizes, states (default / hover / focus / active / disabled / error), and the tokens it consumes.

**D3 — Screens.** Surfaces 1–4 at minimum, light + dark, desktop + mobile. Then 5–10.

**D4 — Motion spec.** Named variants (page enter, modal in/out, card hover, skeleton pulse) with durations and easings as tokens, and the reduced-motion fallback for each.

## 7. Definition of done

- Every value in the mockups traces to a token in D1. No orphan hex, no orphan px.
- The result card is legible and decidable in under two seconds.
- Nothing from §3's "Never" table appears anywhere.
- Every screen survives ru, kk and en without the layout breaking.
- Light and dark are both designed, not derived.

## 8. When it lands

The token values go into `design-system/`, the single visual source (D3). The architecture decision log gains a row promoting the design to **visual authority** — alongside `PRODUCT_VISION.md` (product) and the AskBackend API (data). Until then `design-system/` is empty and no component may be styled.

---

# 9. Prompts for Claude Design (claude.ai/design)

**Run in order.** Prompt 1 builds the design system; every later prompt attaches it, so all screens inherit the same tokens.

**Workflow**
1. **Prompt 1** → creates the ASK **design system**.
2. **Prompts 2–8** → set **Design system: ASK**, **Template: Prototype**, paste. (Use **Wireframe** first if you want structure before polish.)
3. Bring the tokens back into `design-system/` and record the decision-log row (§8).

Each prompt is self-contained — Claude Design cannot see this repo.

---

## Prompt 1 — The design system *(run first)*

```
Create a design system for ASK — a local product and service search platform for
Kazakhstan (Astana). Languages: Russian, Kazakh, English. Currency: ₸ (tenge).

WHAT ASK IS
A customer describes what they need in plain language — any language, slang,
typos, a whole sentence — and ASK returns real catalog results from real city
businesses, ranked by how well they match the customer's INTENT. The mission is
to save the customer time when choosing the best product.

WHAT ASK IS NOT — this must drive every visual decision
ASK is an intent layer, not a marketplace. It routes demand to brands WITHOUT
commoditizing them. Do not design a marketplace. This product has:
- NO star ratings, review scores, or 5-point scales. None, anywhere.
- NO buy-box (one product, many sellers, collapsed into a comparison row)
- NO price-first grid where the cheapest wins — the default sort is intent match
- NO cart, basket, or checkout — ASK does not transact
- NO visible match score or percentage on a card

THE CRITICAL CONSTRAINT ON THE PALETTE
Search results are cards where each business's OWN brand — logo, brand color,
cover image — is displayed prominently. Twenty different brand colors on screen
at once. If ASK's own chrome is loud, it fights them. So ASK's UI must be QUIET:
a neutral, confident canvas that lets other people's brands sing. Reserve
saturation for exactly one accent — the search action. Everything else recedes.

THE ACCENT IS ORANGE. This is decided — do not propose a different hue.
One accent, and it is orange. Everything else recedes. But orange brings three
traps, and I want each one solved deliberately, not ignored:

1. THE DISCOUNT COLLISION. Orange/red is the sale colour in every marketplace on
   earth. ASK shows "Unique Offers" as labels like "−30%" and "−5000 ₸". If
   orange is BOTH the primary action AND the discount signal, they fight — and
   the product starts looking like the exact thing it refuses to be. Solve this:
   how does an offer label read as a brand signal without competing with the
   search button? Show me both on the same card.
2. CONTRAST. Orange is the hardest accent to make WCAG AA compliant — most
   attractive oranges fail with white text. Give me a shade that passes on BOTH
   light and dark surfaces, and state the foreground colour that goes on it.
3. AMAZON. Amazon's accent is orange. We are explicitly not a marketplace. Do
   not hand me a saturated consumer orange — that puts us in exactly the wrong
   company. Tell me why YOUR orange is not a marketplace orange.

The neutral should run WARM — a cold blue-grey fights orange. And given the feel
below, it should be a CONTROLLED orange, not a shouty one.

BUT QUIET IS NOT THE SAME AS GENERIC.
Linear, Stripe and Vercel are all quiet and all instantly recognizable. Default
gray shadcn is quiet and instantly forgettable. Do not hand me the safe default.
Have a point of view. Make one or two decisions someone could disagree with — an
unusual neutral temperature, a specific typeface, a distinctive radius, a
specific orange nobody else is using. Then justify them.

HOW IT SHOULD FEEL
The mission is to SAVE TIME. The principles are RASE — Reliability, Accuracy,
Speed, Easy. So the product should feel FAST, CERTAIN, CALM and PRECISE. Like a
good tool in the hand: it answers you and gets out of the way.
It should NOT feel playful, luxurious, corporate, or like it is trying to sell
you something. Nobody comes to ASK to browse. They come to decide and leave.

TRUST SIGNALS ARE BADGES, NOT RATINGS
The visible signals are: data freshness, confirmation speed, card quality,
business activity. Design them to read as metadata — facts about a listing.
Never as a score. Never a green/amber/red traffic light. Never anything a user
could mistake for a rating.

DELIVER
1. Color tokens — light AND dark, both designed, not derived by inversion:
   surface, foreground, muted, border, accent (ONE — the orange, for the
   search/primary action), destructive, success, warning, and the offer/discount
   label colour that does NOT collide with the accent. Warm neutrals.
2. Typography — a typeface supporting CYRILLIC including Kazakh (ә ғ қ ң ө ұ ү
   һ і). Russian text runs ~30% longer than English, so the scale must tolerate
   that. Give size + line-height pairs.
3. Spacing scale, radii, shadows.
4. Motion tokens — durations and easings, plus a prefers-reduced-motion fallback.
5. Primitives — Button (variants + sizes), Input, Select, Card, Modal, Toast,
   Badge (the trust-signal one), Skeleton/Loading, EmptyState. For each: anatomy,
   all states (default / hover / focus / active / disabled / error), and which
   tokens it consumes.

TECHNICAL TARGET
Output must be expressible as Tailwind v4 @theme custom properties — every color,
size, space and radius is a token. Icons come from lucide-react only. Components
are forbidden raw hex/px values, so anything you cannot express as a token cannot
exist.

Give me the tokens as a Tailwind v4 @theme block with real values, plus a short
rationale for the palette: why it stays quiet enough for brand colors to dominate
the cards.
```

## Prompt 2 — Catalog Page + the result card *(the most important screen)*

```
Using the ASK design system, prototype the CATALOG PAGE — the search results
screen. This is the heart of the product.

Reminder: ASK is an intent layer, not a marketplace. No star ratings, no buy-box,
no cart, no visible match score. Default sort is intent match, never price.

THE RESULT CARD is the most important object in ASK. It has two layers:
- BRAND LAYER — business name, logo, brand color, badges. This is the brand's stage.
- DECISION LAYER — price (show a strike-through original ONLY when the effective
  price differs), why it matched, availability, branch/distance context, and the
  actions available.

A customer must scan a card and decide in UNDER TWO SECONDS. Scannability beats
decoration — if an element doesn't help someone decide faster, it is costing them
the very thing we promise.

THE PAGE CONTAINS
- the search query, editable
- Sort: Relevance (default) · Distance · Cost · Unique Offers
- Filters: Price · Companies · Location (within 100 km / by city / by map area)
- the result list

UNIQUE OFFERS are discounts and collabs attached to a product. Show them as a
label — "−30%", "−5000 ₸", or the offer's name. They are brand signals, not
separate listings.

DESIGN THE EMPTY STATE — it is the most important state in the product. When
search finds nothing it must NOT be a dead end: it offers to send a REQUEST to
businesses, who can then respond. Design that path.

Also design: loading (skeleton cards) and error.

Distance appears only when it is a real calculated value — never "0 km", never
guessed from a city name.

Light + dark. Desktop + mobile.
```

## Prompt 3 — Product Card

```
Using the ASK design system, prototype the PRODUCT CARD.

It appears two ways — design BOTH:
1. A MODAL over the catalog page (the normal flow)
2. A FULL PAGE (/app/product/:id) for direct visits and search engines

CONTENTS: all product information, the business/brand it belongs to, price
(effective vs original), images, characteristics, branch availability — and two
actions:
- a "Proceed to Purchase" button
- a CHAT button, which opens a chat with the business directly from the card,
  with no intermediate page

No cart, no checkout, no star ratings. ASK does not transact.

Include loading and error states. Light + dark. Desktop + mobile.
```

## Prompt 4 — Home + role modal

```
Using the ASK design system, prototype HOME — the front door of ASK.

It contains: a navigation menu, a headline, and THE SEARCH FORM.

THE SEARCH FORM IS THE PRODUCT. Give it the weight. A customer types what they
need in plain language — Russian, Kazakh or English, slang, typos, a whole
sentence — not keywords. The design should invite a sentence, not a keyword.

The headline lands the promise: ASK saves you time choosing the best product.
Its principles are RASE — Reliability, Accuracy, Speed, Easy.

Also design the ROLE-CHOOSING MODAL that appears right after first entry: is the
user here to buy, or to sell?

The nav menu holds a profile card: logo · name · settings · learn more · sign out.

Light + dark. Desktop + mobile.
```

## Prompt 5 — Auth

```
Using the ASK design system, prototype AUTHORIZATION — sign up and log in.

Email plus a 6-DIGIT VERIFICATION CODE. No password on the customer path. There
is also a separate business/seller registration path.

Design: the email step, the 6-digit code step, loading, error (wrong code,
expired code), and field validation.

Light + dark. Desktop + mobile.
```

## Prompt 6 — Chats

```
Using the ASK design system, prototype CHATS.

Three surfaces:
1. The CHATS PAGE — a list of conversations
2. A CHAT THREAD
3. A CHAT MODAL that opens directly from a product card

HARD CONSTRAINTS — the backend has none of these, so do NOT design them:
- TEXT ONLY. No attachments, no images, no files.
- NO read receipts, no delivered ticks, no typing indicators.
- Unread COUNTS do exist (per side) — those are fine.

Only real conversations appear here — automated supplier checks are not chats and
must never show up as one.

Design empty, loading, and error states. Light + dark. Desktop + mobile.
```

## Prompt 7 — Business Cabinet

```
Using the ASK design system, prototype the BUSINESS CABINET — the seller's
workspace.

TABS
1. Requests — all / active / new. Incoming customer requests and chats.
2. Products — list, add, and IMPORT (upload .xlsx → map columns → preview rows
   flagged valid/warning/invalid → approve). Branch selection is part of every
   product form, and the current branch picker is a KNOWN PAIN POINT — make it
   genuinely pleasant to use.
3. Services — same as Products, but NO import.
4. Branches — same as products/services, no import.
5. Unique Offers — sales, collabs, discounts. They boost products; they are NOT
   standalone listings.
6. Company Profile — PLACEHOLDER ONLY, "coming soon". Do not invent this screen.
7. Company Dashboard — customization, staff, invites.

Roles differ: owner / manager / staff see different actions.

Loading, empty and error states for each list. Light + dark. Desktop + mobile.
```

## Prompt 8 — Landing page

```
Using the ASK design system, prototype the LANDING PAGE (marketing, at /).

It must explain, to someone who has never heard of ASK:
- THE PROBLEM — too many marketplaces, endless comparison, no clear way to know
  how to choose the best product.
- THE PROMISE — ASK saves you time choosing. Describe what you need in plain
  language; get real results from real city businesses, ranked by how well they
  match what you actually meant.
- THE PRINCIPLES — RASE: Reliability · Accuracy · Speed · Easy.
- BOTH AUDIENCES — buyers, and businesses who want qualified demand.

Static, SEO-first, fast.

Do NOT make it look like a marketplace landing page.

Light + dark. Desktop + mobile.
```
