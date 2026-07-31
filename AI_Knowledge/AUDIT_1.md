# AUDIT_1 — Slice completeness & backend-contract audit

Status: **record** (2026-07-31). Full audit of every tracked slice against the
**backend as the data authority** (`../Ask_Backend` @ `dev` `2583755`) — Java
DTOs and controllers read directly, never the backend's prose docs (the same
rule the e2e-stub lock encodes, `Locks.md` 2026-07-27).

**Method:** read the 3 CORE files + `Locks.md` + `ROADMAP.md` + every
`features/{slice}/*`; walked the whole `src/` tree; then field-by-field
reconciliation of each consumed contract against the Java source
(`SearchRequest`, `SearchFilterRequest`, `SearchCardResponse`, `CityController`,
`CategoryController`, `SellerOnboardingRequest`, `CreateBranchRequest`,
`AuthSessionResponse`, `AuthUserResponse`, `CustomerRegisterRequest`,
`VerifyCodeRequest`, `SecurityConfig`). i18n parity checked programmatically
(240/240 keys across ru/kk/en). No code was changed and nothing was run.

**Backend sync point:** this repo last reconciled at `dev` `2e06cbe`. Three
commits landed since (`c5b8b21`, `70d00d3`, `2583755`) — all deploy/platform
only, **no frontend impact**.

**How to use this file:** same rule as `AUDIT_0.md` and the Changelog — when an
item is fixed, mark it `[x]` with the date and the commit's effect; do NOT
delete it. The record is the point. When every item is resolved, fold the
summary into `Changelog.md` and retire this file.

---

## Slice status

| Slice | Status | What exists |
|---|---|---|
| **auth** | ✅ **DONE** | Full anatomy; login / register / verify / Google OAuth / guards / role modal; 476-line e2e |
| **search** | 🟡 **ALMOST** | Home + Catalog Page ship; 3 controls parked by G1; **the city filter is broken on the wire** (S1) |
| **business-cabinet** | 🟠 **~20%** | Seller-registration wizard only. No cabinet shell, no tabs — `/app/business` is still the i18n placeholder |
| **catalog** | ⬜ **EMPTY** | Docs only. `/app/product/[id]` is an i18n placeholder |
| **chats** | ⬜ **EMPTY** | Docs only. `/app/chats` is an i18n placeholder |
| **profile** | ⬜ **EMPTY** | Docs only. `/app/profile` is an i18n placeholder |
| **services** | ⬜ **EMPTY** | Docs only, no route |

Not slices, stated for completeness: `app/(marketing)` is a 36-line placeholder;
Terms / Privacy / Cookies are `noindex` placeholders; there is no `sitemap.ts`,
`robots.ts`, or OG image.

> **The customer path breaks after step 2.** The Catalog Page's result cards have
> no click target, because the Product Card lives in the empty `catalog` slice
> (deliberate — `ResultCard.tsx` L16-18 documents it — but it means PRODUCT_VISION
> UF 2.1 steps 3-4 are unreachable today).

---

## 🔴 search — three confirmed live defects

- [ ] **S1 — The city-filter autocomplete cannot work.** Read from
  `kz/ask/shared/api/CityController.java` + `CityDto.java`:

  | | Frontend sends / reads | Backend actually does |
  |---|---|---|
  | `GET /api/v1/cities` | `?q=<typed>`; reads `suggestion.city` | `listAll()` — **takes no params**, returns `List<CityDto>` = `[{id, name}]` |
  | `GET /api/v1/cities/resolve` | `?lat=&lng=` | `findByName(@RequestParam String name)` — **`name` is required** → 400 |

  Consequences in `src/search/ui/CityField.tsx` (L42, L103, L116): every keystroke
  pulls the **entire** city table unfiltered; every option row renders blank
  (`suggestion.city` is `undefined`); every React `key` is `undefined`; picking a
  row sets the filter to `undefined`. `src/search/model.ts` `CitySuggestion` /
  `CityResolveResponse` are both invented shapes — the exact failure the Data Lock
  ("DTO shapes are never invented client-side") forbids.
  **Fix:** read `CityDto`; `{ id, name }`; drop the `q` param or raise a
  server-side filter with backend.

- [ ] **S2 — `resolveCity()` is dead code hiding a broken contract.**
  `src/search/api.ts` L41-50 is exported and called from nowhere. It would 400 if
  it were called. Either wire it correctly or delete it (P8.1).

