# AUDIT_2 — the open work queue

Status: **working document** (2026-08-01). Written as a HANDOFF: everything a
fresh session needs to continue without re-deriving it. AUDIT_1 stays where it
is — it is the historical record of that pass and its corrections. This file is
the queue.

**Verification basis.** Frontend at `new_frontend` `83549fa`; backend read
directly from `../Ask_Backend` @ `dev` `cdc47dc` — Java controllers and DTOs,
never the backend's prose docs (the e2e-stub lock's rule, applied to audits).
Everything marked open below was re-checked against source on 2026-08-01, not
recalled. `npm run build` green end to end; e2e **104/104** on `chromium` and
`mobile-chromium` against `next build && next start`.

**How to use this file:** same rule as AUDIT_1 and the Changelog — when an item
is fixed, mark it `[x]` with the date and what the change did. Do NOT delete it.
When every item is resolved, fold the summary into `Changelog.md` and retire the
file.

---

## Read this first — three lessons that cost real work

1. **An unchecked box is not evidence of anything. Re-run before acting.** Three
   AUDIT_1 items were found already-green on 2026-08-01: **D-5** (prettier was
   clean; fixed by `5b5a955`), **D-7** (mobile nav; fixed by `c322331` hours
   before the audit repeated it as open), and **A7**, which was never a defect at
   all. Verify, then act.
2. **Never infer product intent from the SHAPE of code.** A7 read
   `resolveStartRoute() { return "CLIENT_SEARCH"; }` as a gutted resolver and
   filed a cross-repo dependency for a field nobody owes us. It is the backend
   implementing PRODUCT_VISION UF 1 step 3. Open the vision before concluding the
   backend is wrong (D9, P9.1).
3. **Stale PROSE does not grep.** The two worst doc defects found this session
   were sentences, not identifiers — `features/auth/README.md` describing the
   consent bug it had already fixed, and `ux-ui-flow.md` timing consent at the
   role answer. A grep for `startRouteToPath` found neither. Read the doc.

---

## Slice status

| Slice | Status | What exists |
|---|---|---|
| **auth** | ✅ **DONE** | Full anatomy; login / register / verify / Google OAuth + consent / guards / role modal. All of AUDIT_1 A1–A9 closed except A1's persistence half, which the owner deferred (below) |
| **search** | 🟡 **ALMOST** | Home + Catalog Page ship; 3 controls parked by G1; **the city filter is broken on the wire** (S1) |
| **business-cabinet** | 🟠 **~25%** | Seller-registration wizard only. `/app/business` is still the i18n placeholder (B1) |
| **catalog** | ⬜ **EMPTY** | Docs only. **Next up — roadmap #3** |
| **chats** | ⬜ **EMPTY** | Docs only; `/app/chats` is a nav destination rendering a bare placeholder (N4) |
| **profile** | ⬜ **EMPTY** | Docs only; reached from the account menu's Settings (N4) |
| **services** | ⬜ **EMPTY** | Docs only, no route |

> **The customer path still breaks after step 2.** Result cards have no click
> target because the Product Card lives in the empty `catalog` slice, so
> PRODUCT_VISION UF 2.1 steps 3–4 are unreachable. This is why `catalog` is next
> and not `chats`.

---

## Blocked on the owner, not on work

| What | Where | Blocks |
|---|---|---|
| **G1 scope question** — pick option 1, 2 or 3 | `ROADMAP.md` § *G1 — scope question* | Finishing search's last 3 controls. Option 1 means rewriting `SortControl`/`FilterPanel` and the slice lock; option 2 is additive |
| **G3** — what "Proceed to Purchase" does | `ROADMAP.md` gate table | One button on the Product Card. The whole card ships regardless |
| **PRODUCT_VISION entry for the consent gate** | `PRODUCT_VISION.md` | Building the blocking consent modal. A new screen needs a vision append (P9.1); the lock has admitted no exemption since D31 |

