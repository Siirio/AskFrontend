---
name: marketing-ui-design
description: Design and build the marketing landing at app/(marketing)/ — the visual direction, the anti-generic rules, GSAP scroll storytelling, and the D6 content-only constraints. Use when creating or restyling any marketing/landing surface, or when generating the design-system tokens that surface depends on.
---

# marketing-ui-design

Scope: `src/app/(marketing)/` — the landing at `/`. For anything under `/app/*`, use `platform-ui-design` instead.

Authorities you do not override: `AI_Knowledge/PRODUCT_VISION.md` (what exists), `AI_Knowledge/Locks.md`, architecture D6/D11/D12, `DESIGN_PATTERNS_FRONTEND.md` P9.1/P9.2.

## 1. The direction is DECIDED — you execute it, you do not re-open it

These were settled before you. Do not propose alternatives; propose *better executions*.

| Decision | The rule |
|---|---|
| **Quiet chrome** | ASK's own UI recedes. Search results show twenty businesses' logos, brand colors and covers at once — a loud ASK fights them. Neutral, confident canvas; saturation is spent in exactly one place. |
| **One accent, and it is ORANGE** | Not a proposal. The primary/search action wears it. Everything else recedes. |
| **Warm neutrals** | A cold blue-grey fights orange. The neutral ramp runs warm. |
| **Feel: fast, certain, calm, precise** | Like a good tool in the hand: it answers you and gets out of the way. NOT playful, NOT luxurious, NOT corporate, NOT salesy. Nobody comes to ASK to browse — they come to decide and leave. |
| **Not a marketplace** | The landing must not look like one. See `platform-ui-design` §2 for the full Never table; it binds here too. |

### Quiet is not the same as generic

Linear, Stripe and Vercel are quiet and instantly recognizable. Default-gray shadcn is quiet and instantly forgettable. **Do not ship the safe default.** Make one or two decisions someone could disagree with — an unusual neutral temperature, a specific typeface, a distinctive radius, a specific orange nobody else is using — and be able to justify each in one sentence.

### The three orange traps — SOLVED 2026-07-15 (D13). Do not re-solve them.

All three were closed when the tokens landed. The answers are in `src/design-system/tokens.css`, which documents its own reasoning. Read them; do not re-derive them, and do not "improve" a value without re-running the contrast proof.

