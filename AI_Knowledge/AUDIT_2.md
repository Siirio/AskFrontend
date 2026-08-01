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

## The audit SNAPSHOT (2026-08-01/02) — what the pass found, before any fix

*(Kept separate from current status on purpose. This paragraph is a photograph;
the checkboxes below are the live state and have moved since. Read a `[x]` as
authoritative and this paragraph as history — never the reverse.)*

Re-verified at frontend `1ca4532` (docs-only since `83549fa`, so no code had
moved) against backend `dev` `cdc47dc`. Every carried item was re-read from
source. **At snapshot time all were open; none had silently closed.** Newly
confirmed from source: `CityController` (no params on `listAll`, `name` required
on `resolve`) · `CityDto {id, name}` · `SearchCardResponse` carrying
`hasActiveOffer`/`latitude`/`longitude` · `SellerOnboardingRequest` carrying
`phone`/`corporateEmail` · `CreateBranchRequest` carrying
`timeZoneId`/`weeklyHours`/`specialHours` · `toOnboardingRequest` omitting
`cityId` · `resolveCity()` still called from nowhere. The pass ADDED **N8**,
**N9** and **N10**, refined **N1** to an exact site list, and confirmed **N2**.
i18n parity re-counted programmatically: **256/256/256** across ru/kk/en, zero
missing, zero extra (AUDIT_1's "240/240" is an older count, not a defect).

## Current status — as of 2026-08-02, frontend `b5138b9`

**Closed since the snapshot:** **N9** only (commit `8e41a30` — both auth routes
`noindex`, the false `/app/*` crawlability premise corrected in three places, two
e2e assertions added). With it, `auth` meets all 8 DONE criteria.

**Everything else on this page is OPEN**, including N8 and N10, which were found
by this pass and not acted on. Verification state of the tree at `b5138b9`:
`npm run build` green end to end (lint → boundary fixtures → token drift → tsc →
next build → rendering contract); `format:check` clean repo-wide; e2e
**108/108** on `chromium` and `mobile-chromium` against a real
`next build && next start`. **That e2e figure required working around N10** — a
dev server owned `:3000`, so the run was driven on `:3100`; a plain
`npm run test:e2e` would have tested the dev server instead.

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
| **auth** | ✅ **DONE** | Full anatomy; login / register / verify / Google OAuth + consent / guards / role modal. All of AUDIT_1 A1–A9 closed except A1's persistence half, which the owner deferred (below). **All 8 DONE criteria pass as of 2026-08-02** — anatomy, thin routes + D7 split, zero hardcoded copy, the four states, docs, build/lint, 476-line e2e, and criterion 8 once **N9** closed. Two carve-outs remain DECIDED-not-missing, neither buildable here: A1's consent gate (blocked on N7 — the backend exposes no read) and the launch lock on placeholder legal copy (owner-authored, item 11) |
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

### What "EMPTY" means, precisely — and what unblocks each

*(Added 2026-08-01, second pass. `src/{catalog,chats,profile,services}/` do not
exist as directories at all — this is not a partially-built slice, it is zero
lines. The route files that reference them are the i18n placeholder pages.)*

**The finding here is the good news: none of the four is blocked on the
backend.** Controllers verified present on `dev` `cdc47dc`:

| Slice | Backend controller | Endpoints | Blocked? |
|---|---|---|---|
| `catalog` #3 | `offer/item/api/BusinessProductController` (+ `importing/api/ItemImportController`) | business-scoped, authenticated | **No — for the MODAL.** It ships from the search payload. Only the `/app/product/:id` deep link is blocked: no public item read exists (allowlist permits `/search`, `/cities`, `/categories`, `/businesses/*/business-profile`, `/businesses/*/drops`, `/business-media/files/*` — verified). **G3 parks one button, not the card** |
| `chats` #4 | `chat/api/ChatController` | `POST /chat/conversations` · `GET /chat/conversations` · `GET` + `POST /chat/conversations/{id}/messages` · `POST /chat/conversations/{id}/read` · `POST /chat/support` (+ `BusinessChatController`, `ChatFileController`) | **No.** The full conversation surface exists |
| `profile` #5 | `identity/api/ProfileController` | `GET /profile` · `PUT /profile` · `POST /profile/icon` | **No.** Read, update and avatar all present |
| `services` #8 | `offer/service/api/BusinessServiceController` | business-scoped | **No.** Mirrors Products, no import (D8: duplicated, never parameterized) |

So "what is left" for all four is **frontend work only**: the §3 anatomy, the
thin route file, i18n keys under the slice namespace, the four mandatory states
(P8.4/P9.3), the `features/{slice}/*` docs in the same commit, and an e2e
smoke test — the eight DONE criteria in `ROADMAP.md`. No cross-repo raise is
needed to start any of them.

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
- [ ] **D-5 residual — `prettier` and `prettier-plugin-tailwindcss` are still on
  caret ranges.** The reformat (`5b5a955`) closed the drift; it did not close the
  CAUSE, which is D-5's own last sentence: a `^` range on a FORMATTER makes
  "formatted" a moving target, and CI gates `format:check` (D15). The next minor
  release of either package can turn the build red on files nobody touched —
  which is exactly how the original 10-file drift appeared. Pin both exactly.
  Carried here so closing D-5 in `AUDIT_1.md` does not retire the finding that
  records it.
- [ ] **D-6 — `e2e/search.spec.ts:41` hardcodes `http://localhost:3000`** in its
  `addCookies` locale pin; silently dropped on any other origin, and the test
  then passes while asserting the default locale. **Its stated blocker is gone**
  (D-5 is fixed), so this is now a 3-line change: lift `pinLocale` out of
  `business-register.spec.ts:169` into a shared e2e helper.
  **CONFIRMED IN THE WILD 2026-08-02:** the suite was driven on `:3100` (N10's
  workaround), which IS this finding's "a different port when 3000 is taken"
  case. The cookie was set for the `:3000` origin, the page under test was
  `:3100`, the pin silently did nothing — **and every `search.spec.ts` test
  passed anyway.** The prediction was "it does not fail; it quietly asserts
  against the default locale", and that is what happened. A pin no assertion
  depends on is worse than no pin: it reads as coverage. Fix the helper AND
  check whether any assertion was ever meant to depend on it.

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

  **Hand-check DONE for `src/` 2026-08-01 (second pass) — 18 sites, 9 wrong.**
  The remaining 29 sites are in `AI_Knowledge/features/` and are NOT yet
  checked. The `src/` half is now a mechanical edit, no judgement left:

  | Site | Says | Should say |
  |---|---|---|
  | `app/app/(main)/business/(cabinet)/layout.tsx:26` | `#7` | `#6` |
  | `app/app/(main)/business/(cabinet)/page.tsx:6` | `#7` | `#6` |
  | `app/app/(main)/profile/page.tsx:6` | `#6` | `#5` |
  | `business-cabinet/api.ts:12` | `#7–#9` | `#6–#8` |
  | `business-cabinet/index.ts:7` | `#7–#9` | `#6–#8` |
  | `business-cabinet/model.ts:30` | `#8` | `#7` |
  | `business-cabinet/model.ts:179` | `#8` | `#7` |
  | `business-cabinet/ui/BusinessRegisterPage.tsx:72` | `#8` | `#7` |
  | `business-cabinet/ui/RegisterStepScope.tsx:38` | `#8` | `#7` |

  **Verified already-correct — do not touch:** `chats/page.tsx:6` (`#4`),
  `product/[id]/page.tsx:6` (`#3`), `AccountMenu.tsx:65` (`#5`),
  `auth/api.ts:12` (`#6`), `auth/model.ts:157` (`#6`),
  `business-cabinet/api.ts:75` (`#6`), `business-cabinet/model.ts:104` (`#7`),
  `search/ui/ResultCard.tsx:16` (`#3`), `shared/ui/address-select.tsx:75`
  (`#6`). *(That is 9 correct to 9 wrong in `src/` — which is exactly why the
  find-and-replace warning is load-bearing: a blind pass would corrupt half the
  sites it touched.)*
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
- [ ] **N8 — `separateBadges` does the OPPOSITE of the lock it implements, and
  the failure wears the Unique-Offer tint.** *(Found 2026-08-01, second pass.
  Highest-severity item on this list that is not gate-blocked.)*
  `search/model.ts:168-180`:

  ```ts
  const key = BADGE_I18N_KEYS[badge];
  if (key) badgeKeys.push(key);
  else offerLabel = badge;          // ← unknown token, rendered RAW
  ```

  Three things are wrong with that `else`, and each breaks something written
  down:

  1. **The slice lock says the opposite.** `features/search/locks.md`: *"A badge
     token the client does not recognise is DROPPED, never rendered raw … the
     backend emits hardcoded English (`official channel`, `complete card`,
     `pickup`); rendering an unknown token raw ships English into a ru/kk
     product the first time backend adds one."* The code does not drop it — it
     promotes it. `model.ts:88`'s own comment (*"map through BADGE_I18N_KEYS,
     **drop unknown**"*) describes behaviour the function three sections below
     does not have. The lock, the comment and the code were each read as
     evidence for the other two.
  2. **It renders in `bg-offer`.** `ResultCard.tsx:67-70` puts `offerLabel` in
     the offer tint. The project lock **TINT IS INFORMATION** reserves that
     register for a Unique Offer, so the first badge token the backend adds
     ships as a **fake discount signal** — in English — on every card that
     earns it. Worse than the raw-English defect the slice lock anticipated,
     because a reader cannot tell it is wrong.
  3. **`offerLabel = badge` is an assignment, so the LAST unknown wins** — and
     `StructuredSearchProcessor.resolveBadges()` (L413-427) adds the real
     `activeOfferLabel` **first**, before the three known tokens. Two unknowns
     on one card therefore *overwrite the genuine offer label* with the
     spurious one, silently. The one case the field exists for is the case that
     loses.

  **Fix WITH S5, not separately — they are one change.** `hasActiveOffer` is the
  boolean the backend already sends and the honest source for the tint; once the
  tint reads that, `separateBadges` collapses to a map-and-filter that drops
  unknowns, which is what both the lock and the comment already claim it does.
  Add an e2e stub case with an unknown badge token (built from
  `resolveBadges()`, per the e2e-stub lock) — nothing in the suite covers this
  today, which is why it survived two audits.

- [x] **N9 — the auth pages are the ONLY crawlable `/app/*` surface, and they
  are the ones with no `noindex` — while a gated page has one.** *(Found
  2026-08-01, second pass, checking `auth` against DONE criterion 8 — the
  criterion everyone skipped because the roadmap says it does not apply.)*

  | Route | Reachable logged-out? | `robots` |
  |---|---|---|
  | `/app/auth/login` | **YES** (D23 lock: the ONE exception) | *(none)* |
  | `/app/auth/register` | **YES** (same) | *(none)* |
  | `/app/business/register` | No — behind `RequireAuth` | `index: false` |

  Both auth routes ship `generateMetadata` with a title and **no `robots`**;
  `src/app/layout.tsx` sets no global one; there is no `robots.ts` and no
  `sitemap.ts` (roadmap item 10). So nothing suppresses them.

  **The interesting part is the reasoning, not the tag.** ROADMAP item 10 says
  *"Marketing + legal pages only — D23 put every `/app/*` surface behind the
  auth gate, so none of them is crawlable"*, and
  `business/register/page.tsx:18` repeats it verbatim to justify its own
  `noindex`: *"the whole `/app/*` tree is authenticated — there is nothing here
  for a crawler."* That sentence is **false for exactly one subtree**, and
  `Locks.md` states the exception explicitly: *"`/app/auth/*` is the ONLY
  logged-out-reachable `/app` subtree."* The generalisation got applied to the
  page it does not cover and skipped on the pages it does — so the gated route
  is protected and the open one is not.

  Low severity on its own (an indexed login page is thin content, not a leak —
  no authenticated data is exposed). Recorded because it is the **only** DONE
  criterion `auth` does not satisfy, and because the false premise is what will
  route item 10 wrong when someone finally writes `robots.ts`/`sitemap.ts`.
  **Fix:** add `robots: { index: false }` to both auth routes, and correct the
  premise in ROADMAP item 10 and in `business/register/page.tsx:18` — the
  reason that route is not crawlable is `RequireAuth`, not a blanket claim
  about `/app/*`.
  **→ CLOSED 2026-08-02.** Both auth routes now return
  `robots: { index: false }`, each stating WHY per-route (the D23 exception)
  rather than inheriting a claim about the tree. **The three doc fixes were the
  point, not the tag:** `business/register/page.tsx` no longer justifies its own
  `noindex` with the false sentence — placement is the access decision, so
  placement is the crawlability reason too; ROADMAP item 10 carries a dated
  correction; `features/auth/ux-ui-flow.md` records the metadata with the
  reasoning. **`robots.ts` is still owed by item 10 and must `Disallow: /app/`
  explicitly** — per-route tags protect only the two pages that exist today, and
  the next logged-out-reachable `/app` page would ship indexed. Guarded by two
  `e2e/auth.spec.ts` assertions, in the repo's habit of giving a lock teeth
  (`design-system.spec.ts`, `verify:rendering`): the failure is silent, so a
  removal has to fail the suite rather than the launch. **With this, `auth` meets
  all 8 DONE criteria.**

- [ ] **N10 — a local `npm run test:e2e` silently tests the DEV server, which
  the harness config's own header forbids.** *(Found 2026-08-02 by running the
  suite — not by reading it. Empirical, and it would not have shown up in any
  code review.)*

  `playwright.config.ts` opens with *"drives the PRODUCTION build — `next build
  && next start` — never the dev server, so what passes here is what ships."*
  Both `webServer` entries then set **`reuseExistingServer: !process.env.CI`**.
  So locally, if anything already listens on `:3000`, Playwright reuses it and
  never builds. On this machine `npm run dev` was running, and it was identified
  as a dev server from its markup (a `next-devtools` chunk plus unminified
  `node_modules_next_dist_compiled_*` turbopack chunk names). **A plain
  `npm run test:e2e` would have reported 108/108 against the dev server** — a
  green suite that proves nothing about what ships. Exactly the class the
  e2e-stub lock names, one level up: not a stub agreeing with the client, but a
  RUNTIME agreeing with the developer's machine. Dev and prod differ in
  prerendering, metadata generation, minification and error overlays — and
  metadata is precisely what N9's new assertions check.

  **CI is unaffected** (`CI=true` → `reuseExistingServer: false`), which is why
  this has survived: the signal is green everywhere it is watched.

  **Second half, found the same way:** running `next build` while a dev server
  holds the same `.next` fails with *"Invariant: Expected workStore to be
  initialized"* prerendering `/app/business/register`. It is pure concurrency —
  the identical build is green standalone — but it means a dedicated PORT alone
  does not fix this; the two processes also share `distDir`.

  **Fix (recommend the loud guard at minimum):** a `globalSetup` that fetches
  the baseURL and FAILS if the response carries dev-only markers, so the run
  stops instead of lying. A fuller fix moves the harness to its own port **and**
  its own `distDir` so `npm run dev` and `npm run test:e2e` can coexist. Until
  either lands, the workaround is documented here: **stop the dev server before
  running e2e locally**, or drive a production build on another port (what this
  audit did — a throwaway config, deleted after the run).

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

## Execution plan — everything remaining, ordered (2026-08-02)

The ordering principle, stated once so it can be argued with rather than
guessed at: **dispatch anything with external latency first, then repair what
is shipped and broken, then correct the docs that would misinform the next
build, then build.** Waves 1–3 are all unblocked today; waves 4+ are the
roadmap proper.

### Wave 0 — dispatch, ~30 min, zero code. Do this FIRST, always

Nothing here is work; it is unblocking. Each has days of latency, and every one
currently blocks something downstream. Sending them costs half an hour and
converts dead time into parallel time.

| Send to | What | Unblocks |
|---|---|---|
| Owner | **G1 scope question** — option 1, 2 or 3 | Search's last 3 controls. Option 1 rewrites `SortControl`/`FilterPanel` + the slice lock; option 2 is additive. The cost difference is why an agent must not pick |
| Owner | **G3** — what "Proceed to Purchase" does | One button on the Product Card (the card ships either way) |
| Owner | **PRODUCT_VISION entry for the consent gate** | The blocking modal; a new screen needs a vision append (P9.1) |
| Owner | **Terms / Privacy / Cookies copy** (launch item 11) | The launch lock. Longest lead time of anything on this list — it is writing, not code |
| Backend | **N7** — expose who has accepted what; prefer a session field over a `GET` | The consent gate entirely |
| Backend | **N5a–N5d, N6** — archive `request/`, fix the stale lock, document `legal`, make `features/README.md` an index | Every agent that follows CLAUDE.md's "read the backend contracts first" rule |
| Backend | The three G1 params · a public item read · populate `openingSummary` · stable badge TOKENS · deploy-domain CORS · redeploy `:2020` from `dev` | Already in ROADMAP § *Cross-Repo Dependencies*; re-send as one message rather than seven |

### Wave 1 — repair what is shipped and broken (1–2 commits, no gate)

- **S1–S4 + S5 + N8** — the city filter cannot work, and the offer tint renders
  unknown badge tokens raw. One context, one area of `search/model.ts`. Split
  into two commits only if the diff argues for it.
- While `/cities` is loaded, **verify the KATO↔`city`-table name overlap** that
  B3 needs. Same endpoint family; verifying it twice is waste.

### Wave 2 — cheap correctness, before it misinforms the next build

- **N2 + N1** — ~20 min. Both mislead whoever builds `catalog` next; N2 sends
  them to two backend folders that do not exist.
- **N4 + B1** — three honest placeholder pages via `EmptyState`. A seller can
  complete registration TODAY and land on a bare `<h1>`.
- **N10** — at minimum the loud `globalSetup` guard, so a local run stops
  instead of lying. Cheap, and everything after this wave is verified by e2e.
- **D-6, N3** — 3 lines and 1 line. Attach to any commit touching the area.

### Wave 3 — data completeness (unblocked, high silent cost)

- **B2 + B3** — every business onboarded through this UI ships a card with no
  contact channels and no city. Both are silent: nothing errors, the data is
  simply absent forever. B2 also starves G3.
- **B5** — the Nominatim rate-limit and silent-failure halves.

### Wave 4 — the customer path, end to end (the mission)

**`catalog` #3 → `chats` #4 → `profile` #5.** None is backend-blocked (see the
readiness table above). `catalog` first because result cards have no click
target until it lands, so UF 2.1 steps 3–4 are unreachable — that, not slice
numbering, is why it precedes `chats`.

### Wave 5 — the seller path

**`business-cabinet` #6** (carrying **B6, B7**) **→ `catalog` seller pass #7 →
`services` #8.** B6 and B7 have no payoff before the Branches tab exists, which
is exactly why they waited.

### Wave 6 — public surface

**`app/(marketing)` #9 → SEO #10.** Item 10's `robots.ts` **must**
`Disallow: /app/` explicitly rather than trust the auth gate — see the dated
correction in `ROADMAP.md`; per-route `noindex` covers only the pages that
exist today (N9).

### Wave 7 — legals and launch

The consent gate + **B4** + item 11's copy, together, once N7 lands. Owner's
sequencing (2026-08-01): legals ship last, after everything else.

**The one thing that can reorder all of this:** G1's answer. If the owner picks
option 1, search gains real client-side state and `SortControl`/`FilterPanel`
are rewritten — worth doing before `catalog` #3 embeds against them, not after.
Every other wave is independent of every gate.