**A1's persistence half — decided, and deliberately deferred.** Owner
2026-08-01: users with no acceptance on record get a blocking modal until they
accept, so a consent write lost to a network error self-heals at the next load.
Best-effort writing is therefore correct as designed. **Legals are scheduled
LAST, after everything else ships**, so this builds then — see the cross-repo
blocker in N7.

---

## Carried from AUDIT_1 — re-verified open 2026-08-01

Full text in `AUDIT_1.md`; this is the queue view.

- [ ] **S1–S4 — the city filter cannot work.** `CityController.listAll()` takes
  no params and returns `CityDto {id, name}`; `resolve` requires `name`, not
  `lat`/`lng`. `search/model.ts:129-135` invents `CitySuggestion {city}` and
  `CityResolveResponse {city}`; `CityField.tsx` renders blank rows with
  `undefined` keys. `search/api.ts:41` `resolveCity()` is dead and would 400.
  `features/search/contracts.md:132` still describes it as "Resolve a city from
  coordinates". No e2e touches `/cities`. **One commit: read `CityDto`, fix the
  field, delete or rewire `resolveCity`, correct contracts.md, add a stub built
  from the Java DTO.**
- [ ] **S5 — three `SearchCardResponse` fields are unmodelled:** `hasActiveOffer`,
  `latitude`, `longitude` (0 hits in `search/model.ts`). `hasActiveOffer` is
  load-bearing — the TINT IS INFORMATION lock is currently served by inferring
  the offer from a free-text badge instead of the boolean the backend sends.
