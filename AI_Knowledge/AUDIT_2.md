# AUDIT_2 — the open work queue

Status: **working document** (2026-08-01). Written as a HANDOFF: everything a
fresh session needs to continue without re-deriving it. AUDIT_1 stays where it
is — it is the historical record of that pass and its corrections. This file is
the queue.

**Verification basis — HISTORICAL, describing `83549fa` (2026-08-01).** *For the
live figures read § Status VERIFIED AT COMMIT below; the `104/104` here is the
count on the day this file opened, not today's.* Backend read directly from
`../Ask_Backend` @ `dev` `cdc47dc` — Java controllers and DTOs, never the
backend's prose docs (the e2e-stub lock's rule, applied to audits). Everything
marked open below was re-checked against source on 2026-08-01, not recalled.

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

## ⚠ 2026-08-02, SECOND PASS — backend moved to `b02105a`; G1 and G3 re-checked

*(Read this before the `d00f96b` stamp below. That stamp is still accurate about the FRONTEND;
what changed underneath it is the BACKEND, which every gate on this page depends on.)*

The backend advanced **two commits past `cdc47dc`**, the basis both audits were written
against: **`098fd44`** *"Document purchase destination ownership"* and **`b02105a`** *"Add
catalog image galleries and release workflow"*. Every G1 and G3 blocker was re-read from Java
source at `b02105a`. **The headline: neither gate is unblocked, and it is not close.**

| Blocker | Expected home | State at `b02105a` |
|---|---|---|
| `MAX_CANDIDATES` | `StructuredSearchProcessor:53` | **Still `200`.** Unchanged |
| `page` ceiling | `SearchRequest` | **Still `@Max(20)`.** Unchanged |
| Unique-Offers sort | `SearchRequest.sort` regex | **Absent.** Still `relevance\|distance\|price_asc\|lowest_price` |
| Companies filter · map-area bbox | `SearchFilterRequest` | **Absent.** Still the same 7 fields |
| Backend's `Results Filter & Sort V1` lock | backend `search/locks.md` | **Still there, verbatim.** Our raise to retire it was not actioned |
| `deepLink` as a collection | `Item.java:63` | **Still a single `String`** |
| `deepLink` on `Service` | `offer/service` | **Still zero hits** |
| Purchase destinations in the search projection | `SearchCardResponse` | **Absent** |