- [ ] **S3 — The docs are why the code is wrong.**
  `features/search/contracts.md` § *Filter reference data* lists both city
  endpoints with **no request params and no response shape**, and describes
  `/cities/resolve` as "Resolve a city from coordinates" — which is not what the
  controller does. Correct it from the Java source in the same commit as S1.

- [ ] **S4 — No e2e reaches the city endpoint.** `e2e/mock-backend.mjs` stubs only
  `POST /api/v1/search`; `e2e/search.spec.ts` never routes `/cities`. This is
  precisely the failure mode the 2026-07-27 e2e-stub lock was written after: a
  green suite over a broken wire. Add a stub **built from `CityDto`**.

- [ ] **S5 — Three `SearchCardResponse` fields exist on the wire and appear in
  neither `model.ts` nor `contracts.md`:** `hasActiveOffer`, `latitude`,
  `longitude`. `hasActiveOffer` is load-bearing — the "TINT IS INFORMATION"
  Unique-Offer lock is currently served by inferring the offer from a free-text
  badge instead of from the boolean the backend already sends. `latitude` /
  `longitude` are half of the parked map-area filter.

- [ ] **S6 — Gate G1 is open and its 2026-07-29 scope question is undecided.** No
  filter/sort work should start until someone (not an agent inferring from backend
  prose) picks option 1, 2, or 3 in `ROADMAP.md` § *G1 — scope question*. Three
  controls stay parked: Unique-Offers sort, Companies filter, map area.

---

## 🟠 business-cabinet — registration works; everything after it does not

