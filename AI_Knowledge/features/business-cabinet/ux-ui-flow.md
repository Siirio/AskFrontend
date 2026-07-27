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

**Form** (`POST /api/v1/business/onboarding` — see contracts.md), **THREE STEPS since
2026-07-28**, one shared `button[type="submit"]` reading "Next" on steps 1–2 and "Create
business" on step 3 (`BusinessRegisterPage.tsx`). Grouping mirrors the retired React Router
frontend's `SellerOnboardingPage` (found on the backend's `dev` git branch, not deployed —
consulted only as prior art), minus two pieces this doc already excludes: the branch-drafting
map-picker modal for pickup, and the `ASK_MANAGED_IMPORT` choice. `useSellerOnboarding`'s
`goNext` validates ONLY the current step (model.ts `validateOnboardingStep`), never the whole
form ahead of time — validating ahead would surface a step-3 error the instant step 2 is left,
before the person has touched step 3 at all. Each field's own change handler already clears its
own error as soon as it's fixed, so `goNext` only ever needs to reveal this step's problems.

| Step | Title key | Field | Control | Notes |
|---|---|---|---|---|
| 1 | `register.steps.identity` | Business name | text | required |
| 1 | | Category | **combobox** over `GET /categories?type=BUSINESS` | Free text is a first-class outcome, not a fallback — the backend accepts `categoryName` and creates the USER category itself. Picking a suggestion stores its identity; editing the text drops it again, so the two can never disagree |
| 1 | | Legal form | segmented, with hints | KZ_IP · KZ_TOO · NONE. **The form's one branch** |
| 1 | | ↳ IIN / BIN + registered name | text | KZ_IP / KZ_TOO only. Exactly 12 digits, non-digits stripped live |
| 1 | | ↳ Verification sources | chips → link fields | NONE only. **Progressive** per the backend's UX contract: pick WHICH platforms, then fill only those — seven empty URL boxes on first render reads as homework and buries the fact that one is enough. At least one valid `http(s)` link required |
| 2 | `register.steps.scope` | What do you sell? | segmented (`.neu-tab-list`) | ITEM · SERVICE · BOTH. The only field with no required answer — always has a default, so this step can never block `goNext` |
| 3 | `register.steps.delivery` | Where do you deliver? | segmented (`.neu-tab-list`) | `NO_DELIVERY` · `SELECTED_CITIES` · `KAZAKHSTAN` · `WORLDWIDE`. Added 2026-07-28 — `deliveryCoverage` is `@NotNull` on the backend, so this is not optional (see contracts.md) |
| 3 | | ↳ Which cities? | free-text chip list, Enter or "Add" | `SELECTED_CITIES` only. At least one city required — not the `/cities` picker, since the backend accepts any non-blank name |
| 3 | | Is pickup available? | segmented, Yes/No | `pickupAvailable`, `@NotNull` — always sent |

Steps are separated by `.neu-rule` (the skin's depth-based divider, D25) rather than a
bordered card-within-a-card — a hairline would read as a second, competing edge on this
surface. Each step lives in its own component (`RegisterStepIdentity`/`RegisterStepScope`/
`RegisterStepDelivery`) purely to hold the 400-line lock, not because the steps share nothing
— they all read/write the one `SellerOnboardingValues` the hook owns.

**Then the session is re-read.** A 201 promotes the account to BUSINESS_OWNER server-side;
until `GET /auth/session` is re-read the client still thinks it is a customer and the guard
bounces the new seller out of the cabinet they just created. `useRefreshSession()` (`@/auth`,
added for this) is part of the flow, not a nicety, and the REFRESHED session's `startRoute`
decides the landing — never a hardcoded path (auth's lock).

**Already a seller → straight to the cabinet.** The backend's own UX contract says so
("existing business members go to their cabinet instead of seeing another create-business
entry"), and a second POST would create a second business.

**Deliberately absent.** `catalogSetupMode` is fixed to `MANUAL` — `ASK_MANAGED_IMPORT` opens
a managed-import dialog that does not exist until roadmap #8, so offering it would rebuild the
exact dead end this page removes. `countryCode` is fixed to `KZ` (the legal forms on offer are
Kazakhstan's; a one-option country picker is a dead control, and a second market is gate G4).
`phone` / `corporateEmail` are optional backend fields with no vision entry (P9.1). Branch
creation is optional at registration and belongs to the Branches tab.

## Entry — after registration
Seller registration → the cabinet. `startRoute` (OWNER_BRANCHES / BRANCH_WORKSPACE) decides
the landing tab — the client never hardcodes it.

## Tabs (UF 3.1, in the vision's order)
| # | Tab | Owner slice | Notes |
|---|-----|-------------|-------|
| 1 | Overview — **should be "Requests"** | `@/requests` + `@/chats` | Filters: All · Active · New Requests. These are all chats. |
| 2 | Products | `@/catalog` | List, add, **import**. Needs a friendlier branch picker (the vision calls this out). |
| 3 | Services | `@/services` | Same as Products, **no import**. |
| 4 | Branches | business-cabinet | Same as products/services, **no import**. |
| 5 | Unique Offers | business-cabinet | Sales, collabs. |
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