- [ ] **S6 — G1 is open** (see the owner table).
- [ ] **B1 — the cabinet behind registration is a placeholder, and it is LIVE.**
  `/app/business` renders `<main><h1>Business cabinet</h1><p>Section under
  construction</p></main>` — bare HTML, no token, no `.neu-*`, no `EmptyState`.
  Reached two ways: completing registration (`POST_ONBOARDING_PATH`) and the nav
  Dashboard link. **B1's own "Corrected 2026-08-01" note is STALE** — it says a
  seller never reaches this page, which was true only in the window before
  onboarding routing was fixed. Fix by building the shell (#6) or by making the
  page honest (see N4 — same fix, three routes).
- [ ] **B2 — `phone`/`corporateEmail` never collected.** Both land directly on the
  business profile, which is what `SearchCardResponse.businessProfile.{number,
  email}` surfaces on every card. Every business onboarded through this UI ships
  a card with no contact channels. Also starves **G3**.
- [ ] **B3 — `cityId` never sent on drafted branches** → `branch_city` null →
  invisible to the city filter. The bridge is `GET /cities/resolve?name=`.
  **Verify the KATO↔`city`-table name overlap cross-repo FIRST** (KATO spells
  `"г. Кокшетау"` / `"Көкшетау қ."`); a miss must leave `cityId` unset, and
  `resolve` 404s with `CITY_NOT_FOUND`, so the call needs a swallow. **Pairs with
  S1** — same endpoint family, verify the table once.
- [ ] **B4 — `SELLER_TERMS`/`PERSONAL_DATA_CONSENT` never recorded.** Step 5's
  checkbox gates the form and posts nothing. Deferred with the legals work.
- [ ] **B5 — Nominatim called raw from the browser.** No rate-limit handling,
  failures swallowed. Reduced by D30 (KATO supplies the administrative levels) —
  the rate-limit and silent-failure halves are untouched.
- [ ] **B6 — `CreateBranchRequest` incomplete:** `timeZoneId`, `weeklyHours`,
  `specialHours` absent from `model.ts`. Build with the Branches tab (#6) — the
  backend never populates `openingSummary` either, so there is no payoff before.
- [ ] **B7 — `createBranch()` is dead code** (`api.ts:75`), waiting on #6.
- [ ] **D-6 — `e2e/search.spec.ts:41` hardcodes `http://localhost:3000`** in its
  `addCookies` locale pin; silently dropped on any other origin, and the test
  then passes while asserting the default locale. **Its stated blocker is gone**
  (D-5 is fixed), so this is now a 3-line change: lift `pinLocale` out of
  `business-register.spec.ts:169` into a shared e2e helper.

---

## New — found 2026-08-01, not in AUDIT_1

- [ ] **N1 — the 2026-07-28 renumbering never reached the code; ~28 sites still
  carry the OLD numbers.** AUDIT_1 uses the NEW numbering, `src/` mostly the old,
  so the two authorities contradict each other and every comment reads
  plausibly. Current order: `1 auth · 2 search · 3 catalog · 4 chats · 5 profile ·
  6 business-cabinet · 7 catalog (seller) · 8 services · 9 marketing · 10 SEO ·
  11 launch`.

  | Says | Meant (old) | Now resolves to | Should say |
  |---|---|---|---|
  | `#7` (cabinet) | business-cabinet | catalog seller pass | `#6` |
  | `#8` (managed-import screen) | catalog seller pass | **services** | `#7` |
  | `#7–#9` (cabinet tabs) | cabinet→services | catalog→marketing | `#6–#8` |
  | `#6` (profile) | profile | business-cabinet | `#5` |

  **Do NOT find-and-replace** — several sites are accidentally correct under the
  new numbering (`business-cabinet/api.ts:75`, `address-select.tsx:75`,
  `features/catalog/contracts.md:46,79`). Hand-check each. `src/auth/*` and
  `AccountMenu.tsx` are already corrected.
- [ ] **N2 — `features/catalog/README.md:3` cites two backend folders that do not
  exist:** `../Ask_Backend/AI_Knowledge/features/catalog/` and `.../import/`. The
  backend's folders are `business, identity, item, messaging, offers, platform,
  request, search, service` (+ `_archived/{import,shipping}`). Catalog's real
  module is **`offer/item`**, docs at `features/item/`. **Fix before starting #3**
  — CLAUDE.md's before-change rule 5 sends the next agent down a dead path on the
  very next slice.
- [ ] **N3 — `shared/ui/sonner.tsx:50` ships a raw `"16px"`** in an object whose
  nine other entries are all `var(--token)`, in a file whose header says "no raw
  values". Worse, 16px is in no scale: `neumorphism.css` defines
  `--neu-radius-sm/md/lg/xl` = 10/14/18/24px, so the toast's corner matches
  nothing else in the product and the adjacent comment ("the skin's 16px radius")
  asserts something false. P9.2 + the magic-values lock, which forecloses the
  excuse verbatim.
- [ ] **N4 — B1 has two siblings on the CUSTOMER path.** `/app/chats` and
  `/app/profile` render the identical bare placeholder, and **Chats is a
  permanent nav destination for every user** while Settings is one tap inside the
  account menu. AUDIT_1 files only the business one. The "reachable control must
  DO something" lock permits "say plainly it is not open" — the copy does say it,
  but as three unstyled `<main><h1>` pages inside a neumorphic skin it reads as
  an unfinished build, not a message. **Cheap fix, all three at once:** the
  `EmptyState` primitive (P9.3's sanctioned pattern) with honest copy. Not
  invented UI — a "not open yet" state is what P9.3 requires of a surface that
  exists with no content.

---

## Cross-repo — backend knowledge drift

The backend is the DATA authority (D9), and its Java source is reliable. Its
**prose docs are not**, which matters because CLAUDE.md tells every agent to read
`../Ask_Backend/AI_Knowledge/features/{module}/contracts.md` before consuming an
endpoint.

- [ ] **N5a — `features/request/` was never archived.** `kz/ask/request` was
  deleted 2026-07-21; five live-looking files remain outside `_archived/`. The
  backend's own `features/README.md` § *Remove a feature* prescribes the move,
  and `_archived/{import,shipping}` proves the mechanism is in use. The frontend
  archived its mirror correctly.
- [ ] **N5b — a backend lock names a contract that no longer exists.**
  `Ask_Backend/AI_Knowledge/Locks.md`: *"Default search sort is intent_match,
  never price_asc … StructuredSearchProcessor, **SearchV2Response**"*. Neither
  `intent_match` nor `SearchV2Response` appears anywhere in `src/main/java` —
  those are pre-refactor `master` names. The intent is still right; the lock is
  unfalsifiable as written. (The Meilisearch lock beside it IS accurate.)
- [ ] **N5c — `legal` has live endpoints and no knowledge folder.** The frontend
  now depends on it for a legal artefact, and it is the one module with zero
  backend documentation.
- [ ] **N5d — `features/README.md` § *Tracked features* is an instruction, not an
  index** ("Run a codebase scan to discover existing features"). Folder names also
  diverge from the packages they mirror (`item` vs `offer/item`, `messaging` vs
  `chat`, `offers` vs `business/uniqueoffer`), and 7 real modules have no folder
  (`catalog`, `importing`, `legal`, `managedimport`, `moderation`, `audit`, `ai`).
  **The frontend's own CLAUDE.md Feature Index is currently the more accurate map
  of the backend than the backend's own docs.**
- [ ] **N6 — `POST /api/v1/legal/acceptances` is in no frontend doc.** It is the
  `ACCOUNT_SETTINGS` channel of the same service the registration path uses
  (`LegalController`), and it is what the consent gate and any future settings
  screen would call. Only `/registration-acceptances` is documented.
- [ ] **N7 — the `legal` module is WRITE-ONLY, which blocks the consent gate.**
  Two POSTs, **no `@GetMapping` anywhere in `kz/ask/legal/`**, and no consent
  field on `AuthSessionResponse`. The data exists (`LegalAcceptance`,
  `LegalAcceptanceRepository`) and is simply never exposed, so the client cannot
  tell who to gate. **Prefer a SESSION field** (`pendingLegalDocuments` or
  equivalent) over a separate `GET`: the gate covers every `/app/*` route and the
  session is already re-read on every restore, so a standalone endpoint adds a
  round-trip to every load — the same reasoning that makes `canAccessDashboard`
  session-derived. Pairs with the existing `/legal/documents` raise (allowlisted,
  no controller): knowing WHO accepted is half an answer without knowing WHICH
  documents are active. Tracked in `ROADMAP.md` § *Cross-Repo Dependencies*.

---

## Smaller, recorded so they are decisions rather than oversights

- **`expiresIn` is modelled and read by nothing** (`auth/api.ts:58` says so).
  Token expiry is still discovered by the next 401, and `GET /session` re-issues
  a token on every restore — a rolling refresh that works but was never designed.
  Fine to leave; it should be a stated decision, not an accident.
- **`business-cabinet/model.ts` (465) and `hooks.ts` (412)** exceed the old
  reading of the ~400 cap. **This is NOT a finding** — P1.1a (2026-08-01) scopes
  the cap to COMPONENT files. Recorded so it is not raised a fourth time.

---

## Suggested order

1. **S1–S4 + S5** — a shipped feature that cannot work; one commit, no gate.
2. **N2 + N1** — 20 minutes, and both mislead the agent who builds #3 next.
3. **N4 (+ B1)** — three honest placeholder pages; a seller can complete
   registration today and land on a bare stub.
4. **B2 + B3** — two missing fields that silently cripple every business
   onboarded. Verify the city-table overlap while S1 has the context loaded.
5. **`catalog` #3 — the Product Card modal.** The customer path works end to end
   from here. Ships from the search payload; `/app/product/:id` stays deferred
   (no public item read); G3 parks the one button.
6. Then `chats` #4 → `profile` #5 → `business-cabinet` #6 (with B4, B6, B7).
7. **N3, D-6, N5a–N5d, N6** — housekeeping, attach to any commit that touches
   the area.

**Legals last** (owner, 2026-08-01): the consent gate, B4, and launch item 11's
owner-authored Terms/Privacy copy land together at the end, once N7's backend
read exists.
