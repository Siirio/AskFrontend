# Business Cabinet — Screens & Flow

Traces PRODUCT_VISION **UF 3.1** (the seller is redirected to the business registration page, then works in the cabinet).

## Entry — Seller registration (BUILT 2026-07-27, owner directive)

**Screen:** `/app/business/register` → `BusinessRegisterPage` (this slice, client behind a
thin server route file, D7). It is the first code the business-cabinet slice has; the cabinet
itself is still roadmap #7.

**Why it exists.** The role-choosing modal has always offered "set up your business" and
always routed to `/app/business`, where `RequireDashboardAccess` bounced the customer-only
session that had just chosen it. The fork looked live and did nothing — reachable, silent, and
invisible in review because both halves (the modal's target, the guard) were individually
correct. This is the destination that makes the choice real.

**Placement IS the access decision.** `app/app/(main)/business/register/` — INSIDE `(main)`
so `RequireAuth` still demands a session, and OUTSIDE `business/(cabinet)/`, the new group
that carries `RequireDashboardAccess`. A customer must reach this page precisely because they
are not a seller yet, and no per-URL allowlist was needed to say so. `(cabinet)/` was created
in the same change: the guard used to sit at `business/layout.tsx` and cover the whole prefix.

**Form** (`POST /api/v1/business/onboarding` — see contracts.md), **FIVE STEPS since
2026-07-29** (was three, 2026-07-28), one shared `button[type="submit"]` reading "Next" on
steps 1–4 and "Create business" on step 5 (`BusinessRegisterPage.tsx`). Originally mirrored the
retired React Router frontend's `SellerOnboardingPage` (found on the backend's `dev` git
branch, not deployed — consulted only as prior art) minus its map-picker and managed-import
pieces; both were added back 2026-07-29 on owner directive (see README's revision note) once
`CreateBranchRequest` was confirmed to require `latitude`/`longitude`. `useSellerOnboarding`'s
`goNext` validates ONLY the current step (model.ts `validateOnboardingStep`), never the whole
form ahead of time — validating ahead would surface a later step's error before the person has
touched it. Each field's own change handler already clears its own error as soon as it's fixed,
so `goNext` only ever needs to reveal this step's problems. Step 4 is SKIPPED entirely
(`stepIsSkippable`) when the legal form does not need verification.

| Step | Title key | Field | Control | Notes |
|---|---|---|---|---|
| 1 | `register.steps.identity` | Business name | text | required |
| 1 | | Category | **combobox** over `GET /categories?type=BUSINESS` | Free text is a first-class outcome, not a fallback — the backend accepts `categoryName` and creates the USER category itself. Picking a suggestion stores its identity; editing the text drops it again, so the two can never disagree. Opens an INSTANT dropdown on focus even with an empty query (2026-07-29) — the backend returns its full list for `q: ""` |
| 1 | | Legal form | segmented, with hints | KZ_IP · KZ_TOO · NONE. **The form's one branch** |
| 1 | | ↳ IIN / BIN + registered name | text | KZ_IP / KZ_TOO only. Exactly 12 digits, non-digits stripped live |
| 2 | `register.steps.scope` | What do you sell? | segmented (`.neu-tab-list`) | ITEM · SERVICE · BOTH. The only field with no required answer — always has a default, so this step can never block `goNext` |
| 2 | | Catalog setup | two selectable radio cards, stacked full-width | Added 2026-07-29, made fully selectable same day (locks.md Retired Locks). "Add manually" vs "Order import from Ask" (illustrative ₸ pricing, varies by scope) — both real choices; `catalogSetupMode` submits whichever is picked (contracts.md). Stacked in ONE column, not a 2-column grid (owner review, same day) — the two cards' content lengths differ too much (one line vs. reassurance + price + note) for side-by-side to look balanced. The selection dot is absolutely positioned in the card's corner, not inline beside the title — inline broke when the title wrapped |
| 3 | `register.steps.delivery` | Where do you deliver? | segmented (`.neu-tab-list`) | `NO_DELIVERY` · `SELECTED_CITIES` · `KAZAKHSTAN` · `WORLDWIDE`. `deliveryCoverage` is `@NotNull` on the backend, so this is not optional (see contracts.md) |
| 3 | | ↳ Which cities? | free-text chip list, Enter or trailing comma | `SELECTED_CITIES` only. At least one city required — not the `/cities` picker, since the backend accepts any non-blank name. No visible "Add" button since 2026-07-29 (Enter/comma commits) |
| 3 | | Only online — no physical branch | full-width toggle row (`ToggleRow`, switch indicator) | Added 2026-07-29, UI-only (not a backend field); redesigned same day from a small chip to a full-width row with icon + switch. Forces `pickupAvailable: false` and empties any drafted branches |
| 3 | | PickUp available | segmented, Yes/No | `pickupAvailable`, `@NotNull` — always sent. Renamed from "Is pickup available?" 2026-07-29. Answering Yes opens the branch map modal |
| 3 | | ↳ Branch map picker | Leaflet/OpenStreetMap modal | Added 2026-07-29 (`BranchMapModal.tsx`) — OSM tiles, Nominatim search/reverse-geocode (both free, keyless, contracts.md). Drafts `DraftBranch[]` (name, address, address details, lat/lng); every drafted branch travels inline as `SellerOnboardingRequest.pickupBranches` on submit (backend commit `9a90f5c`, same day — created atomically with the business, not a follow-up `api.createBranch` call). Address is required here — a branch drafted through this modal is always a pickup point. Scrollable (`max-h-[85vh] overflow-y-auto`) since 2026-07-29 — found by e2e: the footer button could land off-screen. **2026-07-31 (D30): the free-text address field became a KATO cascade + a street line.** `@/shared/ui/address-select` asks oblast/republican city → district (or an oblast-level city) → settlement from the state registry; the street field appears only once that cascade is as specific as the registry allows (`KzPlace.complete`) and is prefilled by the pin's reverse-geocode, now narrowed to road + house number. Both are composed into the single `address` string the DTO has, widest first (`formatKzAddress`). "Add branch" now also requires a completed place |
| 4 | `register.steps.links` | Verification sources | icon-card grid (`VerificationSources`), checkbox indicator | Moved off step 1 onto its own page 2026-07-29; redesigned same day from a flat chip row to a responsive grid of icon cards (item 5 revision) and the page-level duplicate intro paragraph removed. Only reached when `legalForm: NONE` — SKIPPED otherwise (`stepIsSkippable`). **Progressive**: pick WHICH platforms, then fill only those. At least one valid `http(s)` link required |
| 5 | `register.steps.review` | Review & confirm | read-only recap + `ToggleRow` (checkbox indicator) | Added 2026-07-29. Recaps every field from steps 1–4 (including the catalog-setup choice) plus the branch count; "I confirm this information is accurate" is required (`agreementConfirmed`, UI-only) and gates the submit button, which lives on this page. Uses the same `ToggleRow` component as step 3's online-only toggle (D8, two consumers) — both were originally a small chip, redesigned same day to a full-width row |

Steps are separated by `.neu-rule` (the skin's depth-based divider, D25) rather than a
bordered card-within-a-card — a hairline would read as a second, competing edge on this
surface. Each step lives in its own component (`RegisterStepIdentity` / `RegisterStepScope` /
`RegisterStepDelivery` / `RegisterStepLinks` / `RegisterStepReview`) purely to hold the
400-line lock, not because the steps share nothing — they all read/write the one
`SellerOnboardingValues` the hook owns. `BranchMapModal.tsx` and `BranchList.tsx` are shared
UI, not steps of their own.

**Submit is one call, not two (corrected 2026-07-29, backend commit `9a90f5c`).** Drafted
branches travel inline as `pickupBranches` on the SAME `POST /business/onboarding` request
(`toOnboardingRequest`, model.ts) — business, membership, profile, verification, and every
branch commit in one backend transaction. `useSellerOnboarding.submit` re-reads the session
right after that single call resolves; there is no follow-up per-branch loop. (An earlier
version of this doc described a two-call flow — `onboardSeller` then a loop of
`api.createBranch` — that shape 400s against the live backend as of this commit.)

**Then the session is re-read.** A 201 promotes the account to BUSINESS_OWNER server-side;
until `GET /auth/session` is re-read the client still thinks it is a customer and the guard
bounces the new seller out of the cabinet they just created. `useRefreshSession()` (`@/auth`,
added for this) is part of the flow, not a nicety, and the REFRESHED session's `startRoute`
decides the landing — never a hardcoded path (auth's lock).

**Already a seller → straight to the cabinet.** The backend's own UX contract says so
("existing business members go to their cabinet instead of seeing another create-business
entry"), and a second POST would create a second business.

**Deliberately absent.** `countryCode` is fixed to `KZ` (the legal forms on offer are
Kazakhstan's; a one-option country picker is a dead control, and a second market is gate G4).
`phone` / `corporateEmail` are optional backend fields with no vision entry (P9.1). The
managed-import SCOPING/PRICING dialog (roadmap #8) does not exist — but `catalogSetupMode`
itself is no longer restricted (reversed 2026-07-29, see locks.md's Retired Locks): step 2's two
cards are both real, selectable choices, and whichever is picked is what gets submitted.

**Branch creation is real during registration too (2026-07-29), not exclusive to the Branches
tab.** Step 3's map picker drafts branches manually, one at a time, then submits all of them
inline with the onboarding request (see the step table above and the submit note). This is
still manual creation, not the bulk IMPORT this doc's "Hard rules" forbids below — the atomic
submit is a transaction-boundary detail, not a bulk-upload mechanism.

## Entry — after registration
Seller registration → the cabinet. `startRoute` (OWNER_BRANCHES / BRANCH_WORKSPACE) decides
the landing tab — the client never hardcodes it.

## Tabs (UF 3.1, in the vision's order)
| # | Tab | Owner slice | Notes |
|---|-----|-------------|-------|
| 1 | Overview — **should be "Requests"** | `@/chats` | Filters: All · Active · New Requests. **These are all chats** — the vision's own words, and since 2026-07-28 the only possible source (the `requests` slice was removed). The tab name is a label, not a second data source. |
| 2 | Products | `@/catalog` | List, add, **import**. Backend calls them **items**; `branchId` is now OPTIONAL, so the "friendlier branch picker" the vision calls out is no longer a required field. |
| 3 | Services | `@/services` | Same as Products, **no import**. |
| 4 | Branches | business-cabinet | Same as products/services, **no import**. |
| 5 | Unique Offers | business-cabinet | Sales, collabs. **`drops` on the wire** — `/api/v1/businesses/{businessId}/drops`. |
| 6 | Company Profile | business-cabinet | **Coming in a future update** — placeholder only. |
| 7 | Company Dashboard | business-cabinet | Customization; staff and invites. |

Route: `/app/business` (client). Tabs 1–3 are embedded from their owning slices via `index.ts` — the cabinet composes, it does not own their data.

## States (P8.4/P9.3)
- Loading: per-tab skeletons — the shell renders immediately
- Empty: each list tab has its own empty state pointing at its primary action (Add / Import)
- Error: save failures keep the form filled; a Toast reports the failure
- Roles: OWNER / MANAGER / STAFF see different actions — the backend's role is the authority, never a client guess

## Hard rules
- **The branch picker is the known pain point** — the vision explicitly asks for a friendlier design for selecting branches in product forms.
- **No branch import.** Branches are "the same as goods and services, but without imports".
- **Company Profile stays a placeholder** until the vision describes it. Inventing the screen is forbidden (P9.1).
- Unique Offers are brand signals — the editor must not present them as standalone listings.
