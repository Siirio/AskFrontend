# Frontend Design Patterns & Code Principles

Status: **normative** (V1 — greenfield, 2026-07-14). These are code-level rules (functions, hooks, components, types). Structure-level rules (folders, slices, imports) live in `ARCHITECTURE_PATTERN_FRONTEND.md`; the product scope lives in `PRODUCT_VISION.md` — read all three before writing code.

Every rule has an ID. Use IDs in code reviews and AI prompts: "this violates P1.2" beats "this doesn't look right". Ratings reflect relevance to THIS project (thin client on Next.js App Router, backend owns business truth, UI built from the product vision + backend contract — D9, most code written by AI agents) — not general importance.

---

## P1. Single Responsibility — ★★★★★ (the #1 failure mode of AI-written code)

One component/hook/function = one reason to change.

- **P1.1** A component file MUST NOT exceed ~400 lines. At the limit, split by responsibility (sub-components, extracted hooks) — never by arbitrary line count.
- **P1.2** Pages and large components MUST NOT inline data fetching. In CLIENT components, data access goes into a slice hook (`useBusinessProfile()`, `useSearchResults()`) built on the slice's `api.ts`; the component consumes state and renders. In SERVER route files (public surfaces), calling the slice's `api.ts` directly and passing data down is the sanctioned path (architecture D7). Either way, components never call `fetch` or endpoint URLs themselves.
- **P1.3** A hook has ONE responsibility. Fetching+saving an entity is one responsibility; form field state+validation is one responsibility; mixing entity IO with form validation is two — split.
- **P1.4** Do NOT over-split: code that always changes together stays together (a form's fields and its validation rules belong in one hook).

Canonical failure to guard against: a single page file that fetches auth-aware data, manages editor state, AND renders — three reasons to change in one file. Split it the moment it forms.

## P2. Open–Closed — ★★★☆☆ (apply only at variant points)

Add behavior with new code, not by editing working code — but ONLY where variants genuinely exist.

- **P2.1** UI primitives with variants use lookup maps / `cva`, never growing if/else chains (Button's `variantMap` is the house style).
- **P2.2** Multi-kind rendering (e.g., PRODUCT vs SERVICE search results) uses a discriminated union + one component per kind, selected by a map. Adding a kind = adding a component, not editing a switch inside an existing one.
- **P2.3** Do NOT preemptively extract callbacks/strategies from simple conditionals. A two-branch `if` is fine until a third genuinely different case exists.

## P3. Liskov Substitution — ★☆☆☆☆ (one rule, no ceremony)

- **P3.1** A component that wraps another (Button wrapping a native `<button>`, or a `shared/ui` primitive wrapping its scaffolded Radix element, D12) MUST forward the base props unchanged — same names, same semantics, `...rest` spread. Never rename `disabled` to `isDisabled` in a wrapper.

Nothing else from LSP applies to this codebase. Do not invent hierarchies to apply it to.

## P4. Interface Segregation — ★★★★☆ (types are the target)

Nothing depends on fields/methods it doesn't use.

- **P4.1** DTO/model types live in the owning slice's `model.ts` (per architecture doc). No global fat type files: a change to a request DTO must not touch code that only renders search results.
- **P4.2** Model the auth roles (customer / business / staff) as a **discriminated union**, never one `User` with optional fields. `Partial<X>` to make never-existing fields "optional" is forbidden — if a field can never exist for a role, the role's type must not have it.
- **P4.3** Component props accept the minimum: pass `title, price, city`, not the whole `SearchResult`, when only three fields are used — unless the component conceptually renders the entity.
- **P4.4** Do NOT shard types that always change together; split only along real business boundaries.

## P5. Dependency Inversion — ★★★☆☆ (narrow, deliberate use)

Backend owns business rules; this client is intentionally thin. Full-blown DIP machinery is over-engineering here. Exactly three sanctioned applications:

- **P5.1** `model.ts` mappers (DTO → view model) are **pure functions**: no fetch, no storage, no imports from `api.ts`. They must be callable in a unit test with a plain object.
- **P5.2** Token/storage access goes through the storage helpers in `shared/api` (future `TokenStorage` interface for React Native, architecture D5). Components and slice logic never call `localStorage` directly.
- **P5.3** Cross-cutting services (auth state, theme) are provided via React context: the context object and its consumer hook are DEFINED in the owning slice and exported via its `index.ts`; `app/providers` only mounts the provider component (architecture rule R6). Slices consume via the hook — never by importing `app/`.
- **P5.4** FORBIDDEN: IoC containers, service locators, interface-per-service layers. If someone (human or agent) proposes one, the answer is no until a real second implementation exists.

## P6. DRY — ★★★★★ (at the KNOWLEDGE level) — with the wrong-abstraction guard

One piece of knowledge = one representation. The classic drift in AI-built codebases is systemic duplication of mechanisms — two animation systems, `prefers-reduced-motion` implemented in three places, styles split between CSS classes and hundreds of inline objects. These rules exist to keep that from ever forming.

- **P6.1** One implementation per concern — the binding list is architecture doc §7 (HTTP, routing, rendering, state, animation, styling, i18n, icons, images). Adding a parallel mechanism is an architecture violation.
- **P6.2** Business rules, validation regexes, and constants exist in exactly one exported place. Copy-pasting a validation rule into a second file is a bug.
- **P6.3** **Wrong-abstraction guard:** a shared helper MUST NOT accept a "caller type" parameter (`if (formType === "register")`...). The moment a shared function needs to know who is calling it, inline it back into the callers and let them diverge. Duplication is cheaper than the wrong abstraction.
- **P6.4** Rule of three (architecture doc §5): duplicate for the second consumer; abstract only at the third, and only if the code is genuinely the same knowledge, not coincidentally similar.
- **P6.5** Tests are NOT DRY: each test shows its own inputs and expectations inline. Helpers may remove boilerplate (rendering setup) but must never hide what is being tested.

## P7. KISS — ★★★★★ (the default instruction to every agent)

Match solution complexity to problem complexity. AI agents gold-plate by default — this rule exists to stop that.

- **P7.1** Simplest sufficient tool: a server component before a client component (`'use client'` only when interactivity demands it, D7); `useState` before `useReducer`; a function before a class; a component before a "system"; a zustand store (factory + provider, D7) only when state outlives one component tree.
- **P7.2** No new dependency without a decision-log entry in the architecture doc (§11). "The library exists" is not a reason.
- **P7.3** No configuration objects, preset taxonomies, or "engines" for a single call site. An app of this size never needs a 10-purpose preset system.
- **P7.4** If a task can be done by deleting code, prefer that over adding code.

## P8. YAGNI — ★★★★★ (build for today's requirement)

Don't build features, parameters, or abstractions before a real need exists.

- **P8.1** No speculative function parameters, props, or config options. A helper gets the parameters its current callers pass — nothing "for flexibility".
- **P8.2** No "supporting multiple implementations" when exactly one exists (one payment provider, one analytics sink, one LLM vendor adapter — extend when the second one is REAL).
- **P8.3** Documented exceptions (planned-and-scheduled needs are not speculation): i18n externalized strings (world-wide is on the roadmap); platform-neutral slice logic per architecture decision D5 (mobile is on the roadmap). Exceptions must be traceable to a `ROADMAP.md` phase.
- **P8.4** YAGNI never excuses skipping error handling, loading/empty states, input validation, or tests for existing behavior. Those are today's requirements.

## P9. Product Fidelity — ★★★★★ (the two sources of truth, D9)

`PRODUCT_VISION.md` is the product authority (screens, flows, controls); the AskBackend API is the data authority (contracts, DTOs). Code follows both — never memory of other products, never invention.

- **P9.1** Build ONLY screens, components, and flows that exist in the product vision (UF 1–3.1, Filter & Sort V1). Inventing UI (extra buttons, settings, decorations, whole screens) is forbidden — if something seems missing, STOP and raise it.
- **P9.2** No magic visual values in components: every color, font size, spacing, and radius comes from `design-system/` tokens via the Tailwind theme (D3). A raw hex or px literal in a component is a violation (computed dynamic values excepted).
- **P9.3** States the vision doesn't spell out (loading, empty, error, validation) are still mandatory (P8.4) — implement them with the standard `shared/ui` patterns (Loading, EmptyState, Toast), not invented visuals.
- **P9.4** When the vision and the backend contract disagree (missing field, different cardinality), the backend wins for DATA and the vision wins for INTENT — and the mismatch is raised, never silently patched.

---

## How to use this file

**In AI prompts:** reference rules by ID and quote them. Example task preamble: "Follow DESIGN_PATTERNS_FRONTEND.md. In particular P1.2 (no fetching in components), P6.3 (no caller-type params in shared helpers), P8.1 (no speculative props)."

**In code review:** cite the ID, point at the line, state the fix. "P4.2: `email?: string` on `GuestUser` — guests never have email; split the type."

**Priority when rules conflict:** correctness > P9 product fidelity > P6.1 single implementation > P1 single responsibility > everything else. KISS/YAGNI break ties: when two designs both satisfy the rules, ship the simpler one.

**Changing this file:** same process as the architecture doc — append, date, and justify. Rules here must stay checkable; if a rule can't be verified by looking at a diff, it doesn't belong in this file.
