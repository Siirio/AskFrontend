# Business Cabinet — Slice Locks

LOCKED | The cabinet composes, it does not own other domains' data | Products→@/catalog, Services→@/services, the "Requests" tab→@/chats, embedded via index.ts (R2, D8). Re-implementing a tab here duplicates knowledge | src/business-cabinet/ui/*

> **Note 2026-07-28 — the lock is unchanged; one of its examples died.** The mapping above read
> `Requests→@/requests+@/chats` until the `requests` slice was removed from the product. The
> RULE (compose, never own) is untouched; the "Requests" tab now composes `@/chats` alone,
> which is what PRODUCT_VISION UF 3.1 item 1 always described — *"these are all chats"*.
LOCKED | No branch IMPORT (bulk upload) | Branches are "the same as goods and services, but without imports" (UF 3.1 item 4) | Branches tab
> **Note 2026-07-29 — the lock is about bulk IMPORT, not manual creation.** The registration
> wizard's step 3 gained a Leaflet/OpenStreetMap picker that manually drafts branches one at a
> time. **Corrected same day (backend commit `9a90f5c`):** those drafted branches now travel
> inline as `SellerOnboardingRequest.pickupBranches` and are created atomically with the
> business — NOT via a separate `POST /api/v1/businesses/{businessId}/branches` call per branch
> (that endpoint is still real, still used, but only by the Branches tab adding a branch to an
> EXISTING business, roadmap #6). Either way, this is not the import wizard the lock forbids —
> CSV/bulk upload of many branches at once is still out of scope everywhere in the product.
LOCKED | Company Profile stays a placeholder until the vision describes it | "Coming in a future update" — building it is invented UI (P9.1) | Company Profile tab
LOCKED | Unique Offers are brand signals and boosters, never standalone listings | They boost linked products/services; presenting them as products is marketplace behavior (backend lock) | Unique Offers tab
LOCKED | No cabinet file exceeds ~400 lines | This screen is the classic dumping ground — auth-aware fetching + editor state + rendering in one file (P1.1) | src/business-cabinet/ui/**
LOCKED | Role-gated actions come from the backend role, never a client-side guess | OWNER/MANAGER/STAFF see different actions; the backend is the authority | all cabinet tabs
LOCKED | Everything under `app/(main)/business/(cabinet)/` is dashboard-gated; `business/register/` is the ONE sibling outside that group, and it is outside because it is the way IN | Placement IS status, the same grammar as the `(main)` group being the auth gate line (D23). A new cabinet tab is protected by being put in the group, with nothing to remember; moving the guard back up to `business/layout.tsx` would re-break seller registration, because the guard's whole job is to bounce the customer who needs that page | src/app/app/(main)/business/(cabinet)/layout.tsx, src/app/app/(main)/business/register/page.tsx
LOCKED | A server-side role change is made visible by RE-READING the session, never by patching the auth store from a slice | `POST /business/onboarding` promotes a customer to BUSINESS_OWNER. A slice that set the role itself would be asserting a role the backend never confirmed (P9.4), and the session is auth's to own (R6) — hence `useRefreshSession()` in `@/auth` rather than a local write | src/business-cabinet/hooks.ts, src/auth/hooks.ts

## Retired Locks
Kept, not deleted — a retired lock records that a decision was CONSCIOUSLY reversed.

RETIRED 2026-07-29 (owner directive, same day as the note below, D29) | ~~`catalogSetupMode` stays `MANUAL` until the managed-import dialog exists~~ | Superseded: both option cards on step 2 are now real, selectable radio choices and `toOnboardingRequest` sends whichever `catalogSetupMode` was picked. This is NOT the dead end the lock was written to prevent — `ASK_MANAGED_IMPORT` is a valid value on `SellerOnboardingRequest` in its own right (confirmed from the Java DTO, not assumed); what is still missing is a SEPARATE follow-up scoping/pricing screen (roadmap #7), and the UI is honest about that gap (`catalogSetup.managedImport.priceNote`: "our team will follow up to confirm scope and price") rather than promising an instant dialog. The 2026-07-29 note directly below this entry (written earlier the same day) described the PREVIOUS, now-superseded state — kept for the history, not as current guidance | src/business-cabinet/model.ts (`catalogSetupMode` on `SellerOnboardingValues`), ui/RegisterStepScope.tsx
> **Superseded note, originally 2026-07-29 (earlier the same day).** "Step 2 shows the
> `ASK_MANAGED_IMPORT` option card (illustrative pricing) so a seller knows it exists, but it
> renders disabled/unselectable — clicking it does nothing, and `toOnboardingRequest` still
> hardcodes `MANUAL`." No longer true — see the RETIRED entry above.
