---
name: platform-ui-design
description: Design and build the platform UI under /app/* — any slice ui/ component. Carries the anti-marketplace constraints, the two-layer result card, the shadcn-as-scaffolding law (D12), the mandatory states, and the business-cabinet information architecture. Use when creating or restyling any component inside a slice.
---

# platform-ui-design

Scope: every slice's `ui/` — `src/{auth,search,catalog,services,chats,requests,profile,business-cabinet}/ui/` and the `/app/*` routes that render them. For the landing at `/`, use `marketing-ui-design` instead.

Authorities you do not override: `AI_Knowledge/PRODUCT_VISION.md` (P9.1 — if a screen or control is not there, STOP and ASK; never invent UI), `AI_Knowledge/Locks.md` + the slice's `locks.md`, architecture D7/D8/D12, `DESIGN_PATTERNS_FRONTEND.md`.

**Before you build:** check `AI_Knowledge/ROADMAP.md` for an open **gate** on this surface. A gate parks one control, not the screen — build everything else and leave the parked piece out. G1 parks the extra sort tabs and filter controls; G3 parks the "Proceed to Purchase" click handler. Do not guess at a contract someone else owns.

## 1. The direction is DECIDED — you execute it

**§note — 2026-07-27 (D25): the platform surface is now ORANGE NEUMORPHISM.** Read
`src/design-system/neumorphism.css` before styling anything under `/app/*`; its header is the
operational spec. What changed, and what did not:

- **Depth replaced borders.** One surface colour, no hairlines, 10–24px radii, elevation from a
  paired light/dark shadow. A field is carved IN, an action stands OUT — that opposition is the
  whole grammar. Do not add a border "for definition"; on this skin it reads as a second edge.
- **Shape and depth come from `.neu-*` classes**, never from utilities in a component. They sit
  in `@layer components`, so a plain utility still overrides one with no `!important`.
- **The skin is scoped** to the `neu-skin` wrapper in `app/app/layout.tsx`. Anything Radix
  PORTALS (Dialog, DropdownMenu, Select) escapes that scope by default — out there colour
  utilities take the *marketing* palette and every `.neu-*` class matches nothing. Any portaled
  surface must pass `container={useSkinPortalContainer()}` (`shared/ui/skin-portal`). This is a
  lock; it is invisible in code review, and it shipped once as an unstyled role modal.
- **"Quiet chrome" is RETIRED** (Locks.md → Retired Locks) and so is the strict form of
  *saturation is action*: the accent gradient is legal on fills that carry NO text (avatar,
  switch track, slider, checkbox). It is still the only fill on anything carrying a LABEL, and
  the vivid `#ff6a2c` may never carry text — it holds white at 2.86:1.
- **Unchanged, and still binding:** one orange accent on warm neutrals · the Never table below ·
  trust badges as metadata, never a rating · **TINT IS INFORMATION** (the offer chip is a
  low-chroma tint with tabular numerals, never an accent fill, never a pill) · every rendered
  colour pair measured and written down.

The paragraph below is the pre-D25 statement of the direction. Its FEEL still holds; its
"quiet chrome" surface treatment does not.

Set before you; not re-openable. ~~**Quiet chrome**~~ (ASK recedes so twenty businesses' brands can sing) · **one accent, and it is ORANGE** (the primary/search action) · **warm neutrals** · feel: **fast, certain, calm, precise** — a good tool that answers you and gets out of the way. Never playful, luxurious, corporate or salesy. The three orange traps (discount collision · AA contrast · Amazon) are documented in `marketing-ui-design` §1 and bind here too — most sharply on the result card, where the offer label and the primary action appear together.

## 2. The Never table — hard constraints

ASK is an **intent layer, not a marketplace**. It routes qualified demand to brands *without commoditizing them*. Every instinct trained on Wildberries, Ozon, Amazon or Yandex Market is wrong here. This is the single most likely failure mode: the most common pattern for product-search UI in the training data **is** the marketplace.

| Never | Why |
|---|---|
| A price-first grid where the cheapest wins | Price-ascending commoditizes brands. Default sort is **intent match** (relevance). |
| A buy-box — one product, many sellers, collapsed into one row | Each brand owns its own presentation. SKU comparison is marketplace behavior. |
| Star ratings, review scores, 5-point scales | There are no public ratings in this product. None. Anywhere. |
| A visible match score or percentage on a card | The internal score is never shown to a customer. |
| A cart, basket, or checkout | ASK does not transact. |

Also never: urgency banners, countdowns, "best deal" strips, fake scarcity.

### Badges are information, not judgment

The visible trust signals are **data freshness · confirmation speed · card quality · business activity**. These are *facts about a listing*, not opinions about a business. They must read as **metadata**: never a score, never a green/amber/red traffic light, never anything a user could mistake for a rating.

## 3. The result card — the hardest object in the product

Two layers, always:

- **Brand layer** — business name, logo, brand color, cover, badges. *This is the brand's stage.* The card's chrome must not compete with it.
- **Decision layer** — price, why it matched, availability, branch/distance context, the available actions.

**A customer must scan a card and decide in under two seconds.** Scannability beats decoration: if an element does not help someone decide faster, it is costing them the very thing ASK promises. Delete it.

Data honesty (P9.4 — the backend is the data authority, a gap is raised, never faked):

- **Distance** renders only when it is a real calculated value. Never `0 km`, never inferred from a city name, never a placeholder.
- **Strike-through original price** appears ONLY when the effective price actually differs from it.
- **Unique Offers** render as a label — `−30%`, `−5000 ₸`, or the offer's name. They are **brand signals attached to a product**, never standalone listings.

### The rule that keeps the card out of the marketplace (a LOCK)

> **Saturation is ACTION. Tint is INFORMATION.**

The accent orange is the only high-chroma fill in the entire product, and it marks only things you can **act on** — the primary action, and the focus ring. Everything that is merely *true* is rendered as a low-chroma tint with ink text.

So on a result card: the button is the **only** saturated object. The `−30%` chip is a quiet warm tile (`bg-offer` / `text-offer-foreground`, chroma 0.032 against the accent's 0.161) whose weight comes from **bold tabular numerals**, not colour — and it is a rectangle (`rounded-xs`), never a pill, because pills and starbursts are marketplace sticker language. They cannot compete, because they are not in the same register.

An offer is never accent-coloured. The accent never marks a fact. Every marketplace on earth screams its discounts in red; ASK states them. Full reasoning: `src/design-system/tokens_old.css`.

## 4. shadcn is SCAFFOLDING, never a design source (D12 — zero tolerance)

The `shared/ui` primitives (Button, Input, Select, Card, Modal, Toast, Badge, Loading/skeleton, EmptyState) are scaffolded with the shadcn CLI and then **owned by us**.

The law, in order:

1. **Scaffold** via the CLI (see the vendored `shadcn` skill for correct commands, registry use and composition rules — do not recall them from memory).
2. **Restyle every class to `design-system/` tokens BEFORE the component is used anywhere.** Not after. Not "later."
3. **Radix supplies behavior only** — focus trap, keyboard navigation, ARIA. It never supplies a visual value.
4. **A shipped shadcn default colour, spacing or radius is a violation, not a style choice.** P9.2 has zero tolerance and D12 does not relax it.
5. Radix is imported inside `shared/ui/` only — never in a slice.

Composition rules from the vendored shadcn skill (semantic tokens over raw values, `flex` + `gap-*` never `space-x/y-*`, `Field`/`FieldGroup` for forms, required titles on overlays for a11y, `size-*` for square icons) apply — they happen to align with our rules. Where the two ever conflict, **our tokens and locks win**.

## 5. Mandatory states — P8.4 / P9.3, no exceptions

The vision does not draw these. Build them anyway, for every surface: **loading · empty · error · validation**.

**The empty catalog is the most important state in the product — and it must NEVER be a dead end.** Corrected 2026-07-28: this note used to say the empty state offers to send a "request" to businesses — that feature was REMOVED from the product the same day (the auto-request behaviour collapses at scale; `AI_Knowledge/features/_archived/requests/` carries the rationale, and `features/search/ux-ui-flow.md` records the replacement). The honest endings today are the search response's OWN `suggestions[]`/`ambiguity` when present, a link to clear filters or widen the radius, and a link to try the other mode (goods ⇄ services) — never a control pointing at a destination that no longer exists (project lock, "a reachable control must DO something").

Use the standard `shared/ui` patterns (Loading/skeleton, EmptyState, Toast) — never invented visuals (P9.3).

## 6. Information architecture BEFORE components — the business cabinet

A dashboard's problem is not component consistency; it is **how the information is arranged**. Before writing a single component for a cabinet surface, decide: what is grouped with what, and how much can live on one screen before it stops being scannable. Then pull the primitives.

Known constraints (PRODUCT_VISION UF 3.1 — nothing beyond it):

- Tabs: Requests (all / active / new) · Products (+ import) · Services (no import) · Branches (no import) · Unique Offers · Company Profile · Company Dashboard.
- **Company Profile is a PLACEHOLDER.** "Coming in a future update" *is* the spec (gate G2). Ship the placeholder. Do not invent the screen.
- **The branch picker is a known pain point.** Branch selection appears in every product/service form. Make it genuinely pleasant to use — this is called out in the source brief as a deliberate design target, not a checkbox.
- Import is a wizard: upload → map columns → preview rows flagged valid/warning/invalid → approve.
- Roles differ (owner / manager / staff see different actions). Model roles as a discriminated union, never optional fields (P4.2).

**Ownership, not convenience (D8):** the cabinet **composes**; it does not own other domains' data. A tab managing another domain's data is built in the slice that owns it (Products → `catalog`, Services → `services`, Requests → `requests`) and embedded via that slice's `index.ts` (R2). Reuse rule: *same knowledge → import from the owner; same looks → copy.* Never parameterize one component to serve two callers (P6.3).

## 7. Mobile web is first-class on the customer path

Desktop and mobile web both matter now; the customer flow is **mobile-first**. A phone is not a small desktop:

- **Thumb zone** — primary actions sit where a thumb actually reaches. Not top-right.
- **Touch targets ≥ 44px.** Applies to sort tabs, filter chips, and card actions especially.
- **A capped type scale** — a small, fixed set of sizes from the tokens, not ten variations.
- Russian runs ~30% longer than English; Kazakh needs ә ғ қ ң ө ұ ү һ і. No layout may be tight to its text, on any width.

## 8. Rendering, state, i18n — the rules that make it buildable

- **D7:** route files and layouts stay **server components**. `'use client'` only at the interactive component. Public surfaces (home, catalog, product card) server-render for SEO with client islands inside; authenticated surfaces (auth, chats, profile, business-cabinet) are client pages behind a thin server route file. Never flip a public surface to client rendering for convenience.
- Components **never** call `fetch` or an endpoint URL — data comes from the slice's `api.ts`, via a hook in client components (P1.2), or directly in a server route file (D7).
- Client state: zustand **store factories via context providers**, never module-scope singletons (they leak across SSR requests).
- Every user-facing string is an i18n key under the slice's namespace (ru/kk/en). No hardcoded copy.
- Icons: lucide-react only. Raster images: `next/image` only. Motion: GSAP via the `gsap-*` skills, `transform`/`opacity` only (a LOCK), reduced-motion gate in `shared/motion.ts`.

## 9. Definition of done

- [ ] The screen/control exists in `PRODUCT_VISION.md` (P9.1). Nothing invented.
- [ ] No open gate was built past; a parked control is left out, not guessed at.
- [ ] Nothing from the §2 Never table appears. Badges read as metadata, never as a rating.
- [ ] Result-card surfaces: decidable in under 2 seconds; brand layer not out-competed by ASK's chrome.
- [ ] Every value traces to a `design-system/` token. Zero raw hex, zero raw px (P9.2). No unrestyled shadcn default anywhere (D12).
- [ ] Light and dark both designed. AA contrast, including orange with its stated foreground.
- [ ] Loading, empty, error and validation all exist. The empty catalog never dead-ends (suggestions/clear-filters/other-mode — no request path, see §5).
- [ ] Survives ru / kk / en with real strings. Touch targets ≥ 44px on the customer path.
- [ ] Server/client split per D7. No fetch in a component. No module-scope store.
- [ ] Reduced-motion path verified.
- [ ] `eslint src` green; `code-rules-checker` passed; `features/{slice}/ux-ui-flow.md` updated in the same commit.