**G3's product question is now CLOSED on both sides, and that is the real news.** `098fd44` is
documentation-only, and it writes the owner's 2026-08-02 answer into the backend's own
authorities almost word for word: `ProductVision.md` gains *"An Item or Service may publish
multiple labeled customer purchase destinations. These destinations belong to that Item or
Service, never to a branch"*, and `item/locks.md` + `service/locks.md` each gain **two** locks —
one placing destinations on the entity rather than the branch, one forbidding verification and
moderation links from ever being reused as a purchase destination. Both were exactly our raise.
The backend's `item/contracts.md` then states the build order itself: *"The current singular
`deepLink` field must be replaced or migrated before this target contract is exposed"* and
*"Public search must expose the Item purchase destinations before the customer-facing `Proceed
to Purchase` action is rendered."*

So **G3 changed category, not status**: it was *blocked on a product answer AND on backend code*;
it is now *blocked on backend code only*. Nothing is owed by the owner, nothing is owed by us,
and there is nothing left to ask — the raise is agreed and queued. **G1 did not move at all.**

### What DID ship, and it is not nothing: catalog image galleries

`b02105a` added `images` to `SearchCardResponse` (`List<CatalogImageResponse>` = `{id, url}`),
populated it in `toCard()`, and added a gallery-sync endpoint to items and services. The
backend developer confirmed the intent directly (2026-08-02): *"Для услуг и товаров до 3
картинок загружать."* `CatalogImageLayout.MAX_IMAGES = 3` matches. Recorded as **N11** (the
field) and **N12** (the presentation contract shipped alongside it, which is a product question,
not a data one).

## Status VERIFIED AT COMMIT `d00f96b` — a measurement, not a standing claim

*(Deliberately not headed "current". A verification result is true of the commit
it was run against and of nothing else; the next code commit invalidates it
silently. Trust the commit hash, not the heading — and if `HEAD` is not
`d00f96b` or a docs-only descendant of it, re-run rather than reading on.)*

**Closed since the snapshot:**

- **N9** (`8e41a30`) — both auth routes `noindex`; the false `/app/*`
  crawlability premise corrected in three places; two e2e assertions. With it,
  `auth` meets all 8 DONE criteria.
- **N1 (the `src/` half), N2, D-5 residual, D-6, N10** — the 2026-08-02
  housekeeping pass. `src/`'s 9 stale roadmap numbers corrected by hand against
  the verified table (comments only — the diff was checked to contain no code);
  catalog's README no longer points at two backend folders that do not exist;
  `prettier` + `prettier-plugin-tailwindcss` pinned exactly, so "formatted" stops
  being a moving target on a CI-gated check; `pinLocale` lifted to
  `e2e/helpers.ts` and both specs derive the origin from `baseURL`; a
  `globalSetup` now **fails** the run when the harness is attached to a dev
  server. **N1's `AI_Knowledge/` half (29 sites) is still open.**

- **S1–S4, S5, N8** (`fc5c6b0`) — the city filter works on the wire, and the
  Unique-Offer tint reads `hasActiveOffer` instead of guessing from badge text.
- **N4, and B1's placeholder half** (`97bbc7b`) — `/app/chats`, `/app/profile`,
  `/app/business` and `/app/product/:id` now say plainly they are not open, via
  the shared `EmptyState`. **B1's cabinet SHELL is still roadmap #6.**
- **B2** (`6f1247a`, refined by `d00f96b`) — `phone` and `corporateEmail` are
  collected at registration, so a business stops publishing a card with no way
  to reach it.

**Everything else on this page is OPEN**, including the corrected **N3** — see
its entry: acting on N3 as written would have made the toast inconsistent
rather than consistent.

**What was actually run, at `d00f96b`:** `npm run build` green end to end (lint →
boundary fixtures → token drift → tsc → next build → rendering contract);
`format:check` clean repo-wide; e2e **120/120** on `chromium` and
`mobile-chromium` against a real `next build && next start`. Both UI changes were
additionally driven in a browser in light and dark with ru copy.

**This paragraph said "commits after `b5138b9` are documentation only" until
2026-08-02, by which point FIVE commits had changed code.** It is recorded rather
than quietly overwritten, because it is the same failure the heading above warns
about, committed by the person who wrote the warning: a status line ages the
moment the next commit lands, and nothing enforces it. If you are reading this at
a later `HEAD`, re-run — do not trust the figures.

**The e2e figure required working around N10:** a dev server owned `:3000`, so
the run was driven on `:3100`; a plain `npm run test:e2e` would have tested the
dev server instead. **That workaround cost real time twice** — it produced this
file's retracted D-6 "confirmation", and later made `business-register.spec.ts`
fail 14/14 against a hand-started server that was serving a build from a
different moment. Letting Playwright own the build and both servers gives
120/120. A workaround changes the conditions of the experiment; anything
concluded under it has to be re-derived, not assumed.

**How to use this file:** same rule as AUDIT_1 and the Changelog — when an item
is fixed, mark it `[x]` with the date and what the change did. Do NOT delete it.
When every item is resolved, fold the summary into `Changelog.md` and retire the
file.

---

## Read this first — four lessons that cost real work

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
4. **A prediction plus a green run is NOT confirmation. Check the mechanism.**
   *(Added 2026-08-02, and this one was committed BY an audit pass, not found by
   it — see the retraction under **D-6**.)* D-6 predicted that a hardcoded
   `localhost:3000` cookie URL would be dropped "when the harness runs on another
   port". The suite was then run on `:3100`, everything passed, and that was
   written up as the prediction coming true. It was the opposite: **cookies are
   scoped by host, not port** (RFC 6265), so the pin applied normally — provable
   from the same run, because `search.spec.ts` asserts English copy against a
   `kk` default and those assertions passed. Two plausible stories fit "it
   passed"; only reading the mechanism separates them. Lesson 1 says an unchecked
   box is not evidence — this is its twin: **a green run is not evidence for
   whichever explanation you already had in mind.**

---

## Slice status

| Slice | Status | What exists |
|---|---|---|
| **auth** | ✅ **DONE** | Full anatomy; login / register / verify / Google OAuth + consent / guards / role modal. All of AUDIT_1 A1–A9 closed except A1's persistence half, which the owner deferred (below). **All 8 DONE criteria pass as of 2026-08-02** — anatomy, thin routes + D7 split, zero hardcoded copy, the four states, docs, build/lint, 476-line e2e, and criterion 8 once **N9** closed. Two carve-outs remain DECIDED-not-missing, neither buildable here: A1's consent gate (blocked on N7 — the backend exposes no read) and the launch lock on placeholder legal copy (owner-authored, item 11) |
| **search** | 🟡 **ALMOST** | Home + Catalog Page ship; the city filter WORKS as of 2026-08-02 (S1–S4) and the offer tint reads `hasActiveOffer` (S5/N8). What is left is not a defect: the 3 controls parked by G1, now waiting on server params, plus infinite scroll blocked by `MAX_CANDIDATES` |
| **business-cabinet** | 🟠 **~25%** | Seller-registration wizard only, now collecting contact channels (B2 closed 2026-08-02). `/app/business` says plainly it is not open (B1 placeholder half closed); the cabinet shell itself is roadmap #6 |
| **catalog** | ⬜ **EMPTY** | Docs only. **Next up — roadmap #3** |
| **chats** | ⬜ **EMPTY** | Docs only; `/app/chats` states plainly it is not open (N4 closed 2026-08-02) |
| **profile** | ⬜ **EMPTY** | Docs only; reached from the account menu's Settings, and says plainly it is not open (N4 closed) |
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
| ~~**G1 scope question**~~ | — | **ANSWERED 2026-08-02 (owner): server-side always + infinite scroll.** Stricter than option 2, the opposite of option 1; our slice lock is reaffirmed, not rewritten. **No longer owner-blocked — now BACKEND-blocked**, and harder than before: `MAX_CANDIDATES = 200` caps any query at ~200 results, and the three parked controls now REQUIRE server params because a client-side layer is forbidden |
| ~~**G3** — what "Proceed to Purchase" does~~ | — | **ANSWERED 2026-08-02 (owner): deeplinks → chooser modal when several → in-app chat with an editable, never-auto-sent draft when none.** Verification links are never reused. **Now BACKEND-blocked:** `deepLink` is a single `String` on `Item`, absent from `Service`, and missing from the search projection |
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

- [x] **S1–S4 — the city filter cannot work.** `CityController.listAll()` takes
  no params and returns `CityDto {id, name}`; `resolve` requires `name`, not
  `lat`/`lng`. `search/model.ts:129-135` invents `CitySuggestion {city}` and
  `CityResolveResponse {city}`; `CityField.tsx` renders blank rows with
  `undefined` keys. `search/api.ts:41` `resolveCity()` is dead and would 400.
  `features/search/contracts.md:132` still describes it as "Resolve a city from
  coordinates". No e2e touches `/cities`. **One commit: read `CityDto`, fix the
  field, delete or rewire `resolveCity`, correct contracts.md, add a stub built
  from the Java DTO.**
- [x] **S5 — three `SearchCardResponse` fields are unmodelled:** `hasActiveOffer`,
  `latitude`, `longitude` (0 hits in `search/model.ts`). `hasActiveOffer` is
  load-bearing — the TINT IS INFORMATION lock is currently served by inferring
  the offer from a free-text badge instead of the boolean the backend sends.
- [ ] **S6 — G1 is open** (see the owner table).
- [x] **B1 — the cabinet behind registration is a placeholder, and it is LIVE.** *(The PLACEHOLDER half closed 2026-08-02 — the page is now honest via EmptyState. Building the cabinet shell itself is still roadmap #6.)*
  `/app/business` renders `<main><h1>Business cabinet</h1><p>Section under
  construction</p></main>` — bare HTML, no token, no `.neu-*`, no `EmptyState`.
  Reached two ways: completing registration (`POST_ONBOARDING_PATH`) and the nav
  Dashboard link. **B1's own "Corrected 2026-08-01" note is STALE** — it says a
  seller never reaches this page, which was true only in the window before
  onboarding routing was fixed. Fix by building the shell (#6) or by making the
  page honest (see N4 — same fix, three routes).
- [x] **B2 — `phone`/`corporateEmail` never collected.** Both land directly on the
  business profile, which is what `SearchCardResponse.businessProfile.{number,
  email}` surfaces on every card. Every business onboarded through this UI ships
  a card with no contact channels. Also starves **G3**.
- [x] **B3 — `cityId` never sent on drafted branches** → `branch_city` null →
  invisible to the city filter. The bridge was to be `GET /cities/resolve?name=`.
  **→ VERIFICATION DONE 2026-08-02, and it REFUTES the plan: the overlap is 0 of 11 954
  KATO names against all 23 seeded cities, in both languages.** The call would 404 every
  time. Re-filed as a backend dependency (resolve by KATO code); `cityId` stays honestly
  unset meanwhile. See the N-section entry above and
  `features/business-cabinet/contracts.md` § *B3*. **This item is closed as an
  INVESTIGATION, not as a shipped fix** — the gap it describes is real and still open,
  it simply is not ours to close.
- [ ] **B4 — `SELLER_TERMS`/`PERSONAL_DATA_CONSENT` never recorded.** Step 5's
  checkbox gates the form and posts nothing. Deferred with the legals work.
- [ ] **B5 — Nominatim called raw from the browser.** No rate-limit handling,
  failures swallowed. Reduced by D30 (KATO supplies the administrative levels) —
  the rate-limit and silent-failure halves are untouched.
- [ ] **B6 — `CreateBranchRequest` incomplete:** `timeZoneId`, `weeklyHours`,
  `specialHours` absent from `model.ts`. Build with the Branches tab (#6) — the
  backend never populates `openingSummary` either, so there is no payoff before.
- [ ] **B7 — `createBranch()` is dead code** (`api.ts:75`), waiting on #6.
- [x] **D-5 residual — `prettier` and `prettier-plugin-tailwindcss` are still on
  caret ranges.** The reformat (`5b5a955`) closed the drift; it did not close the
  CAUSE, which is D-5's own last sentence: a `^` range on a FORMATTER makes
  "formatted" a moving target, and CI gates `format:check` (D15). The next minor
  release of either package can turn the build red on files nobody touched —
  which is exactly how the original 10-file drift appeared. Pin both exactly.
  Carried here so closing D-5 in `AUDIT_1.md` does not retire the finding that
  records it.
- [x] **D-6 — `e2e/search.spec.ts:41` hardcodes `http://localhost:3000`** in its
  `addCookies` locale pin; silently dropped on any other origin, and the test
  then passes while asserting the default locale. **Its stated blocker is gone**
  (D-5 is fixed), so this is now a 3-line change: lift `pinLocale` out of
  `business-register.spec.ts:169` into a shared e2e helper.
  **RETRACTED 2026-08-02 — an earlier note here claimed the `:3100` run
  "CONFIRMED IN THE WILD" that the pin silently did nothing. That was WRONG, and
  the run proves the OPPOSITE.** Cookies are keyed on host, **not port**
  (RFC 6265 — the port is not part of a cookie's scope), so a cookie set with
  `url: "http://localhost:3000"` applies perfectly well to a page served on
  `localhost:3100`. The proof is in the suite that was cited as evidence:
  `search.spec.ts` pins `ask.locale=en` and then asserts the ENGLISH strings
  `"Enter what you're looking for."` (`:75`, `:91`) and a button named
  `"Search"` (`:59`, `:73`) — while the product's default locale is `kk`. Those
  assertions **passed** on `:3100`, which is only possible if the pin APPLIED.
  Had it been dropped, they would have failed against Kazakh copy.
  **What survives, and why this stays open.** The finding is real but NARROWER
  than written: a hardcoded `http://localhost:3000` breaks on a different
  **HOST**, not a different port — a preview deploy, or CI on any non-`localhost`
  origin. The original entry's own example ("a different port when 3000 is
  taken") is therefore the one case that does NOT break, and the AUDIT_1 text
  still says it. The fix is unchanged and still correct: lift `pinLocale`
  (`business-register.spec.ts:172`), which derives the URL from
  `test.info().project.use.baseURL` and is right on every origin.
  **The lesson is this file's own recurring one, turned on itself:** a
  prediction plus a green run was read as confirmation without checking the
  mechanism, which is exactly the "an unchecked box is not evidence" failure
  the header warns about — committed here by the audit rather than found by it.

---

## New — found 2026-08-01, not in AUDIT_1

- [x] **N6 — `POST /api/v1/legal/acceptances` is in no frontend doc.**
  **→ FIXED 2026-08-02.** `features/auth/contracts.md` now carries both `LegalController`
  endpoints as a table. They are the SAME request body and the same service call and differ
  only by the `LegalAcceptanceChannel` recorded (`WEB_REGISTRATION` vs `ACCOUNT_SETTINGS`) —
  so the endpoint is chosen by the moment, not by convenience, or the record falsifies where
  the person actually agreed. `/acceptances` has no caller yet; it is the consent gate's
  channel. Neither has a GET, which is **N7**.

- [x] **N1 — the 2026-07-28 renumbering never reached the code; ~28 sites still
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

  **→ THE `AI_Knowledge/` HALF IS NOW CLOSED TOO (2026-08-02) — 30 sites hand-checked,
  11 wrong.** The find-and-replace warning held a third time: 19 of 30 were already correct,
  so a blind pass would have corrupted the majority of what it touched. Corrected:
  `auth/contracts.md:155` (#7→#6), `auth/README.md:24` (#7→#6),
  `auth/ux-ui-flow.md:244` (#10→#9) and `:245` (#6→#5),
  `business-cabinet/contracts.md:92,139,142` (#8→#7),
  `business-cabinet/README.md:21` (#7–#9→#6–#8), `business-cabinet/ux-ui-flow.md:9` (#7→#6)
  and `:83` (#8→#7), `business-cabinet/locks.md:28` (#8→#7).
  Left alone because they are RIGHT: every `slice #1` in auth, `auth/ux-ui-flow.md:111` (#2),
  `business-cabinet/contracts.md:190` and `locks.md:16` and `ux-ui-flow.md:95` (#6, the cabinet
  itself), all four in `catalog/contracts.md` (#3 modal, #7 seller pass), `chats` (#4), and
  ROADMAP's own historical references. **N1 is fully closed** — `src/` and `AI_Knowledge/`.

  **Hand-check DONE for `src/` 2026-08-01 (second pass) — 18 sites, 9 wrong.**
  The `src/` half was a mechanical edit, no judgement left:

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
- [x] **N2 — `features/catalog/README.md:3` cites two backend folders that do not
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
  **→ HALF-WRONG, corrected 2026-08-02 before acting on it.** The raw value in a
  COMPONENT is real and still stands (P9.2 scopes the lock to `all ui/`). **The
  rest of the entry is false.** 16px is not "in no scale" and the comment does
  not assert something false — `neumorphism.css` uses a literal `16px` radius in
  three places (`:1082`, `:1112`, `:1318`), so the toast matches the skin
  exactly as its comment claims. Swapping it to `--neu-radius-lg` (18px) or
  `--neu-radius-md` (14px) would have made it the ODD ONE OUT while appearing to
  fix a violation.
  **The real finding is bigger and is a DESIGN question, not a token swap.** The
  skin declares a four-value radius scale and then ignores it: `border-radius`
  literals in `neumorphism.css` include **9, 10, 11, 16, 18 and 20px** against
  tokens of 10/14/18/24. The tokens are close to decorative for radii. Fixing
  that means deciding which surfaces share a corner and rounding the scale to
  fit — a visual change across the whole platform, so it goes through
  `platform-ui-design` and browser verification (the UI work loop), not a
  one-line edit. **Deliberately NOT bundled into the 2026-08-02 housekeeping
  commit** for that reason.
- [x] **N8 — `separateBadges` does the OPPOSITE of the lock it implements, and
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

- [x] **N10 — a local `npm run test:e2e` silently tests the DEV server, which
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

- [x] **N4 — B1 has two siblings on the CUSTOMER path.** `/app/chats` and
  `/app/profile` render the identical bare placeholder, and **Chats is a
  permanent nav destination for every user** while Settings is one tap inside the
  account menu. AUDIT_1 files only the business one. The "reachable control must
  DO something" lock permits "say plainly it is not open" — the copy does say it,
  but as three unstyled `<main><h1>` pages inside a neumorphic skin it reads as
  an unfinished build, not a message. **Cheap fix, all three at once:** the
  `EmptyState` primitive (P9.3's sanctioned pattern) with honest copy. Not
  invented UI — a "not open yet" state is what P9.3 requires of a surface that
  exists with no content.
  **→ CLOSED 2026-08-02 (`97bbc7b`), and it was FOUR pages, not three.**
  `/app/product/:id` had the same defect and is fixed with them, though its copy
  differs on purpose: the other three are "not open yet", while that deep link is
  DEFERRED for want of a public item read, so it points at the modal rather than
  promising the URL. All four share `app/_components/SectionNotOpen.tsx` over
  `EmptyState`, server-rendered, with copy in ru/kk/en. **A side effect worth
  knowing:** the pages moved their `<h1>` to `sr-only`, and an `sr-only` element
  still has a 1px box — so the smoke test's "heading is visible" assertion would
  have passed on a blank page. It now asserts the heading is attached, that
  `<main>` is visible and non-empty, and that all four render a visible
  empty-state. **B1's cabinet SHELL remains roadmap #6** — only the placeholder
  half of B1 closed here.

---

## New — found 2026-08-02 (second pass, backend `b02105a`)

- [x] **N11 — `SearchCardResponse.images` was on the wire and unmodelled.** Landed in
  `b02105a`; `toCard()` populates it via `loadImages()` from `ProductRepository` /
  `ServiceOfferingRepository`, defaulting to `List.of()`, so it is always present and never
  null. Same class as **S5** (`hasActiveOffer`/`latitude`/`longitude`) and found the same way:
  diff the Java DTO against `model.ts`.
  **→ MODELLED 2026-08-02.** `CatalogImage {id, url}` + `images: CatalogImage[]` in
  `search/model.ts`, documented in `features/search/contracts.md`, and added to the
  `e2e/mock-backend.mjs` card factory from the Java DTO (the e2e-stub lock — a stub that omits
  a live field stops mirroring the contract it claims to cover). **Deliberately NOT rendered
  — see N12.**

- [x] **N12 — the backend shipped a RESULT-PRESENTATION contract, and one line of it reverses
  the vision.** `b02105a` rewrote `Ask_Backend/AI_Knowledge/features/search/README.md`
  § *Result presentation* to describe a UI: a primary catalog image on each row, a compact
  business avatar/name, **desktop hover previewing the gallery and details in a right panel**,
  mobile tap opening the same as a modal, business-avatar and chat actions NOT opening details,
  and — the load-bearing one — ***"Match reasons remain response metadata but are not
  displayed."***

  `PRODUCT_VISION.md` has **zero** occurrences of image, photo or gallery on a result card, and
  describes no hover-preview panel. Three of the four statements are new UI and one is a
  reversal: we render `matchReasons` today as the intent layer's core "why this matched"
  signal, and `features/search/contracts.md` calls it exactly that.

  **This is the D9/P9.4 boundary in its sharpest form: the backend is the authority for DATA,
  the vision for INTENT.** A README describing how rows should look is intent, and an agent
  must not adopt it by inference — which is precisely AUDIT_2's own lesson 2 ("never infer
  product intent from the SHAPE of code"), one level up: never infer it from the other repo's
  prose either.

  **→ DECIDED 2026-08-02 (owner), and the answer SPLITS the contract.**
  1. **The primary card image is ADOPTED** — appended to `PRODUCT_VISION.md` UF 2.1 with its
     justification, dated, per the CORE-file append rule. Up to three images, first primary on
     the row, the rest belonging to the Product Card; a card with **no** image is a first-class
     state, and image presence is never a trust or quality signal (Design Locks). **Rendering is
     roadmap #3's**, not this pass's: `images` is modelled and stubbed, and no seller can upload
     one until #7/#8 ship, so every gallery is `[]` until then.
  2. **The hover-preview panel and mobile detail modal are NOT adopted** — they describe a
     different Product Card interaction model than the modal-over-catalog #3 plans.
  3. **Match reasons STAY rendered.** The owner's reasoning is the D9/P9.4 split itself: "why
     this matched" is the intent layer's core affordance, and a README in the other repo is not
     where a product affordance gets removed. **Raised back to the backend** as a documentation
     conflict (ROADMAP § *Cross-Repo Dependencies*) — recorded rather than silently ignored,
     because CLAUDE.md sends every agent to read the backend's contracts first, and the next one
     will hit the contradiction.

- [x] **N13 — every endpoint in `features/services/contracts.md` was a dead path.** All four
  read `/api/v1/business-admin/branches/{branchId}/services`. The real controller is
  `BusinessServiceController` at **`/api/v1/businesses/{businessId}/services`** — BUSINESS-scoped,
  not branch-scoped, so the error was structural rather than a typo. `business-admin` survives
  in exactly ONE place in the entire backend: `/api/v1/business-admin/chats`.
  **→ FIXED 2026-08-02** from the Java source, with the gallery-sync endpoint added.

- [x] **N14 — the cabinet's Unique Offers table was a dead path too.** All four read
  `/api/v1/business-admin/offers`. The real controller is `UniqueOfferController`, and the
  routes are **`drops`** across two prefixes: `/api/v1/businesses/{businessId}/drops` for
  list/create, `/api/v1/drops/{dropId}` for update/cover/cancel/delete. CLAUDE.md's Feature
  Index already noted "backend calls them **drops**" — the rename was known at index level and
  never reached the contracts table.
  **→ FIXED 2026-08-02.** Two behaviours worth the ink: the list GET is **public** (no
  principal, allowlisted), and `POST /drops/{dropId}/cancel` **toggles** rather than cancelling
  (`uniqueOfferProcessor.toggle`) — a one-way "Cancel" button built on its name would be wrong.

  **N13 and N14 share a cause and it is worth naming.** Both slices are unbuilt (#8 and #6), so
  nothing ever followed the path and nothing ever failed. A wrong endpoint in a doc for a slice
  that exists gets caught in an afternoon; a wrong endpoint in a doc for a slice that does not
  exist waits, and then costs whoever finally starts it. Both were found by diffing the tables
  against controllers — the only method that works before there is code. **The same sweep should
  be repeated for `chats` and `profile` before waves 4–5**, since they are unbuilt on the same
  terms; this pass verified `catalog`, `services` and `business-cabinet` only.

- [x] **B3 is ANSWERED — and the answer is that the planned fix cannot work.** Both audits
  carried it as *"verify the KATO↔`city` name overlap cross-repo first."* Done, by measurement:
  the `city` table is seeded by `V2__reference_data.sql` with **23 bare Russian names**
  (`Алматы`, `Кокшетау`, …); KATO always carries a type marker (`г. Алматы` / `Алматы қ.`).
  Across **all 11 954** KATO region/district/locality names in both languages, exact matches to
  a seeded city: **0**. Not "might miss" — `resolve?name=` would 404 on every call, for every
  seller.
  **Not closable client-side**, and the obvious two-line fix is a trap: KATO holds
  **`с. Караганда`** (a village) beside **`г. Караганда`** (the city), so prefix-stripping
  attaches the CITY's `cityId` to a rural branch — silently, and worse than the current honest
  null. Full working in `features/business-cabinet/contracts.md` § *B3*; converted to a backend
  raise (resolve by KATO **code**, or seed KATO codes onto `city`, or accept a name server-side)
  in `ROADMAP.md` § *Cross-Repo Dependencies*. **The investigation is closed; the fix is now
  someone else's and is tracked as such.**

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

> **→ WRITTEN AND READY TO SEND, 2026-08-02: `AI_Knowledge/BACKEND_RAISE_2026-08-02.md`.**
> Every backend row in this table is consolidated there as ONE message, verified item-by-item
> against `dev` `b02105a` first. **Two rows were dropped during that verification rather than
> sent:** the deploy-domain **CORS** raise (already shipped — `ask.com.kz`, `stage.ask.com.kz`
> and the Vercel host are all in `application.yml`) and G3's **product** question (answered by
> `098fd44`). Sending either would have repeated the `suggestRoleExpansion` failure this file
> records — asking for work already done. The owner rows below are separate and still owed.

Nothing here is work; it is unblocking. Each has days of latency, and every one
currently blocks something downstream. Sending them costs half an hour and
converts dead time into parallel time.

| Send to | What | Unblocks |
|---|---|---|
| ~~Owner~~ | ~~**G1 scope question**~~ | ✅ **DONE 2026-08-02** — server-side always + infinite scroll. Re-dispatch as a BACKEND item (rows below) |
| ~~Owner~~ | ~~**G3** — "Proceed to Purchase"~~ | ✅ **DONE 2026-08-02** — deeplinks → modal → chat draft. Re-dispatch as a BACKEND item (rows below) |
| **Backend** | **`MAX_CANDIDATES = 200` + `page @Max(20)`** — deep paging | **NEW, blocks G1 entirely.** Infinite scroll dies at ~200 results regardless of catalogue size |
| **Backend** | **Retire the `Results Filter & Sort V1` lock** | **NEW.** It contradicts the owner AND the backend's own `SearchFilterRequest` |
| **Backend** | **`deepLink`: collection on `Item`, add to `Service`, carry in the search projection** | **NEW, blocks G3 entirely.** Scope settled 2026-08-02: **per ITEM/SERVICE, never per branch** — label+URL pairs on the item, no branch FK. Nothing left to ask; the raise can go as written |
| Owner | **PRODUCT_VISION entry for the consent gate** | The blocking modal; a new screen needs a vision append (P9.1) |
| Owner | **Terms / Privacy / Cookies copy** (launch item 11) | The launch lock. Longest lead time of anything on this list — it is writing, not code |
| Backend | **N7** — expose who has accepted what; prefer a session field over a `GET` | The consent gate entirely |
| Backend | **N5a–N5d, N6** — archive `request/`, fix the stale lock, document `legal`, make `features/README.md` an index | Every agent that follows CLAUDE.md's "read the backend contracts first" rule |
| Backend | The three G1 params · a public item read · populate `openingSummary` · stable badge TOKENS · deploy-domain CORS · redeploy `:2020` from `dev` | Already in ROADMAP § *Cross-Repo Dependencies*; re-send as one message rather than seven |

### Waves 1–3 — ✅ DONE 2026-08-02, except four items listed below

Everything these three waves called for shipped in four commits: **S1–S4 + S5 +
N8** (`fc5c6b0`), **N1 (src) + N2 + N10 + D-6 + D-5 residual** (`3c0fc3f`),
**N4 + B1's placeholder half** (`97bbc7b`), **B2** (`6f1247a`, `d00f96b`).
Verified at `d00f96b`: build green, `format:check` clean, e2e **120/120**.

**Do NOT re-do them.** What survives from these three waves, **updated 2026-08-02 (second
pass)**:

- ~~**B3 — `cityId` on drafted branches.**~~ **INVESTIGATION CLOSED 2026-08-02 by measurement:
  the KATO↔`city` overlap is 0 of 11 954, so the planned `/cities/resolve?name=` bridge would
  404 on every call and cannot be repaired client-side without silently mis-filing rural
  branches. Now a backend dependency (resolve by KATO code).** The gap itself remains open; it
  is simply no longer ours.
- **B5 — Nominatim rate limits and silent failure.** Unblocked, unscheduled; **now the ONLY
  fully-free code item left on this page.**
- **N3 — the radius scale**, and it is NOT what the entry originally claimed —
  read its correction before touching it. Needs the design skill + browser verification, not a
  token swap.
- ~~**N1's `AI_Knowledge/` half**~~ — **CLOSED 2026-08-02**, 30 sites hand-checked, 11 wrong.
- **NEW: sweep `chats` and `profile` contracts against their controllers before wave 4.**
  N13/N14 found every endpoint wrong in two unbuilt slices' docs; those two are unbuilt on
  identical terms and were not checked this pass.

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