- [ ] **B1 — Onboarding succeeds and lands the new seller on a placeholder.**
  `hooks.ts` L360-366 → `refreshSession()` → `startRoute` `OWNER_BRANCHES` →
  `/app/business` → the i18n `{t("placeholder")}` page. This is the same shape as
  the D26 bug that produced the "a reachable control must DO something" lock, one
  level up: the registration door now opens onto an empty room. Either build the
  cabinet shell (roadmap #6) or say plainly on that page that it is not open yet.

- [ ] **B2 — `phone` and `corporateEmail` are never collected.** Both are on
  `SellerOnboardingRequest` and land *directly* on the business profile
  (`SellerOnboardingProcessor` L70-71) — which is exactly what
  `SearchCardResponse.businessProfile.{number, email}` surfaces on every result
  card. **Every business registered through this UI ships a card with no contact
  channels.** This also starves gate **G3**, whose only surviving candidate is
  those very fields.

- [ ] **B3 — `cityId` is never sent on drafted branches.** `model.ts` L100-108
  types it on `CreateBranchRequest`; `toOnboardingRequest` (L402-409) omits it.
  Branches created at registration therefore have no city → `branch_city` is null
  on their search cards → **they are invisible to the city filter** (which S1
  independently breaks).
  **The bridge exists (found 2026-07-31, while building D30):**
  `GET /api/v1/cities/resolve?name=` → `CityService.findByName` → `{id, name}` is
  a public, allowlisted lookup from a city NAME to the `cityId` UUID this field
  wants, and `AddressSelect` now emits exactly such a name as `KzPlace.placeName`.
  So the fix is: resolve `placeName` in `business-cabinet`'s `api.ts` and attach
  the id to the drafted branch. **Two cautions before doing it.** (1) It is a
  NAME match against the backend's own `city` table — KATO spells things
  `"г. Кокшетау"` / `"Көкшетау қ."`, and whether those rows match is unverified;
  a miss must leave `cityId` unset, never guess a neighbour. (2) `resolve` 404s
  with `CITY_NOT_FOUND` on a miss, so the call needs a swallow, not a form error
  — a branch whose city the backend does not know is still a valid branch.
  Do NOT start this from the frontend alone: confirm the name overlap against a
  real `city` table first (cross-repo), or it silently attaches nothing.

- [ ] **B4 — `SELLER_TERMS` / `PERSONAL_DATA_CONSENT` are never recorded.** Step
  5's agreement checkbox gates the form and posts nothing. Already flagged as
  "business-cabinet's gap" in `features/auth/contracts.md` § *Legal consent*.
  A legal artefact, not decoration. See also A1.

- [ ] **B5 — Nominatim is called raw from the browser.** `api.ts`: no identifying
  `User-Agent` (a browser cannot set one), no rate-limit handling, failures
  swallowed to `[]` / `null`. OSM's usage policy will throttle or block this at
  real volume — and the map picker is the **only** way `latitude` / `longitude`
  get collected, which the backend marks `@NotNull`. Silent degradation on the
  critical path. Needs either a proxied call, a keyed provider, or an honest
  error state.
  **Partially reduced 2026-07-31 (D30), NOT closed:** the KATO cascade now
  supplies oblast/district/settlement from the state registry, so a Nominatim
  outage costs only the street line rather than the whole address, and
  `reverseGeocode` was narrowed to road + house number. The rate-limit and
  silent-failure halves of this finding are untouched.

- [ ] **B6 — `CreateBranchRequest` is modelled incompletely.** `timeZoneId`,
  `weeklyHours`, `specialHours` are on the Java DTO and absent from `model.ts`.
  Registered branches therefore carry no opening hours — upstream of the already
  never-populated `openingSummary` (cross-repo table).

- [x] **B9 — the branch e2e asserted a request the client had stopped making.**
  *(Found and fixed 2026-07-31, while wiring D30 through the same modal.)*
  Commit `41c7506` (2026-07-29) moved drafted branches inline onto
  `SellerOnboardingRequest.pickupBranches` and stopped calling
  `POST /businesses/{id}/branches` — but `e2e/business-register.spec.ts` was not
  touched in that commit and kept stubbing that endpoint and asserting
  `branchBusinessId === "b1"`, which can no longer be reached. The test now reads
  the onboarding body itself and asserts `pickup_branches` (plus that the map
  supplied the `@NotNull` coordinates). Same lesson as the e2e-stub lock, one
  level up: **a test may only assert the call the code actually makes** — and the
  guard against a repeat is that a submit-shape change must update its spec in
  the same commit, exactly as docs do.

- [ ] **B7 — `createBranch()` is dead code.** `api.ts` L77 — exported, called from
  nowhere, waiting on roadmap #6. Documented as such; listed so the deferral is on
  record (P8.1/P8.3), not as loose debt.

- [ ] **B8 — `model.ts` is 437 lines; `hooks.ts` is 399.** The slice lock caps
  cabinet files at ~400 and is scoped to `ui/`, so this is P1.1 rather than a lock
  break — but this screen is named *in the lock itself* as the historical dumping
  ground, and it is already over.

---

## 🟡 auth — shipped and solid; the gaps are contract-edge and legal

- [ ] **A1 — Legal consent has a hole.** `POST /legal/registration-acceptances`
  fires **only** from `RoleSelectionModal.confirm()` on the *customer* answer.
  Choosing "business" writes no consent record at all (B4 means the wizard writes
  none either). The call is also best-effort by design — a network failure toasts
  and proceeds — so registration can complete with no record. Combined with the
  placeholder Terms/Privacy copy (launch item 11), this is live exposure, not a
  to-do.

- [ ] **A2 — `locale` and `countryCode` are never sent on register.** Both are on
  `CustomerRegisterRequest` with server defaults `"ru"` / `"KZ"`. A Kazakh- or
  English-speaking sign-up is stored as `ru` — in a product whose **default**
  locale is `kk` (D18/D19). The app has a live locale at that moment; send it.

- [ ] **A3 — `acceptedUserAgreement` is still in the register body.**
  `hooks.ts` L461 sends a field `dev`'s `CustomerRegisterRequest` does not have;
  Jackson drops it silently. Documented in contracts.md, never cleaned up. The
  client-side gate should stay (P9.4); the wire field should go.

- [ ] **A4 — `expiresIn` is not modelled.** `model.ts` L102-120 omits it although
  the backend sends `expires_in` on every session response and the OAuth bridge
  doc calls it out explicitly. The client has no idea when its JWT dies — expiry
  is discovered only by the next 401.

- [ ] **A5 — `AUDIT_0` Finding 2 is now reachable and unfixed.** `toAuthUser`
  (`model.ts` L225-231) silently degrades an unrecognised `memberRole` to
  `kind: "customer"` with no signal raised (P9.4). Its stated trigger was "slice
  #7, when business login goes live" — seller registration shipped 2026-07-27, so
  the trigger has fired. Mark AUDIT_0's Finding 2 when this lands.

- [ ] **A6 — Four session fields are unmodelled**, one undocumented anywhere:
  `customerProfile`, `businessMemberships`, `pendingInvitationsCount` (noted in
  contracts.md as "confirmed live, not modelled") and **`platformMembership`**,
  which is on the Java DTO and in no frontend doc at all.

---

## Doc drift — breaks "docs ship WITH the code"

- [ ] **D-1 — `ROADMAP.md` L125 still shows Google OAuth as `[ ]` unbuilt.**
  `src/app/oauth/callback/page.tsx`, `auth/ui/OAuthCallbackPage.tsx`,
  `auth/ui/OAuthOptions.tsx`, `api.exchangeOAuthSession()` and
  `hooks.useOAuthCallback()` are all shipped and e2e-covered.

- [ ] **D-2 — `ROADMAP.md` L109-117 shows the registration-consent items as `[ ]`**
  while `features/auth/contracts.md` says built 2026-07-30. Two authorities
  disagree; reconcile (and note the A1 hole, which is what is actually left).

- [ ] **D-3 — `AUDIT_0.md` Finding 2's trigger fired** (see A5) and the file was
  never revisited.

- [ ] **D-5 — `npm run format:check` is RED on this branch, on 11 pre-existing
  files** *(found 2026-07-31; unrelated to that day's change, which is clean).*
  With the exact declared Prettier (3.9.5) these do not match their committed
  form: `e2e/{mock-backend.mjs,search.spec.ts}`, `app/app/(main)/catalog/page.tsx`,
  `business-cabinet/{hooks.ts,ui/RegisterStepReview.tsx,ui/RegisterStepScope.tsx,ui/ToggleRow.tsx}`,
  `search/{model.ts,ui/CatalogPage.tsx,ui/ResultCard.tsx,ui/SearchForm.tsx}`.
  The diffs are `prettier-plugin-tailwindcss` class re-ordering (`w-full min-h-16`
  → `min-h-16 w-full`) and JSX collapsing — i.e. commits that skipped
  `npm run format`, or a plugin-version drift under the `^` range. **CI gates
  `format:check` (D15), so the build job is failing for a reason that has nothing
  to do with the code.** Fix in ONE dedicated `style:` commit — not folded into a
  feature diff, where it would bury the real change. Consider pinning `prettier`
  and `prettier-plugin-tailwindcss` exactly, since a caret range on a formatter
  makes "formatted" a moving target.

- [ ] **D-4 — 3081 lines across 27 `*_old.tsx` files live inside `src/`**, so they
  type-check, lint, and pollute every search on every build. The archive is
  deliberate (`globals.css` L57-62 explains it) — it just belongs outside `src/`.
  Related trap for the next agent: **`design-system/tokens_old.css` is the ACTIVE
  token source** despite its `_old` name (D13).

---

## Verified clean — no action

- **i18n parity:** 240/240 keys across ru/kk/en; the 20 identical kk↔ru values are
  proper nouns and format strings.
- **`POST /api/v1/search`** — every field, validator, and cross-field assert in
  `SearchRequest` / `SearchFilterRequest` matches `src/search/model.ts`. The
  `radiusMeters` ⇒ `userLocation` rule is mirrored correctly.
- **`GET /api/v1/categories`** — `q` + required `type`, `CategoryAutocompleteResponse`
  / `CategorySuggestionResponse` all match `business-cabinet/model.ts` exactly.
- **`POST /api/v1/business/onboarding`** — every required field, every enum
  spelling (`BusinessScope`, `BusinessLegalForm`, `DeliveryCoverage`,
  `CatalogSetupMode`), and all four `@AssertTrue` rules are mirrored in
  `validateOnboarding`. Gaps are the *optional* fields in B2/B3/B6.
- **`identity` DTOs** — `verificationId`, `VerificationResponse.purpose`,
  `AuthBusinessContextResponse`, `AuthUserResponse` all match. Gaps are A4/A6.
- **R1–R6 boundaries, slice anatomy, single-implementation (§7):** no violations
  found; `shared/` carries no business knowledge.

---

## Suggested order

1. **S1-S4** — a shipped feature that cannot work, fixable in one commit
   (read `CityDto`, drop or fix `resolveCity`, correct `contracts.md`, add a
   `/cities` stub built from the Java DTO).
2. **B2 + B3** — two missing optional fields that silently cripple every business
   the product onboards.
3. **A1 + B4** — consent, before the owner's legal copy lands (launch item 11).
4. **B1** — the cabinet shell, or an honest "not open yet" on `/app/business`.

Blocked on a human, not on work: **G1's scope question** (S6) and **G3's fresh
product answer**.
