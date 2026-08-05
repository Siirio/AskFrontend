# Business Cabinet — Screens & Flow

Traces PRODUCT_VISION **UF 3.1** (the seller is redirected to the business registration page, then works in the cabinet).

## Entry — Seller registration (BUILT 2026-07-27, owner directive)

**Screen:** `/app/business/register` → `BusinessRegisterPage` (this slice, client behind a
thin server route file, D7). It is the first code the business-cabinet slice has; the cabinet
itself is still roadmap #6.

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
| 1 | | Phone · Business email | text (`type="tel"` / `type="email"`) | **Added 2026-08-02 (AUDIT_1 B2).** OPTIONAL — an empty field is valid and is dropped from the body rather than sent as `""`. They land on the business profile and are what `SearchCardResponse.businessProfile.{number, email}` renders on every result card, so until now every business onboarded here published a card with **no way to reach it**. A filled value is format-checked client-side (the backend applies none), deliberately loosely: a typo becomes an unreachable public channel, but a strict regex rejects real addresses on a field nobody must fill. BOTH carry their own hint, each opening with "Optional" — the first cut put the hint on `phone` alone, and in a form where every other field is required, the field WITHOUT a note reads as required (owner review, same day). The two differ only in the verb (call / write), so neither is duplicated boilerplate nor depends on the other's position. Both also appear on step 5's recap showing "Not set" when blank, so a seller about to publish with no contact channel SEES that before submitting |
| 2 | `register.steps.scope` | What do you sell? | segmented (`.neu-tab-list`) | ITEM · SERVICE · BOTH. The only field with no required answer — always has a default, so this step can never block `goNext` |
| 2 | | Catalog setup | two selectable radio cards, stacked full-width | Added 2026-07-29, made fully selectable same day (locks.md Retired Locks). "Add manually" vs "Order import from Ask" (illustrative ₸ pricing, varies by scope) — both real choices; `catalogSetupMode` submits whichever is picked (contracts.md). Stacked in ONE column, not a 2-column grid (owner review, same day) — the two cards' content lengths differ too much (one line vs. reassurance + price + note) for side-by-side to look balanced. The selection dot is absolutely positioned in the card's corner, not inline beside the title — inline broke when the title wrapped |
| 3 | `register.steps.delivery` | Where do you deliver? | segmented (`.neu-tab-list`) | `NO_DELIVERY` · `SELECTED_CITIES` · `KAZAKHSTAN` · `WORLDWIDE`. `deliveryCoverage` is `@NotNull` on the backend, so this is not optional (see contracts.md) |
| 3 | | ↳ Which cities? | free-text chip list, Enter or trailing comma | `SELECTED_CITIES` only. At least one city required — not the `/cities` picker, since the backend accepts any non-blank name. No visible "Add" button since 2026-07-29 (Enter/comma commits). **2026-08-05:** `GET /cities` now backs an ARIA-combobox suggestion list over the free text (`DeliveryCitiesField.tsx`, `useCitySuggestions`) — resolves the common "Алматы"/"алматы"/"Almaty" spelling drift to the canonical name while an uncommon town is still typeable. Also fixed the same day: the input and the chip row shared one unspaced flex container. **The open/close mechanism was rewritten later the same day** — see the dedicated note below (blur+timeout replaced by a real outside-click listener; the earlier "timeout held in a ref" fix described here is superseded, not current) |
| 3 | | Only online — no physical branch | full-width toggle row (`ToggleRow`, switch indicator) | Added 2026-07-29, UI-only (not a backend field); redesigned same day from a small chip to a full-width row with icon + switch. Forces `pickupAvailable: false` and hides the branch section (required, not cosmetic — `pickupAvailable` is sent to the backend as-is, and an online-only business submitting `true` would be a lie on the wire). No longer empties drafted branches (2026-08-05) — see the PickUp row below, same fix, same reasoning. **Same-day follow-up: unchecking it now RESTORES the pickup answer from before it was forced to false**, instead of resetting to unanswered. The reset-to-null half of the original fix was itself indistinguishable from the delete it replaced — branches survived in state, but the branch list is gated on `pickupAvailable === true`, so it stayed invisible until "Yes" was answered again, which read as "still wiped" when reported. A ref (`pickupAvailableBeforeOnlineOnly`, hooks.ts) remembers the answer; it does not survive a page reload, an accepted gap for the toggle-by-accident case this exists for |
| 3 | | PickUp available | segmented, Yes/No | `pickupAvailable`, `@NotNull` — always sent. Renamed from "Is pickup available?" 2026-07-29. Answering Yes opens the branch map modal. **2026-08-05: answering "No" (or toggling "online only" above) no longer deletes already-drafted branches.** Reported as one accidental click silently discarding completed branch work with no undo. The delete was never load-bearing: `toOnboardingRequest` (model.ts) already gates `pickupBranches` on `pickupAvailable && branches.length > 0`, so a branch drafted while pickup reads "No" was never going to reach the backend regardless of whether the handler also erased it from memory. Flipping back to "Yes" now restores exactly what was there. Step 5's branch recap gates on the same `pickupAvailable` condition, so a preserved-but-currently-inactive draft never shows there as if it will be submitted |
| 3 | | ↳ Branch map picker | Leaflet/OpenStreetMap modal | Added 2026-07-29 (`BranchMapModal.tsx`) — OSM tiles, Nominatim search/reverse-geocode (both free, keyless, contracts.md). Drafts `DraftBranch[]` (name, address, address details, lat/lng); every drafted branch travels inline as `SellerOnboardingRequest.pickupBranches` on submit (backend commit `9a90f5c` — created atomically with the business, not a follow-up `api.createBranch` call). **Current shape (last revised 2026-08-05):** name → KATO cascade (`@/shared/ui/address-select`: oblast/republican city → district → settlement) → ONE address field that is both the submitted street line and a live Nominatim search (typing it moves the pin to the top match and offers a dropdown of the others; dropping/dragging the pin reverse-geocodes back into the field) → map → customer details. The registry levels and the street line compose into the DTO's single `address` string, widest first (`formatKzAddress`); "Add branch" requires a completed place. Both sync directions and the search debounce live in `useBranchLocation` (`hooks.ts`, §3), not the component. Closing the modal by ANY means — the X, Escape, "Done", or clicking outside — never discards the draft; only a successful "Add branch" does (`resetDraft` runs nowhere else). Reopening after a same-session close resumes exactly where it was left. **Survives a page reload OR a same-session close, fully, including the KATO place (2026-08-05, final pass).** `name`, address details, the street text, the pin AND the KATO place all persist to `localStorage` (`useSellerOnboarding`'s own draft does the same for the rest of the wizard) and hydrate via a `useEffect` — not a `useState` lazy initializer, because this route is server-rendered and an initializer reading `localStorage` would run during SSR too and silently lose to the client's own hydration pass. Restoring the place required `@/shared/ui/address-select` to grow a seed-once `value` prop — it resolves the remembered region/district/settlement back into real `KatoItem`s on mount (awaiting the async locality chunk for the oblast path), which is a real, if narrow, controlled-value exception carved into an otherwise-uncontrolled shared component; see that file's own header comment for the full reasoning and the guard that stops a slow chunk load from resurrecting a stale pick after the seller has moved on. `next.config.ts`'s `reactStrictMode: false` (also 2026-08-05) was a NECESSARY companion fix, not a separate feature: `react-leaflet`'s map crashed on Strict Mode's dev-only double-mount and Next recovered with a full page reload, which looked identical to a data-loss bug and very nearly was diagnosed as one for several rounds. *(Revision history compressed 2026-08-05 — six user-reported passes in total: two-way address/pin sync landed with the merge into one field; three rounds closed "closing or reloading loses the draft" for everything EXCEPT the KATO place; the Strict Mode crash was found and fixed; this final pass closed the place itself.)* |
| 4 | `register.steps.links` | Verification sources | icon-card grid (`VerificationSources`), checkbox indicator | Moved off step 1 onto its own page 2026-07-29; redesigned same day from a flat chip row to a responsive grid of icon cards (item 5 revision) and the page-level duplicate intro paragraph removed. Only reached when `legalForm: NONE` — SKIPPED otherwise (`stepIsSkippable`). **Progressive**: pick WHICH platforms, then fill only those. At least one valid `http(s)` link required |
| 5 | `register.steps.review` | Review & confirm | read-only recap + `ToggleRow` (checkbox indicator) | Added 2026-07-29. Recaps every field from steps 1–4 (including the catalog-setup choice); "I confirm this information is accurate" is required (`agreementConfirmed`, UI-only) and gates the submit button, which lives on this page. Uses the same `ToggleRow` component as step 3's online-only toggle (D8, two consumers) — both were originally a small chip, redesigned same day to a full-width row. **2026-08-05 (user: "make it more detailed"): the verification links and the branch list stopped being counts.** "Where do you already sell or publish?" listed "1 link" with no way to see WHICH link without going back; it now lists each filled source's platform name (`sources.{key}`) and its actual URL. "Branches added" listed a bare number; it now renders the same `BranchList` the map modal and step 3's summary already use, name + composed address + details-for-customers, read-only — `onRemove` on `BranchList` is now OPTIONAL (omitted here) rather than the review page passing one that does nothing, since step 5 is explicitly not an editing surface (its own header comment: "Back" through the earlier steps is the correction path) |

