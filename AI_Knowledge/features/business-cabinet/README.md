# Business Cabinet

Mirrors backend modules: **business** + **offers** (`../Ask_Backend/AI_Knowledge/features/business/`, `.../offers/`).

The seller workspace (UF 3.1). Owns the cabinet shell and the tabs whose data belongs to the `business` module: Branches, Unique Offers, Company Profile, Company Dashboard.

## Key decisions
- **The cabinet is composition, not ownership.** Tabs that manage another domain's data are built in the slice that owns it and embedded here via its `index.ts` (R2, D8):
  - **Products** → `@/catalog` · **Services** → `@/services` · **Overview/"Requests"** → `@/requests` + `@/chats`
  - Owned here: **Branches**, **Unique Offers**, **Company Profile**, **Company Dashboard**
- **Overview should be called "Requests"** (the vision says so explicitly), filtered All / Active / New Requests. Its content is chats and requests.
- **Branches are like products/services but without import** — no branch import wizard exists or should be built.
- **Company Profile is "coming in a future update".** Ship the placeholder the vision describes — do not invent the screen (P9.1).
- Unique Offers (sales, collabs) are **brand signals and boosters**, never standalone search results — a backend lock that this slice's editor must not contradict.
- Client-rendered (D7). Editors are split hard by responsibility: no file over ~400 lines (P1.1) — the historical failure mode of this exact screen.

## Status

**Seller registration is BUILT (2026-07-27)** — `/app/business/register`, the slice's first
code. The cabinet and its tabs remain roadmap #7–#9.

It was built ahead of the cabinet because it was the missing half of something already
shipped: the role modal's "set up your business" routed into the cabinet's own guard and was
bounced back, so the choice silently did nothing. Registration is what turns a customer into a
seller, so it is the door the guard is guarding — see `ux-ui-flow.md` for the placement rule
and `contracts.md` for the endpoint (which was documented under a name the backend does not
have; corrected in the same change).