1. **The discount collision** → solved by **register, not hue**: *saturation is action, tint is information.* The accent is the only high-chroma fill in the product and it marks only things you can act on; a Unique Offer is a low-chroma tint (chroma 0.032 against the accent's 0.161) whose weight comes from bold tabular numerals, not colour. They cannot compete because they are not in the same register. **This is a lock.**
2. **Contrast** → the accent is `oklch(0.575 0.161 46)`, the *brightest* orange at that hue still holding white text at AA (4.67:1). Dark mode carries a **different value at the same hue**, because one value provably cannot serve both. `--accent-foreground` is therefore a token: white in light, ink in dark. All 31 rendered pairs verified.
3. **Amazon** → hue 46 sits deliberately below Amazon's yellow-orange (hue 63) and above the dusty low-chroma terracotta of the cliché in §3. It is deep because *contrast* chose it, not taste — which is exactly what makes it a controlled orange rather than a consumer one.

**If a colour token must change:** re-run the OKLCH→sRGB→WCAG proof over every pair in the table at the bottom of `tokens.css`. A contrast claim that was not computed is not a contrast claim.

## 2. The process — commit before you build

Never open an editor first. Two passes, in order.

**Pass 1 — commit.** Write down, in a few lines: the token system (color, typography, layout, and the one *signature element* that makes this page recognizably ASK), and the one aesthetic risk you are taking. Ground every choice in the subject: local search in Kazakhstan, ru/kk/en, a tool that saves you time. Not in "what a landing page looks like."

**Pass 2 — critique, then build.** Read your Pass 1 against §1 and §3. Anything that arrived by default rather than by decision gets replaced. Only then write code.

Rules that carry through both passes:

- **Typography carries the personality.** It is not neutral delivery. But it MUST support Cyrillic including Kazakh (ә ғ қ ң ө ұ ү һ і) — verify glyph coverage before committing to a face, not after. Russian runs ~30% longer than English: no layout may be tight to its text.
- **Structure encodes meaning**, it does not decorate.
- **Spend your boldness in one place.** One signature element, not five.
- **Real content only.** Write the actual Russian copy. Lorem ipsum hides layout failures that ru/kk will find in production.
- **Quality floor, no exceptions:** responsive, keyboard-navigable, AA contrast, light *and* dark both designed — never derived by inverting.

## 3. Anti-slop — the defaults to refuse

Generic AI clichés (refuse on sight): purple/indigo gradient on white · glassmorphism cards floating on a blurred blob · a hero with a centered headline over a mesh gradient · three feature cards with circle-icon-title-paragraph · Inter as an unconsidered default.

**ASK-specific traps — these are the ones you will actually fall into:**

- **Terracotta-on-cream.** Anthropic's own design skill now names "warm cream background + high-contrast serif display + terracotta accent" as the #1 AI-design cliché. ASK's decided direction — warm neutrals plus orange — lands *adjacent to it*. This is the trap you are most likely to walk into. Our orange must read as **decided and precise**, not as the AI-default terracotta; our neutral must be a specific temperature, not generic cream. If the result could be mistaken for that cliché, it has failed §1's "quiet is not generic" rule.
- **Amazon orange.** Saturated consumer orange. See trap 3 above.
- **Marketplace idioms** on a landing that exists to say we are not one: price-first grids, star ratings, "best deals" strips, urgency banners, countdowns.
- **The universal AI scroll reveal** — everything fading up 20px on scroll, uniformly, because it is the only motion the model knows. See §4.

## 4. Motion — GSAP, and it must mean something

GSAP is the single JS animation system (D11). **When animation is needed, invoke the `gsap-core`, `gsap-scrolltrigger` and `gsap-react` skills** rather than recalling the API from memory — they are the vendored official GreenSock skills and they carry the correct patterns (`useGSAP()` + refs, ScrollTrigger config, cleanup).

Binding rules:

- **Animate `transform` and `opacity` ONLY** — never `width`/`height`/`top`/`left`. Layout-triggering properties force a recalculation every frame; this one rule is what keeps motion smooth. This is a LOCK, not a preference.
- Shared config and the reduced-motion gate live in `shared/motion.ts` — checked **once**, there, never per component (P6.1).
- Durations and easings come from `design-system/` motion tokens. No inline magic numbers (P9.2).
- **Motion serves the subject or it does not exist.** The landing's job is to land the promise — problem, promise, RASE, both audiences — as a scroll-driven story. Motion that exists because motion is expected is deleted.
- Under `prefers-reduced-motion: reduce`, everything degrades to nothing, and the page still reads. Verify this, don't assume it.

## 5. D6 — the marketing surface is content-only

Non-negotiable structure (architecture §2, D6, and a project lock):

- `app/(marketing)/` imports `shared/` and `design-system/` **only**. It never imports a slice, and has no `api.ts` / `model.ts` / `store.ts`.
- It is the ONLY copy of the marketing content. Never duplicate landing copy into a slice.
- **Static and SEO-first.** Nothing critical above the fold may depend on client JS. Do not flip this surface to client rendering for convenience.
- Every user-facing string is an i18n key (ru/kk/en) — no hardcoded copy, ever.
- Icons: lucide-react only. Raster images: `next/image` only.
- Logged-in visitors on `/` redirect to `/app/` via the `ask.accessToken` check, suppressed by `?from=app`.

What the landing must communicate (PRODUCT_VISION — do not invent beyond it): the **problem** (too many marketplaces, endless comparison, no clear way to choose) · the **promise** (describe what you need in plain language; get real results from real city businesses, ranked by how well they match what you *meant*) · **RASE** (Reliability · Accuracy · Speed · Easy) · **both audiences** (buyers, and businesses who want qualified demand).

## 6. Definition of done

- [ ] Every value traces to a `design-system/` token. Zero raw hex, zero raw px (P9.2).
- [ ] Light and dark both designed. Neither derived from the other.
- [ ] Survives ru, kk and en without the layout breaking. Tested with real strings.
- [ ] AA contrast, including the orange with its stated foreground.
- [ ] Reduced-motion path verified: motion off, page still reads.
- [ ] Nothing from §3 appears. The signature element from Pass 1 survived to the build.
- [ ] Nothing from the Never table (`platform-ui-design` §2) appears.
- [ ] Content-only: no slice import, no fetch, still statically rendered.
- [ ] Every string is an i18n key.
- [ ] `eslint src` green.
