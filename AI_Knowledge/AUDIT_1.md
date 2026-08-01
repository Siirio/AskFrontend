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

**How to use this file:** same rule as the Changelog — when an
item is fixed, mark it `[x]` with the date and the commit's effect; do NOT
delete it. The record is the point. When every item is resolved, fold the
summary into `Changelog.md` and retire this file.

> **⚠ 2026-08-01 — the WORK QUEUE moved to `AUDIT_2.md`. Start there.**
> This file remains the historical record of the 2026-07-31 pass and its
> corrections, several of which matter (A7 was a misdiagnosis; B1's own
> correction note is stale; D-5, D-7 and A7 were all found already-green when
> re-run). `AUDIT_2.md` carries every still-open item, the findings this file
> does not have, and the owner decisions that gate them. **An unchecked box in
> here is not evidence — re-verify against source before acting on it.**
>
> **Re-verification stamp, 2026-08-01 (second pass, backend `dev` `cdc47dc`).**
> Every unchecked box in this file was re-read against Java source. Three
> outcomes, and the box alone tells you none of them:
> - **STILL OPEN, confirmed from source — S1–S6, B1–B7, D-6.** None had quietly
>   closed; no further misdiagnosis found among them.
> - **Already FIXED, box never ticked — D-5** (`5b5a955`, per `AUDIT_2.md`).
>   Exactly the staleness the paragraph above warns about. Do not read it as
>   outstanding work.
> - **DECIDED, not outstanding — A1.** Its coverage half is closed; the
>   persistence half was answered by the owner (a consent GATE, so best-effort
>   writing is correct as designed) and is deferred with the legals, blocked on
>   N7's missing backend read. The unchecked box means "not yet built", not
>   "not yet decided".
>
> The one substantive content change this pass is to **S5**, which understated
> its own defect — see the annotation there, and **N8** in `AUDIT_2.md`.

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
  **Re-verified open 2026-08-01 (second pass) — all three still 0 hits in
  `search/model.ts`. The inference is worse than "inferring", and the detail
  matters: see N8 in `AUDIT_2.md`.** `separateBadges` (`model.ts:168-180`) does
  not merely infer the offer from a badge — its `else` branch promotes **any
  unrecognised token** to `offerLabel`, which `ResultCard.tsx:67` renders raw
  inside `bg-offer`. That breaks the search slice lock ("an unrecognised badge
  token is DROPPED, never rendered raw"), the project TINT IS INFORMATION lock
  (a fake discount signal), and `model.ts:88`'s own comment, which already
  claims the dropping behaviour. It is also an assignment, so the LAST unknown
  wins — and `resolveBadges()` emits the real `activeOfferLabel` FIRST, so a
  second unknown token silently overwrites the genuine offer. **Fix S5 and N8
  as one change**; `hasActiveOffer` is what makes the tint honest and collapses
  `separateBadges` to the map-and-filter it was documented as.

- [ ] **S6 — Gate G1 is open and its 2026-07-29 scope question is undecided.** No
  filter/sort work should start until someone (not an agent inferring from backend
  prose) picks option 1, 2, or 3 in `ROADMAP.md` § *G1 — scope question*. Three
  controls stay parked: Unique-Offers sort, Companies filter, map area.

---

## 🟠 business-cabinet — registration works; everything after it does not

- [ ] **B1 — Onboarding succeeds and the cabinet behind it is a placeholder.**
  `/app/business` renders the i18n `{t("placeholder")}` page. This is the same
  shape as the D26 bug that produced the "a reachable control must DO something"
  lock, one level up: the registration door opens onto an empty room. Either
  build the cabinet shell (roadmap #6) or say plainly on that page that it is not
  open yet.
  **Corrected 2026-08-01 — this entry's own routing claim was wrong.** It read
  "`refreshSession()` → `startRoute` `OWNER_BRANCHES` → `/app/business`". The
  backend cannot emit `OWNER_BRANCHES`; `startRoute` is a hardcoded
  `"CLIENT_SEARCH"` (see **A7**), so a new seller is actually sent to `/app`
  (Home) and never reaches this placeholder on the happy path at all. The first
  pass read that value off the e2e stub instead of the Java source — the same
  mistake the e2e-stub lock names (see **A8**).

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

- [x] **B8 — `model.ts` is 437 lines; `hooks.ts` is 399.** The slice lock caps
  cabinet files at ~400 and is scoped to `ui/`, so this is P1.1 rather than a lock
  break — but this screen is named *in the lock itself* as the historical dumping
  ground, and it is already over.
  **→ RESOLVED 2026-08-01 (owner decision) — as NOT A FINDING, by making the rule
  say what it means.** `DESIGN_PATTERNS_FRONTEND.md` gained **P1.1a**: the ~400
  cap is about COMPONENT files; a slice's `api.ts`/`model.ts`/`hooks.ts` is a
  module whose length tracks the DOMAIN's surface and is governed by P1.3 + P1.4
  instead. Splitting them would also change the slice anatomy architecture §3
  fixes on purpose. **The deciding evidence was this entry's own history:** it
  was raised here, raised again by the 2026-08-01 audit (which found `auth/hooks.ts`
  at 607 and `auth/model.ts` at 421 — both larger than the files named here, and
  neither mentioned), and actioned NEITHER time, because every proposed fix was
  worse than the finding. A rule that keeps producing unactioned findings trains
  readers to skim the list. Taken deliberately BEFORE slices #3–#6 were written,
  so four more slices inherit a settled shape.
  **The real P1.1 break the same audit found was `app/_components/NavigationMenu.tsx`
  at 523 lines — an actual component, and unmentioned in this file.** Split the
  same day into `NavigationMenu` (188) + `AccountMenu` (290) + `useNavIndicator`
  (93), with no rule change needed: `app/_components/` has no fixed anatomy,
  which is exactly why it was the one that could just be fixed.

---

## 🟡 auth — shipped and solid; the gaps are contract-edge and legal

- [ ] **A1 — Legal consent has a hole.** *(Coverage half closed 2026-08-01;
  PERSISTENCE half re-opened the same day — see the bottom of this entry.)*
  `POST /legal/registration-acceptances`
  fires **only** from `RoleSelectionModal.confirm()` on the *customer* answer.
  Choosing "business" writes no consent record at all (B4 means the wizard writes
  none either). The call is also best-effort by design — a network failure toasts
  and proceeds — so registration can complete with no record. Combined with the
  placeholder Terms/Privacy copy (launch item 11), this is live exposure, not a
  to-do.
  **→ **FIXED 2026-08-01.** Moved from `RoleSelectionModal.confirm()` to `useVerifyStep`, fired on a `purpose === "REGISTER"` challenge. Closes both halves: the "business" answer no longer loses the record, and Google sign-ups stop having consent recorded for an agreement they are never shown (the P9.4 defect the first pass missed). Still best-effort by design. **Residual, raised not faked:** a Google sign-up records NO consent, because it presents none — a UX gap, in contracts.md.**
  **→ RESIDUAL CLOSED 2026-08-01 (owner directive: "Google button gets consent
  copy").** `OAuthOptions` now states the agreement beside the button — same two
  documents, same `/terms` and `/privacy` links as the email checkbox — so
  `useOAuthCallback` can record `USER_TERMS` + `PRIVACY_POLICY` on
  `?registration=1`. Both paths call one `recordRegistrationConsent()` (P6.2),
  no caller-type flag (P6.3). **The copy is on the LOG-IN page too**, which was
  the non-obvious half: `CustomOAuth2UserService` does
  `registrationRequired = user == null` → `identityService.createUser(...)`, so
  Google sign-in on the Log-in page creates accounts, and copy under Sign up
  alone would have left the busier door consenting to nothing. Passive consent,
  not a checkbox — the click IS the agreement, and a checkbox gating a link
  would be a second consent grammar for the same documents. **A1 is now fully
  closed.** What remains is not auth's: the placeholder Terms/Privacy bodies
  (launch item 11) — live consent against placeholder text is still the thing
  that must not ship.
  **→ RE-OPENED 2026-08-01 (review). "Fully closed" was wrong — one of A1's two
  original halves was never addressed.** This entry's own opening text says it:
  *"The call is also best-effort by design — a network failure toasts and
  proceeds — so registration can complete with no record."* The COVERAGE half is
  genuinely closed (every registration path now records, and only documents the
  user was shown). The **PERSISTENCE** half is untouched: a failed
  `POST /legal/registration-acceptances` toasts and the account exists anyway,
  with no retry, no queue, and no second attempt on the next session. For a
  legal artefact that is a real gap, not a nicety, and closing the item while it
  stood would have retired the finding that records it.
  **Narrowed the same day:** the OAuth path was fire-and-forget (`void`) on the
  argument that a transient redirect page has nothing to hold — but the redirect
  is exactly what the write was racing. It is now `await`ed like the verify step,
  so on both paths the call has completed or toasted before the user leaves the
  screen. That removes the race; it does not make the write durable.
  **ANSWERED 2026-08-01 (owner): a CONSENT GATE, not client-side retry.** Users
  with no acceptance on record get a blocking modal over the platform until they
  accept — so a write lost to a network error simply means the gate opens again
  on the next load, and the person accepts then. This is the better shape than
  anything the client could have retried: the BACKEND's record is the source of
  truth, the failure mode is self-healing, and nothing has to be queued or
  replayed locally (no client-side legal state to go stale, P5.2/D5). Best-effort
  writing is therefore CORRECT as designed, not a gap to engineer around.
  **BLOCKED on a backend read that does not exist — verified 2026-08-01 against
  `dev` `cdc47dc`.** `kz/ask/legal/api/LegalController` exposes
  `POST /acceptances` and `POST /registration-acceptances` and **no GET at all**;
  `AuthSessionResponse` carries no consent field either. The data is there
  (`LegalAcceptance`, `LegalAcceptanceRepository`) — it is simply never exposed,
  so the client cannot tell who to gate. Raised in ROADMAP § *Cross-Repo
  Dependencies*. **Also needed before building:** a PRODUCT_VISION entry, since
  a blocking modal is a new screen and the product lock admits no exemption
  (P9.1) — the owner's append, same pattern as Google OAuth (2026-07-19) and the
  search mode toggle (2026-07-28).

- [x] **A2 — `locale` and `countryCode` are never sent on register.** Both are on
  `CustomerRegisterRequest` with server defaults `"ru"` / `"KZ"`. A Kazakh- or
  English-speaking sign-up is stored as `ru` — in a product whose **default**
  locale is `kk` (D18/D19). The app has a live locale at that moment; send it.
  **→ **FIXED 2026-08-01.** `useRegisterFlow` sends both; `REGISTRATION_COUNTRY_CODE` is declared in `auth/model.ts` (auth cannot import business-cabinet's copy — R6).**

- [x] **A3 — `acceptedUserAgreement` is still in the register body.**
  `hooks.ts` L461 sends a field `dev`'s `CustomerRegisterRequest` does not have;
  Jackson drops it silently. Documented in contracts.md, never cleaned up. The
  client-side gate should stay (P9.4); the wire field should go.
  **→ **FIXED 2026-08-01.** Dropped from `CustomerRegisterRequest` and the call. The checkbox stays as a client-side gate.**

- [x] **A4 — `expiresIn` is not modelled.** `model.ts` L102-120 omits it although
  the backend sends `expires_in` on every session response and the OAuth bridge
  doc calls it out explicitly. The client has no idea when its JWT dies — expiry
  is discovered only by the next 401.
  **→ **FIXED 2026-08-01** — modelled, alongside A6's four fields.**

- [x] **A5 — `AUDIT_0` Finding 2 is now reachable and unfixed.** `toAuthUser`
  (`model.ts` L225-231) silently degrades an unrecognised `memberRole` to
  `kind: "customer"` with no signal raised (P9.4). Its stated trigger was "slice
  #7, when business login goes live" — seller registration shipped 2026-07-27, so
  the trigger has fired. (AUDIT_0 was retired into `Changelog.md` on 2026-08-01;
  its Finding 2 is recorded there as resolved.)
  **→ CLOSED 2026-08-01.** `roleToKind` now matches the backend enum EXACTLY (tolerating the `ROLE_` prefix) instead of substring-matching, returns `null` for an unrecognised role instead of folding it into `customer`, and `hasUnknownMemberRole()` exports the condition. That was the real content: the old substring test would have granted full business access to any value merely CONTAINING `OWNER` (`CO_OWNER`, `FORMER_OWNER`) — an escalation, not just a degrade. **No user-facing alert was built, on purpose.** The backend's business-group roles are exactly OWNER/MANAGER/WORKER and all three map correctly, so the degrade cannot fire; wiring a toast for a case that needs a future enum change is building ahead of need (P8.2). Re-open if a fourth role ships.**

- [x] **A6 — Four session fields are unmodelled**, one undocumented anywhere:
  `customerProfile`, `businessMemberships`, `pendingInvitationsCount` (noted in
  contracts.md as "confirmed live, not modelled") and **`platformMembership`**,
  which is on the Java DTO and in no frontend doc at all. All four are populated
  for real by `SessionCapabilitiesProcessor` (re-verified 2026-08-01).
  **→ **FIXED 2026-08-01.** All four modelled with their real DTO shapes; `platformMembership` added to contracts.md, which had never mentioned it. Note `businessMemberships` is `AuthBusinessMembershipResponse[]`, not `AuthBusinessContextResponse[]` as contracts.md claimed.**

### Re-audit 2026-08-01 — three findings the first pass MISSED

Backend re-read at `dev` `cdc47dc`. A1–A6 above are all still open, unchanged.
The Google OIDC fix (`cdc47dc`) needs **no client change**: `?registration=1` is
appended by `OAuth2AuthSuccessHandler` exactly as before, the new
`CustomOidcUserService` sets the same request attributes, and
`resolveBusinessContext(user)` is user-based, so a Google-signed-in owner keeps
their business context. The three below are pre-existing and were simply not
checked in the first pass — `startRoute` was taken on trust.

- [x] **A7 — `startRoute` is a HARDCODED CONSTANT; the backend no longer decides
  the post-login route.** `AuthProcessor.resolveStartRoute()` and
  `LoginProcessor.resolveStartRoute()` are both no-arg methods that
  `return "CLIENT_SEARCH";`. Login, verify and `GET /session` therefore ALWAYS
  answer `CLIENT_SEARCH`, for every account including a business owner.
  Consequences, worst first:
  1. **A newly-registered seller is sent to Home, not to their cabinet.**
     `business-cabinet/hooks.ts` `submit` sets `targetPath = "/app/business"`,
     then overwrites it with `await refreshSession()` → `startRouteToPath("CLIENT_SEARCH")`
     → `/app`. The `/app/business` fallback only survives when `refreshSession`
     THROWS — so the failure path routes correctly and the success path does not.
  2. The client **deliberately ignores the one truthful value**.
     `SellerOnboardingResponse.startRoute` is the only place the real answer
     exists (`BUSINESS_CABINET` / `MANAGED_IMPORT`, set from `catalogSetupMode`),
     and `business-cabinet/model.ts` documents it as "Deliberately NOT consumed"
     in favour of re-reading the session — which is a constant.
  3. `startRouteToPath`'s `OWNER_BRANCHES` / `BRANCH_WORKSPACE` branches are
     unreachable; the auth lock "startRoute from the backend decides the
     post-login route" is honoured by code the backend stopped feeding.
  **Not a lockout:** `canAccessDashboard` reads `business.memberRole`, not
  `startRoute`, so the nav's Dashboard link still appears and the cabinet is
  still reachable. The defect is routing, not access.
  **Fix is a product decision, not a patch:** either the backend resolves
  `startRoute` from the user's memberships again, or the client stops pretending
  it does and consumes `SellerOnboardingResponse.startRoute` at the one moment it
  is meaningful. Raise it before choosing (cross-repo).
  **→ **HALF-FIXED 2026-08-01.** The user-visible half is closed: onboarding now routes from `SellerOnboardingResponse.startRoute` via `onboardingStartRouteToPath`, so a new seller reaches the cabinet, and `useRefreshSession` returns `void` instead of a route that was always `/app`. **Still open (cross-repo):** login-time routing — an owner logging in lands on `/app`. They reach the cabinet via the nav, so it is not a lockout. Backend must decide whether `/session` resolves `startRoute` from memberships again.**
  **→ CLOSED 2026-08-01 (owner) — AND THE DIAGNOSIS ABOVE WAS WRONG. Nothing is
  open; nothing is cross-repo.** Everyone landing on Home after auth IS the
  product decision: PRODUCT_VISION UF 1 step 3 reads
  `Home + Role Choosing Modal`, for every role. `resolveStartRoute()` returning
  the constant is the backend implementing that, not a resolver someone gutted.
  This entry inferred a defect from the SHAPE of the code — a constant where a
  resolver might have been — without checking the product authority first, which
  is the inversion D9/P9.1 exist to prevent, and it then filed a cross-repo
  dependency that does not exist. Both halves are moot: (1) login-time routing
  was never broken; (2) `SellerOnboardingResponse.startRoute` is not "the one
  truthful value" — its two values name the same destination, so consuming it
  changed nothing behaviourally.
  **What was actually left was client-side speculation, and it closed by
  DELETION:** `startRouteToPath` (whose `OWNER_BRANCHES`/`BRANCH_WORKSPACE` arms
  the vision says must never fire) and `onboardingStartRouteToPath` (a switch
  whose three arms all returned `/app/business`) are gone, replaced by two named
  constants — `POST_AUTH_PATH` = `/app` (auth `model.ts`) and
  `POST_ONBOARDING_PATH` = `/app/business` (business-cabinet `model.ts`). The
  auth lock that made the resolver look owed to us is RETIRED
  (`features/auth/locks.md`), replaced by the destination stated as a rule.
  **No behaviour changed on any path** — every route was already correct. What
  changed is that the code stops implying a backend gap: the surviving branches
  read as *"the backend is missing something"* to every reader, and had already
  misled one audit pass. P8.2, P7.4.

- [x] **A8 — Four e2e stubs assert a `start_route` the backend cannot emit.**
  `business-register.spec.ts` L51, `guard.spec.ts` L34, `navigation.spec.ts` L39
  and `smoke.spec.ts` L18 all answer `start_route: "OWNER_BRANCHES"`. No backend
  path produces that value (A7). `business-register.spec.ts` then asserts the
  post-registration URL is `/app/business` — which passes against the stub and
  would not against production. This is the **e2e-stub lock** again, in the exact
  shape it was written for: a stub built from our own model can only prove the
  client agrees with itself. Fix WITH A7, not before — the stub should encode
  whatever the answer turns out to be.
  **→ **FIXED 2026-08-01.** All four now answer `CLIENT_SEARCH`, each with a comment naming the two backend methods that prove it. `business-register`'s `/app/business` assertion still holds — it now comes from the onboarding stub, which is where the real value lives.**
  **→ Amended 2026-08-01 with A7's correction.** The stub VALUES are right and unchanged; their justification was not. `CLIENT_SEARCH` is what the backend emits because the vision says every role starts at Home (UF 1 step 3) — not merely because "no backend path produces `OWNER_BRANCHES`", which describes the symptom and invites someone to "fix" the backend. Comments reworded. The client no longer branches on `start_route` at all, so these stubs now assert a field nothing reads; they stay because the field IS on the wire and a stub that omits it stops mirroring the DTO (this lock).

- [x] **A9 — `GET /session` returns a REAL access token, not null.**
  `AuthProcessor.currentSession` calls `jwtTokenService.issue(...)` and sets
  `expiresIn` on every response. `features/auth/contracts.md` says "accessToken
  comes back null (the token is already stored)" and `auth/api.ts` repeats it in
  `getSession`'s doc comment — both stale. Behaviourally this means
  `applySessionTo` re-stores a freshly-issued token on every session restore: a
  silent **rolling refresh** that nobody designed, documented, or tested. It is
  benign today and possibly desirable, but it must be a decision rather than an
  accident, and it makes **A4** (`expiresIn` unmodelled) load-bearing rather than
  cosmetic — the backend is handing the client a real expiry it never reads.
  **→ **FIXED 2026-08-01 (documentation).** Corrected in `api.ts getSession` and contracts.md; the rolling-refresh consequence is stated in both. No behaviour changed — storing the fresh token is fine, it just needed to be a known fact.**

---

## Doc drift — breaks "docs ship WITH the code"

- [x] **D-1 — `ROADMAP.md` L125 still shows Google OAuth as `[ ]` unbuilt.**
  `src/app/oauth/callback/page.tsx`, `auth/ui/OAuthCallbackPage.tsx`,
  `auth/ui/OAuthOptions.tsx`, `api.exchangeOAuthSession()` and
  `hooks.useOAuthCallback()` are all shipped and e2e-covered.
  **→ FIXED 2026-08-01.**

- [x] **D-2 — `ROADMAP.md` L109-117 shows the registration-consent items as `[ ]`**
  while `features/auth/contracts.md` says built 2026-07-30. Two authorities
  disagree; reconcile (and note the A1 hole, which is what is actually left).
  **→ FIXED 2026-08-01.**

- [x] **D-3 — `AUDIT_0.md` Finding 2's trigger fired** (see A5) and the file was
  never revisited. **`AUDIT_0.md` has since been RETIRED (2026-08-01)** — all five
  of its findings were resolved or consciously accepted, and its complete record
  is folded into `Changelog.md` under that date, per the rule the file itself
  carried. **Done 2026-08-01:** all four deferred findings re-verified
  against `dev` `cdc47dc` and annotated in place (originals untouched, dated
  corrections appended). All four are still open; every line number in that file
  was stale, and TWO descriptions were wrong, not merely out of date —
  Finding 2 described a mechanism the 2026-07-28 `toAuthUser` rewrite replaced,
  and Finding 4 named three fields that have since been renamed or deleted.
  Finding 1's regression guard (`verify:rendering`) was confirmed still wired
  into `npm run build`. Finding 4 is now cross-linked to A4/A9 — it stopped being
  YAGNI bookkeeping the moment `/session` began returning a live `expiresIn` the
  client does not model.

- [x] **D-7 — three `navigation.spec.ts` tests fail on `mobile-chromium` only,
  deterministically** *(found 2026-08-01 by running the suite; pre-existing, not
  introduced by any recent change).* `:95` expects `getByRole("navigation")
  .locator('a[href="/app"]')` to have count 2 and gets 1; `:118` and `:156` wait
  for `getByRole("menu")` and time out. Both are desktop assumptions: on mobile
  the nav renders a bottom bar rather than the top bar's duplicate home link,
  and the account menu is a **Sheet**, not a Radix `DropdownMenu`, so no element
  ever carries `role="menu"`. The mobile UI is not broken — the tests describe
  the desktop one and run in both projects. Fix by asserting the mobile
  affordances (`.neu-sheet-item`, the bottom-nav link) behind an `isMobile`
  branch, or by scoping these three to `chromium`. Left alone here because it is
  a navigation-chrome question, unrelated to the auth work this branch carries.
  **→ FIXED 2026-08-01 by commit `c322331`** ("assert the nav per viewport
  instead of the desktop shape") — the first of the two suggested fixes: an
  `isPhone(page)` branch asserting the Sheet (`getByRole("dialog")`) and the
  bottom-nav link on mobile, the DropdownMenu (`getByRole("menu")`) on desktop.
  Re-verified after the 2026-08-01 NavigationMenu split: **6/6 on `chromium`
  AND 6/6 on `mobile-chromium`.** This item stayed `[ ]` after it was already
  green — the same staleness as **D-5**, and the reason to re-run before
  trusting any unchecked box in this file.

- [ ] **D-6 — `e2e/search.spec.ts` hardcodes `http://localhost:3000`** in its
  `addCookies` locale pin *(found 2026-07-31 by review of the same pattern in
  `business-register.spec.ts`, which was fixed there).* `addCookies` needs an
  absolute URL, and a literal one is silently dropped the moment the harness runs
  on another origin — a different port when 3000 is taken, or a preview deploy.
  The test then does not fail; it quietly asserts against the default locale.
  `business-register.spec.ts` now has a `pinLocale` helper reading
  `test.info().project.use.baseURL`; lift it to a shared e2e helper and use it
  here too. Left out of the D30 commits only because `search.spec.ts` is also in
  D-5's unformatted set, so touching it drags a reformat into an unrelated diff.
  **→ The stated blocker is GONE (D-5 fixed by `5b5a955`), so this is now a
  3-line lift with no coupling. Still open.**
  **→ CONFIRMED IN THE WILD 2026-08-02, exactly as predicted.** The suite was
  driven on **port 3100** (a production build, because a dev server owned :3000 —
  see N10 in `AUDIT_2.md`). That is precisely this entry's "a different port when
  3000 is taken" scenario: the cookie was set for the `:3000` origin and the page
  under test was `:3100`, so the locale pin silently did nothing — **and all
  `search.spec.ts` tests passed anyway, 108/108.** The prediction was that it
  "does not fail; it quietly asserts against the default locale", and that is
  what happened. The pin is currently a no-op that no assertion depends on, which
  is strictly worse than no pin: it reads as coverage. Fix the helper AND check
  whether any assertion was ever meant to depend on it.

- [x] **D-5 — `npm run format:check` is RED on this branch, on 11 pre-existing
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
  **→ FIXED 2026-08-01 by `5b5a955`** ("style(repo): apply prettier to the 10
  files it had drifted on") — the dedicated `style:` commit this entry asked
  for, folded into no feature diff. **Re-verified 2026-08-02: `npm run
  format:check` is clean repo-wide.** Two details worth keeping. (1) The entry
  says **11** files; the fix touched **10** — `business-cabinet/hooks.ts` is
  listed here and absent there, having come clean via a later commit that
  reformatted it anyway. (2) **The box stayed `[ ]` for a full day after the fix
  landed**, so this entry read as a live CI failure while CI was green — the
  third item in this file to do that, after D-7 and A7. That is the whole
  argument for the header stamp above: the box is not the status.
  **Still open, and deliberately not folded in here:** the entry's own last
  sentence — pin `prettier` and `prettier-plugin-tailwindcss` exactly. A caret
  range on a formatter makes "formatted" a moving target, and nothing stops this
  from recurring on the next minor release. Carried to `AUDIT_2.md` rather than
  closed silently with the reformat.

- [x] **D-4 — RESOLVED 2026-08-01 (D31), by deletion rather than relocation.**
  Was: *"3081 lines across 27 `*_old.tsx` files live inside `src/`, so they
  type-check, lint, and pollute every search on every build. The archive is
  deliberate (`globals.css` L57-62 explains it) — it just belongs outside `src/`.
  Related trap for the next agent: `design-system/tokens_old.css` is the ACTIVE
  token source despite its `_old` name (D13)."*
  The owner directed deletion, not a move: **26 `*_old.tsx` files** removed (the
  count of 27 in the original finding included `tokens_old.css`, which is a CSS
  file and was never part of the archive — the miscount is itself evidence of how
  the `_old` suffix misled), plus `src/app/demo/` (the D24 lab, 4 files).
  Relocating outside `src/` was considered and rejected: git already stores the
  retired skin in the only form that restores coherently (`git revert`), whereas
  the file set no longer even compiled as a drop-in — `globals.css` had removed
  `focus-ring-field`, so `input_old`/`select_old` would render focus-less.
  **The named trap is gone:** `tokens_old.css` → `tokens.css`, and every
  reference in `src/`, `e2e/`, `AI_Knowledge/` and `.claude/skills/` follows it.

---

## Verified clean — no action

- **i18n parity:** 240/240 keys across ru/kk/en; the 20 identical kk↔ru values are
  proper nouns and format strings.
  **Re-counted 2026-08-01 (second pass): 256/256/256** — zero missing, zero
  extra, in either direction. The figure moved because the app gained keys, not
  because anything drifted; parity has held across every pass. Recorded so the
  next reader does not treat 240 as a target and "fix" a file down to it.
- **Search sort vocabulary** *(added 2026-08-01, second pass — checked because
  the backend regex is wider than the client's list, which usually means drift.)*
  `SearchRequest.sort` accepts `relevance|distance|price_asc|lowest_price`;
  `SORT_OPTIONS` ships only the first three. **This is correct and deliberate**
  — `model.ts:24` states that `lowest_price` has no PRODUCT_VISION entry and is
  therefore never sent (P9.1). A narrower client than the wire allows is the
  right direction for a product lock; noted so it is not "corrected" into a
  defect.
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
