# Business Cabinet

Mirrors backend modules: **business** + **offers** (`../Ask_Backend/AI_Knowledge/features/business/`, `.../offers/`).

The seller workspace (UF 3.1). Owns the cabinet shell and the tabs whose data belongs to the `business` module: Branches, Unique Offers, Company Profile, Company Dashboard.

## Key decisions
- **The cabinet is composition, not ownership.** Tabs that manage another domain's data are built in the slice that owns it and embedded here via its `index.ts` (R2, D8):
  - **Products** → `@/catalog` · **Services** → `@/services` · **Overview/"Requests"** → `@/chats`
  - Owned here: **Branches**, **Unique Offers**, **Company Profile**, **Company Dashboard**
- **Overview should be called "Requests"** (the vision says so explicitly), filtered All / Active / New Requests. **Its content is chats — only chats.** PRODUCT_VISION UF 3.1 item 1 says so itself ("these are all chats"), and since 2026-07-28 there is nothing else it could be: the `requests` slice was removed from the product and the backend's `request` domain deleted. The tab name is a label, not a second data source.
- **Unique Offers are `drops` on the wire** — `/api/v1/businesses/{businessId}/drops` (verified on `dev` `ee542d9`). The `business-admin/offers` paths this doc once carried never existed on `dev`.
- **Branches are like products/services but without import** — no branch IMPORT (bulk-upload) wizard exists or should be built. This is unchanged by registration now being able to create individual branches one at a time via a map picker (2026-07-29, see below) — that is manual creation, the same action the future Branches tab will offer, not a bulk import path.
- **Company Profile is "coming in a future update".** Ship the placeholder the vision describes — do not invent the screen (P9.1).
- Unique Offers (sales, collabs) are **brand signals and boosters**, never standalone search results — a backend lock that this slice's editor must not contradict.
- Client-rendered (D7). Editors are split hard by responsibility: no file over ~400 lines (P1.1) — the historical failure mode of this exact screen.

## Status

**Seller registration is BUILT (2026-07-27, revised 2026-07-29)** — `/app/business/register`,
the slice's first code. The cabinet and its tabs remain roadmap #7–#9.

It was built ahead of the cabinet because it was the missing half of something already
shipped: the role modal's "set up your business" routed into the cabinet's own guard and was
bounced back, so the choice silently did nothing. Registration is what turns a customer into a
seller, so it is the door the guard is guarding — see `ux-ui-flow.md` for the placement rule
and `contracts.md` for the endpoint (which was documented under a name the backend does not
have; corrected in the same change).

**2026-07-29 revision (owner directive, 10-item UI pass).** The wizard grew from three steps to
five — proof-of-trade links moved to their own page, and a "review & confirm" page was added —
and step 3 (delivery) gained a real branch-creation flow: a Leaflet/OpenStreetMap picker
(`BranchMapModal.tsx`, OSM tiles + Nominatim search/reverse-geocode, both free/keyless) drafts
one or more branches, each POSTed via `api.createBranch` right after the business itself exists.
This was a deliberate reversal of the 2026-07-28 design, which explicitly excluded a
"branch-drafting/map-picker modal for pickup" — reversed because `CreateBranchRequest` (read
from the backend source, `kz.ask.business.branch.api.dto.CreateBranchRequest.java`) turned out
to require `latitude`/`longitude`, so the endpoint was never actually optional-coordinates; the
map is how those coordinates get collected, not a nicety. Step 2 also now SHOWS the
`ASK_MANAGED_IMPORT` catalog-setup option with illustrative pricing.

**Second same-day revision (owner UI review of the built pages, D29).** The
`ASK_MANAGED_IMPORT` card went from disabled to fully selectable and submitted for real —
`catalogSetupMode` sends whichever card was picked, because the field is valid on
`SellerOnboardingRequest` on its own (see locks.md's Retired Locks for the full reasoning).
Three UI-only elements that had shipped as small chips were redesigned into full-width or
grid treatments after review feedback that they read as unfinished: step 3's "Only online"
toggle and step 5's agreement checkbox both moved to a new shared `ToggleRow` component
(full-width row, icon, real switch/checkbox indicator); step 4's verification-source picker
moved from a flat wrapped row of text chips to a responsive icon-card grid
(`VerificationSources.tsx`). The page header's subtitle was removed and the header-to-form gap
set to 48px, matching the Home hero's spacing (`gap-12`). The nav's glass blur was increased
(`design-system/neumorphism.css`, `.neu-topbar`/`.neu-bottom-nav`, 20px→32px) — unrelated to
this slice but touched in the same review pass.