Steps are separated by `.neu-rule` (the skin's depth-based divider, D25) rather than a
bordered card-within-a-card — a hairline would read as a second, competing edge on this
surface. Each step lives in its own component (`RegisterStepIdentity` / `RegisterStepScope` /
`RegisterStepDelivery` / `RegisterStepLinks` / `RegisterStepReview`) purely to hold the
400-line lock, not because the steps share nothing — they all read/write the one
`SellerOnboardingValues` the hook owns. `BranchMapModal.tsx` and `BranchList.tsx` are shared
UI, not steps of their own.

**A drafted branch can now be EDITED, not just added or removed (2026-08-05, item 11,
owner request).** `BranchList` gained a `Pencil` action (alongside the existing remove `X`,
optional the same way) that opens the SAME `BranchMapModal` pre-filled, rather than a second
form — reuse over a parallel "edit branch" screen (D8). Three pieces made this possible:

- **`DraftBranch` grew a `place: KzPlace | null` field.** Without it, an edit could only
  restore the composed `address` STRING, not the oblast/district/settlement cascade that
  produced it — `formatKzAddress` composes one way and is not reliably reversible in
  general. `place` is UI-only, explicitly excluded from `toOnboardingRequest`'s
  `pickupBranches` mapping (which already picks fields by name, never spreads), so it never
  reaches the wire. A branch drafted before this field existed (a stale `localStorage` draft)
  has `place: null` and still edits, just without the cascade pre-filled.
- **`useBranchLocation` gained `load(branch)`**, the edit counterpart to `reset()`. The one
  non-trivial part: `branch.address` is the FULLY COMPOSED line, but the hook's own `address`
  state holds only the street portion (the cascade supplies the rest). `load` recomputes
  `formatKzAddress(place)` with no street and strips that exact prefix off `branch.address` to
  recover just the street text — reliable because compose order is fixed, and it falls back to
  the full string (imperfect, not destructive) when there is no `place` to compute a prefix
  from.
- **`BranchMapModal` takes `editingBranch` and `onUpdate`.** Opening with a non-null
  `editingBranch` seeds every field (including a forced `AddressSelect` remount via the
  existing `placeKey`, so the seeded `value` prop actually takes) and swaps the submit button's
  label ("Save changes" vs "Add branch") and target callback. **Closing without saving DISCARDS
  the in-progress edit** — deliberately the opposite of add mode, which preserves an
  in-progress draft across a close on purpose (documented below). Without this asymmetry,
  cancelling an edit and then clicking "Add another branch" would open on the half-edited
  fields instead of an empty form. **A successful edit CLOSES the modal**; a successful add
  does not — editing one specific branch is a complete, single action, not the start of a
  multi-add spree the way drafting several new branches in a row is.

**A real, pre-existing race surfaced by this feature (2026-08-05, owner report: "why in
editing there is no autosaved data of location/address?" — fields were empty immediately on
opening Edit for any branch outside Almaty/Astana/Shymkent).** `AddressSelect` resolves a
seeded value in TWO passes (its own header comment) — the region synchronously, the
district/settlement only once an async KATO locality chunk lands, true for every region
except the three republican cities, which resolve fully in one synchronous pass. In between,
it re-emits a PARTIAL place (region only, `complete: false`) whose key does not match the
branch's original key. `useBranchLocation.setPlace`'s existing reset-on-key-change guard
(added 2026-07-31 for the real case of a seller picking a genuinely different place) could not
tell that apart from a real change, and wiped the position/address `load()` had just seeded —
for the SAME reason a page reload's hydration could theoretically have lost them too, though
that path was likely never exercised against an oblast-region branch in testing (Almaty, the
default example everywhere in this codebase, is a republican city and never hits the async
gap). Fixed with `seedTargetKeyRef`: while a seed (reload hydration or edit `load()`) is
resolving, a same-REGION re-emission is recognized as the seed continuing rather than the
seller changing anything, since region is fixed by pass 1 and never changes mid-seed. Full
mechanics in `setPlace`'s own comment (hooks.ts).

**Header spacing increased, mobile only (2026-08-05, owner: "put the title a little below /
add space between top and content").** The page's outer wrapper went from `py-8 sm:py-12` to
`pt-18 pb-10 sm:py-12` — the icon badge and `register.title` sat almost flush against the
viewport top on a short mobile screen. **First attempt also grew the `sm:` (desktop) top
padding to `pt-20` and was corrected the same day** ("business register now has no space on
top on mobile but now got more space on desktop") — desktop's `sm:py-12` is back to exactly
its original value; only the unprefixed (mobile) top/bottom offsets changed, settling at
`pt-18`/`pb-10` (72px/40px) after two more passes (`pt-14`→`pt-16`(rejected, hides the third
legal-form option under the bottom nav)→`pt-18`; `pb-8`→`pb-10` so the card's bottom shadow
clears the fixed bottom nav with room for a thumb-safe tap zone, rather than the two edges
touching). `pt-18`/`pb-10` are NOT in Tailwind's static default spacing scale (which jumps
14→16→20) but resolve correctly here — Tailwind v4 computes any integer spacing utility as
`calc(var(--spacing) * n)` rather than requiring a `theme.extend.spacing` entry, the same
reason `h-18` already works on the topbar (above).

**Delivery-coverage control's selected state got a contrast ring (2026-08-05, "Предложения по
UI.docx" — "make the selected-state outline more contrasty").** `OptionGroup` (step 3's
`deliveryCoverage` segmented control, and every other `.neu-tab-list` consumer) relied on
`--neu-inset-sm` alone to mark the pressed-in choice; on a warm-dark surface that inset read too
close to the unselected rest state to pick out at a glance. `.neu-tab-trigger[data-active]` now
layers a `color-mix(in oklab, var(--accent) 35%, transparent)` 1px ring on top of the same inset
(`design-system/neumorphism.css`) — the same ringed-inset technique `.neu-nav-indicator` already
uses, just stronger since this control has no separate sliding pill to also signal the pick.

**Step 3 (delivery) got more breathing room, plus a divider between the delivery
answer and the online-only switch (2026-08-05, owner screenshot: "add some space
between cities, switch and branches").** The step's outer column went from `gap-5` to
`gap-8` between the delivery-coverage control, the cities field, the online-only toggle,
the pickup control and the branches block, and a `.neu-rule` divider — the same one the
wizard's own steps use between each other — now sits between the delivery-coverage/cities
answer and the online-only switch, since the two ask different questions and only the gap
separated them.

**A same-day detour tried boxing the chosen cities and drafted branches in a `.neu-card`
frame, and it was reverted.** First pass: both got a raised `.neu-card` wrapper, the
branches one with a new "Branch addresses" label. Owner feedback on the cities box:
"groups looks weird, use something creative" — diagnosed as the chip box (RAISED) sitting
directly under the input (CARVED, `.neu-input`), two opposite shapes stacked tight. Second
pass merged the input and its chips into one carved tag-input frame instead. **Final call
the same day: revert the BOXING only, keep the spacing/divider work above** — "JUST revert
my decision with groups idea, DO NOT REVERT my decision on spaces." `DeliveryCitiesField` is
back to its pre-2026-08-05 rendering (plain input + a bare wrapped row of `.neu-chip`s, no
card). Recorded so the next agent does not re-discover the same dead end: a `.neu-card` box
around the cities list was tried twice and rejected twice — the `gap-8`/divider spacing from
the same round is NOT part of that rejection and stays.

**The branches block keeps a title, "Which branches?" (`fields.branches`), added the same
day right after the boxing revert (owner: "add title for branches just like in cities like
'which branches?'").** Plain text above `BranchList`, same label typography `Field` gives
"Which cities?" (`ps-1 text-sm font-semibold text-foreground-muted`) — not wrapped in `Field`
itself, since that component's `label htmlFor` expects a single input and this is a list. No
card, matching the reverted cities section; only the label is new.

**Five more fixes, same day, from a single owner pass driving the real form (2026-08-05).**
None of these reopen the boxing question above — no `.neu-card` wrapper was re-added anywhere.

1. **The city-suggestion dropdown's open/close mechanism was rewritten entirely.** The
   blur+timeout heuristic (`onBlur` → `setTimeout(120ms)` → close+commit, cancelled by
   `onFocus`) only reliably closes for SOME outside targets — clicking a non-focusable
   element does not blur the input the same way in every case — which is exactly the
   reported symptom: "does not disappear after clicking outside of it, only if I click in
   the bottom outside space." Replaced with a `mousedown` listener on `document`, scoped by
   a wrapper `ref`: closes (and commits the typed draft) on ANY click outside the field,
   pointer-driven, no timeout, no race. `onBlur` still exists but now only handles the
   KEYBOARD path (Tab away), checked via `e.relatedTarget` rather than a delay. Suggestion
   buttons keep `onMouseDown` + `preventDefault` (focus stays in the input on a pointer
   pick, so the list can stay open for a multi-add) — the new document listener still
   recognizes a click on them as "inside" via the same ref, so picking a suggestion no
   longer races a separate close mechanism the way the timeout did.
2. **The dropdown's CSS position was a real, separate bug, reported as two symptoms that
   turned out to share one cause: "why dropdown hovers input?" and "after adding city whole
   dropdown disappears... appears only when I re-focus."** The suggestion `<ul>` was
   `position: absolute` with no explicit `top` — falling back to the element's static
   position, which is NOT stable inside a flex column: it could render overlapping the
   input, and adding a city (which inserts the chip row below the input, changing the
   column's content) could shift that fallback again, making the list look like it
   vanished even though `listShown` was still `true`. Fixed by giving the dropdown its OWN
   `relative` positioning context scoped to just the `<Input>` — not the outer wrapper,
   which also holds the chip list — with an explicit `top-full`. The outer wrapper (used
   for the outside-click `ref`) still spans the whole field, so outside-click detection is
   unaffected.
3. **City chips and branch rows now share one depth (raised `.neu-row`), and both carry a
   leading `MapPin`** (owner report: "somewhere inset another where raised... I wanna
   proper spacing and icons... to divide this whole bunch of information fields").
   `DeliveryCitiesField`'s chips moved off `.neu-chip` — confirmed, by grepping every other
   consumer, to be the wrong base class to touch globally: it also styles every trust badge
   on a result card and the empty-catalog suggestion links, so changing ITS rest-state
   depth would have reskinned unrelated, already-shipped surfaces. Restyling just this one
   consumer to `.neu-row` was the correct scope. `BranchList` gained the matching `MapPin`
   the same pass, so the two lists read as one visual vocabulary (places), not two
   unrelated components that happen to sit near each other.
4. **"Add another branch" is full width, with a leading `Plus`** (owner report: "search bar
   on whole width but button add branches is not") — was `w-fit`, floating at an odd size
   under the full-width cities field/branch list above it.
5. **Step 4 (links) gained a divider between the platform icon-grid and the URL fields**
   (owner report: "no divider between link fields and link buttons") — same `.neu-rule`,
   same gating pattern as `BranchMapModal`'s (`selected.length > 0`, since there is nothing
   to divide from until a platform is picked). `VerificationSources`'s outer column also
   grew from `gap-4` to `gap-6` (owner follow-up, same day: "divider in step 4 must be
   gap-6 not gap-4").
6. **Step 5 (review) was broken into sections, and delivery cities gained the same
   `.neu-row` + `MapPin` chip-list treatment as branches and links** (owner report: "bunch
   of informations without visual dividing/separation, branches and links raised cards but
   cities just ordinary text"). `ReviewSectionBreak` (a `.neu-rule`) now sits between the
   groups the data actually came from: identity/contact, setup, proof of trade (only when
   `needsVerification`), delivery. Full reasoning in `RegisterStepReview.tsx`'s own header
   comment.

**Two more fixes to the city-suggestion dropdown, same day, from continued testing against
the real form.** (1) **Arrow-key navigation was simply missing** ("why I can't move in
dropdown?") — the list had `role="listbox"`/`role="option"` but nothing moved a highlighted
selection with the keyboard. Added the standard ARIA combobox shape: `activeIndex` +
`aria-activedescendant`, ArrowDown/ArrowUp move the highlight (reusing
`.neu-menu-item[data-active]`), Enter commits the highlighted option when one exists (falling
back to the typed text otherwise), Escape closes without committing, and the highlighted row
scrolls into view. Focus never leaves the input — this drives the listbox, it is not tabbed
into. (2) **The scrollbar visibly broke the dropdown's rounded corner** ("scrollbar is a
little bit broken in border-radius") — a native scrollbar painted on the same element that
also carries `.neu-card`'s `border-radius` does not reliably clip to the curve. Split into two
elements: the outer `.neu-card` box only clips (`overflow-hidden`, no scroll of its own), and
an inner, unrounded `<ul>` does the actual `overflow-y-auto` scrolling — the outer box's clip
then follows the rounded shape correctly from outside.

**Typed text now silently normalizes to the canonical spelling on an exact match (2026-08-05,
owner decision, asked directly: normalize / warn / block).** Picking a suggestion always saved
the canonical name; typing the same city and pressing Enter did not — "шымкент" (typed) and
"Шымкент" (canonical) landed as two different strings, which is precisely the
"Алматы"/"алматы"/"Almaty" problem this suggestion feature exists to close, just not fully.
**Blocking free text entirely was considered and rejected** — this component's own header
comment already records why it must stay: the backend's `/cities` table is ~23 rows, and a
smaller town not on it would be refused outright by a closed picker. The fix instead searches
`suggestions` for an EXACT case-insensitive match on commit and swaps in the canonical spelling
only then; a city with no match saves exactly as typed, unchanged. Silent, not a warning —
the owner's call, on the reasoning that an exact-spelling match is unambiguous enough not to
need a confirmation step.

**Two CodeRabbit findings on the PR review, both accepted (2026-08-05).** (1) The
already-picked filter (`offered` in `DeliveryCitiesField`) compared city names
case-sensitively, while `commitValue` only normalizes an EXACT match at commit time — an
older lowercase free-text entry ("алматы") would not exclude the canonical-case suggestion
("Алматы") from the list, letting a seller pick it again and end up with two near-duplicate
chips for the same city. Now compared case-insensitively, closing the gap the commit-time
normalization left open. (2) Suggestion buttons carried the default `tabIndex` (0), putting
them in sequential (Tab) focus despite this being an `aria-activedescendant` combobox — the
input is meant to hold real DOM focus throughout, with the options driven by arrow keys alone.
`tabIndex={-1}` on each option fixes it. **A third finding, a nitpick on `next.config.ts`
suggesting the Strict Mode fix be scoped to just the map component, was deliberately NOT
applied** — the review tool does not have the context that this was already weighed and
approved by the owner: two prior rounds tried fixing the map component's own state logic
first and were wrong (`BranchMapModal` was already correct), the disable is dev-only with
zero production effect (Strict Mode never runs in production), and re-scoping would mean
re-attempting the same patch-the-symptom approach that already failed once. Reversing a
recorded, deliberate tradeoff needs a new reason, not just an automated suggestion that
cannot see the history behind it.

**One more outside-click bug, same day, that took two attempts: clicking the field's own label
didn't close the list, and stay closed** ("when I click on top space of the input/field...
dropdown is not closing"). `Field`'s label is a real `<label htmlFor>`, and clicking a label
natively refocuses its associated control — standard browser behavior. `wrapperRef` correctly
saw the label as "outside" (it sits beside our content inside `Field`'s own markup) and closed
the list on `mousedown`, but the label's native `click` handler refocuses the input right after,
undoing the close a moment later — a close-then-reopen flicker that read as "not closing."
**First attempt widened `wrapperRef` to cover the whole `Field`, label included, and was WRONG**
— reported back immediately ("nope, when I click text it still is not closing"): that made the
label "inside," so the list never closed at all, which was never the ask — the label should
close it like any other outside click, it just needs to STICK. **Actual fix:** `wrapperRef`
stayed scoped to input/dropdown/chips only, and a capture-phase `onClickCapture` on the
outermost wrapper calls `preventDefault()` specifically when the click target is a `LABEL` —
capture runs before the browser resolves the label's default action, so the refocus never
happens and `Field` itself is untouched (every other consumer keeps normal label-focuses-input
behavior).

**Two more corrections, same day, after the label-click fix ("cities input field is full of
bugs and mess... business must be registered and see that this is professional platform").**
Both were real defects, not polish:

1. **Outside-click and blur COMMITTED whatever was typed, no matter how short.** The
   original design reasoning was that a half-typed city should survive the seller clicking
   away rather than being silently lost — but in practice this meant a SINGLE stray keystroke
   (a misclick, a character typed then abandoned) was silently accepted as a confirmed city
   the instant focus moved anywhere else ("if I type ANY symbol and click outside of input,
   then this symbol appears and city like I chosen it"). There is no way to distinguish an
   accidental keystroke from an intentional one after the fact, so the fix removes the
   ambiguity at the source: a city is added ONLY by an explicit action — Enter, a trailing
   comma, or clicking a suggestion. Outside-click and blur now only close the dropdown; the
   draft stays in the box exactly as typed, uncommitted, ready to finish or abandon.
2. **The dropdown did not reliably reopen after adding a city** ("dropdown do not appear
   after adding city"). The previous design relied on `open` already being `true` from
   earlier typing and nothing since having turned it `false` — true on paper, but an
   IMPLICIT postcondition that any future change touching `open` on a path before a commit
   could silently break, with no obvious cause when it did. `commitValue` — the one function
   every commit path (Enter, comma, a suggestion pick) now funnels through — calls
   `setOpen(true)` itself as an explicit last step, so "a successful commit leaves the list
   ready to show the next batch of suggestions" is guaranteed by the code, not assumed from
   it.

**A divider now separates "Add branch" from the drafted-branch list below it
(2026-08-05, owner screenshot).** `BranchMapModal` stacked the button directly above
`BranchList` with only the flex column's `gap-4` between them, which read as one
undifferentiated block once branches existed. The same `.neu-rule` used between the wizard's
own steps now sits between them, gated on `branches.length > 0` — `BranchList` itself renders
`null` when empty, so an unconditional rule would have drawn a line above nothing.

**The whole wizard survives a reload (2026-08-05, user: losing everything on step 1 after
completing all 4 pages "just to verify").** `useSellerOnboarding`'s `values` and `step` persist
to `localStorage` through the ONE storage door (`shared/api/storage`, P5.2) on every change, and
hydrate from it on mount — a lazy `useState(() => …)` initializer, so the read happens once, not
every render. `errors`/`formError`/`pending`/`result` are deliberately NOT persisted — they
describe one in-flight attempt and would look like a stale failure resurrecting on a fresh load.
The draft is removed the moment `onboardSeller` succeeds, so a completed registration cannot
resurrect and offer to re-create the business on the next visit to this route. Key:
`ask.businessOnboardingDraft` (hooks.ts).

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
added for this) is part of the flow, not a nicety. It refreshes the ROLE and nothing else — the
landing is `POST_ONBOARDING_PATH` (`/app/business`, D26), decided here rather than read off the
session, which answers Home for every account (see contracts.md).

**Already a seller → straight to the cabinet.** The backend's own UX contract says so
("existing business members go to their cabinet instead of seeing another create-business
entry"), and a second POST would create a second business.

**Deliberately absent.** `countryCode` is fixed to `KZ` (the legal forms on offer are
Kazakhstan's; a one-option country picker is a dead control, and a second market is gate G4).
`phone` / `corporateEmail` are optional backend fields with no vision entry (P9.1). The
managed-import SCOPING/PRICING dialog (roadmap #7) does not exist — but `catalogSetupMode`
itself is no longer restricted (reversed 2026-07-29, see locks.md's Retired Locks): step 2's two
cards are both real, selectable choices, and whichever is picked is what gets submitted.

**Branch creation is real during registration too (2026-07-29), not exclusive to the Branches
tab.** Step 3's map picker drafts branches manually, one at a time, then submits all of them
inline with the onboarding request (see the step table above and the submit note). This is
still manual creation, not the bulk IMPORT this doc's "Hard rules" forbids below — the atomic
submit is a transaction-boundary detail, not a bulk-upload mechanism.

## Entry — after registration
Seller registration → the cabinet (`POST_ONBOARDING_PATH` = `/app/business`, D26). The landing
TAB is the cabinet's own default, decided when the shell is built (roadmap #6); `startRoute`
never named a tab — `OWNER_BRANCHES` / `BRANCH_WORKSPACE` were auth-session values the vision
says must never fire, and they were deleted 2026-08-01 (see auth `contracts.md`).

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

## Route placeholder — until this slice lands (2026-08-02)

`/app/business` is LIVE and reachable today, so it states plainly that the section is
not open rather than looking unfinished: the shared `EmptyState` primitive via
`app/_components/SectionNotOpen.tsx`, with copy in ru/kk/en. It used to render a
bare `<h1>` plus "Section under construction" inside a neumorphic product, which
reads as a broken build rather than as a message (AUDIT_2 N4 / AUDIT_1 B1).

This is the second of the three endings the "a reachable control must DO
something" lock allows — build it, say plainly it is not open, or stop offering
the control. Not invented UI (P9.1): it is the mandatory empty state P9.3
requires of a surface that exists with no content.

A seller lands here the moment registration completes (`POST_ONBOARDING_PATH`), so this was the first thing a new seller saw.

Verified in a browser, light and dark, against a production build.
