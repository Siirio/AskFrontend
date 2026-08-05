"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import { useCitySuggestions } from "../hooks";
import { Field, fieldErrorId } from "./Field";

/**
 * The city list for `deliveryCoverage: SELECTED_CITIES`.
 *
 * **Free text WITH suggestions from `GET /cities` (2026-08-05), not a closed
 * picker.** The backend accepts any non-blank string up to 120 characters
 * (`SellerOnboardingRequest`), so a closed list would refuse smaller towns it
 * would otherwise take — which is why this was plain free text originally. But
 * plain free text meant every seller typed their own spelling of the same
 * twenty cities, and "Алматы", "алматы" and "Almaty" are three different
 * strings to everything downstream.
 *
 * Suggestions resolve the common case to the canonical name while leaving the
 * uncommon one possible: the typed value is still the answer. Same shape as
 * this slice's `CategoryField` and search's `CityField` — free text with an
 * ARIA combobox over it, duplicated per D8 rather than shared, because each
 * one's data and owner differ.
 *
 * At least one entry is required (the backend's `isDeliveryCoverageValid`,
 * mirrored in model.ts).
 *
 * No visible "Add" button (2026-07-29, item 8) — Enter OR a trailing comma
 * commits the typed city as a chip and clears the box, so adding several
 * cities in a row never requires the pointer and the control has one action,
 * not two competing ones. Each chip carries its own remove button, styled
 * `.neu-row` (raised) with a leading `MapPin` — matching `BranchList`'s
 * treatment one step down, not `.neu-chip` (2026-08-05, see below).
 *
 * **The suggestion list now closes on a real outside click, not a
 * blur+timeout heuristic (2026-08-05, owner report: it "does not disappear
 * after clicking outside of it, only if I click in the bottom outside
 * space").** `onBlur` only fires for SOME outside targets — a click that
 * lands on a non-focusable element does not reliably blur the input the
 * same way across browsers, which is exactly the "sometimes it closes,
 * sometimes it doesn't" symptom. A `mousedown` listener on `document`,
 * scoped by a wrapper `ref`, closes the list on ANY click outside the field
 * — a button elsewhere on the page, another field, empty space, all count
 * identically. `onBlur` stays too, but only as the KEYBOARD path (Tab
 * away), checked via `relatedTarget`. Suggestion buttons keep their
 * `onMouseDown` + `preventDefault` (focus never leaves the input on a
 * pointer pick, so the list can stay open for a multi-add) — the document
 * listener still recognizes a click on them as "inside" via the same
 * wrapper ref.
 *
 * **Neither outside-click nor blur COMMITS the typed draft (corrected
 * 2026-08-05, same day — owner report: "if I type ANY symbol and click
 * outside of input, then this symbol appears and city like I chosen it").**
 * The first version of the outside-click/blur handlers called `commit()`
 * before closing, on the theory that a half-typed city should survive the
 * seller clicking away rather than being silently lost. In practice that
 * meant a single stray keystroke — a misclick, a character typed then
 * abandoned — got silently accepted as a confirmed city the instant focus
 * moved anywhere else, with no way to tell it apart from an intentional
 * pick. A real city is only ever added by an EXPLICIT action: Enter, a
 * trailing comma, or clicking a suggestion. Closing without one of those
 * just closes the dropdown; the draft stays in the box, unfinished and
 * uncommitted, exactly as the seller left it.
 *
 * **Clicking `Field`'s own `<label>` didn't close the list, and STAY closed
 * (2026-08-05, owner report: "click text... it still is not closing").**
 * `wrapperRef` correctly saw the label as "outside" (it sits beside our
 * content inside `Field`'s own markup, not inside it) and closed the list on
 * `mousedown` — but a `<label htmlFor>` ALSO natively refocuses its
 * associated control on `click`, which fires right after, undoing the close
 * a moment later. **First attempt widened `wrapperRef` to cover the whole
 * `Field`, label included — wrong fix, reported back immediately**: that
 * made the label "inside" so the list never closed AT ALL, which is not
 * what was asked (the label should close it, same as any other outside
 * click — it just needs to STICK). The actual fix leaves `wrapperRef`
 * scoped to input/dropdown/chips only, and separately neutralizes the
 * label's native refocus with a capture-phase `onClickCapture` on the
 * outermost wrapper: `preventDefault()` on a `LABEL` target, called during
 * capture (before the browser resolves the label's default action), cancels
 * the refocus without touching `Field` itself — every other consumer of
 * `Field` keeps normal label-click-focuses-input behaviour.
 *
 * **Arrow-key navigation (2026-08-05, owner report: "why I can't move in
 * dropdown?").** The list had `role="listbox"`/`role="option"` but nothing
 * actually moved a selection with the keyboard — a real gap, not a styling
 * one. `activeIndex` + `aria-activedescendant` is the standard ARIA combobox
 * pattern: ArrowDown/ArrowUp move a highlighted option (reusing
 * `.neu-menu-item[data-active]`, the same look `NavigationMenu`'s own active
 * state uses), Enter commits the highlighted option if one exists or the
 * typed text otherwise, Escape closes without committing. Focus never
 * leaves the input — the listbox is driven by it, not tabbed into.
 *
 * **Every commit path re-opens the list EXPLICITLY, not incidentally
 * (2026-08-05, owner report: "dropdown do not appear after adding
 * city").** `commitValue` — the one function every commit path (Enter,
 * comma, a suggestion click) funnels through — now calls `setOpen(true)`
 * itself as its last step, rather than relying on `open` having already
 * been `true` and nothing since having turned it `false`. That reasoning
 * held on paper but was fragile in practice: the moment ANY future change
 * touched `open` on a path that runs before a commit, the list would stop
 * reappearing with no obvious cause. Making the postcondition explicit
 * — "a successful commit always leaves the list ready to show the next
 * batch of suggestions" — removes the guesswork entirely.
 *
 * **Two CodeRabbit findings on the resulting PR, both accepted (2026-08-05).**
 * (1) The already-picked filter (`offered`) compared city names
 * case-SENSITIVELY, while `commitValue` normalizes an exact match only on
 * commit — an older lowercase free-text entry would not exclude the
 * canonical-case suggestion for the same city, letting a seller pick it
 * again and end up with two near-duplicate chips. Now compared
 * case-insensitively, same as the commit-time normalization. (2) Suggestion
 * buttons carried the default `tabIndex` (0), putting them in SEQUENTIAL
 * (Tab) focus despite this being an `aria-activedescendant` combobox, where
 * the input holds real DOM focus throughout and the options are meant to be
 * driven by the arrow keys alone. `tabIndex={-1}` on each option is the fix
 * — Tab now goes straight from the input to whatever follows the field, not
 * through every suggestion first.
 */
export function DeliveryCitiesField({
  id,
  cities,
  error,
  onAdd,
  onRemove,
}: {
  id: string;
  cities: string[];
  error?: string;
  onAdd: (city: string) => void;
  onRemove: (city: string) => void;
}) {
  const t = useTranslations("businessCabinet");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listId = useId();
  const { suggestions } = useCitySuggestions(draft);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Never offer a city that is already a chip — picking it would be a no-op the
  // seller cannot see the result of. Compared case-insensitively (2026-08-05,
  // CodeRabbit): `commitValue` normalizes an EXACT match on commit, but this
  // filter was still comparing case-sensitively, so an older free-text entry
  // like "алматы" (added before the canonical "Алматы" suggestion happened to
  // surface, or from a seller who just typed it lowercase) would not exclude
  // the canonical spelling from the list — letting the seller pick it too and
  // end up with two near-duplicate chips for the same city.
  const pickedLower = new Set(cities.map((c) => c.toLowerCase()));
  const offered = suggestions.filter(
    (c) => !pickedLower.has(c.name.toLowerCase()),
  );
  const listShown = open && offered.length > 0;
  const optionId = (index: number) => `${listId}-option-${index}`;

  // Takes the value explicitly rather than closing over `draft` — the comma
  // path in onChange needs to commit the SLICED value in the same tick it
  // computes it, before the state update carrying it has committed.
  //
  // **Silently normalizes an exact spelling/case variant to the canonical
  // name (2026-08-05, owner decision).** Picking a suggestion always saved
  // the canonical spelling, but typing the same city and pressing Enter did
  // not — "шымкент" and "Шымкент" landed as two different strings, which is
  // precisely the "Алматы"/"алматы"/"Almaty" problem this suggestion list
  // exists to close. `suggestions` (not the narrower `offered`, which also
  // drops already-picked cities — irrelevant here) is searched for an EXACT
  // case-insensitive match; only that swap happens. A city with NO
  // canonical match — a smaller town the backend's ~23-row table does not
  // carry — still saves exactly as typed. Free text stays a first-class
  // outcome (this component's own header comment); this closes the
  // accidental-duplicate-spelling gap without reopening that decision.
  const commitValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const canonical = suggestions.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    onAdd(canonical ? canonical.name : trimmed);
    setDraft("");
    setActiveIndex(null);
    // Explicit postcondition, not an assumption that `open` is already
    // true and nothing turned it off in between — see the header comment.
    setOpen(true);
  };
  const commit = () => commitValue(draft);

  // Closes on any REAL outside click — another field, a button elsewhere on
  // the page, empty space, all count the same way — WITHOUT committing
  // whatever is still typed (see the header comment: a stray keystroke must
  // never become a confirmed city just because focus moved). Only listens
  // while open, so a click anywhere is free the rest of the time.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Keeps the arrow-key-highlighted option inside the scrollable list —
  // without this, navigating past the visible ~4 rows (the list caps at
  // `max-h-56`) moves the highlight somewhere the seller cannot see.
  useEffect(() => {
    if (activeIndex === null) return;
    optionRefs.current[optionId(activeIndex)]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  return (
    // Guards against the browser's native label→input focus-proxy, which is
    // what actually caused the "click text, still not closing" symptom (see
    // the header comment) — a click on `Field`'s `<label>` bubbles here
    // BEFORE the browser resolves its default action, and `preventDefault`
    // on ANY listener during that dispatch cancels it. Capture phase, not
    // bubble, so it runs before anything else sees the event.
    <div
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).tagName === "LABEL") {
          e.preventDefault();
        }
      }}
    >
      <Field
        label={t("fields.deliveryCities")}
        htmlFor={id}
        hint={t("hints.deliveryCities")}
        error={error}
      >
        <div ref={wrapperRef} className="flex flex-col gap-2">
          {/* The dropdown's OWN positioning context, scoped to just the input
            — not the outer wrapper, which also holds the chip list once a
            city exists. `position: absolute` with no explicit `top` falls
            back to the element's static position, and in a flex column
            that fallback is NOT stable across renders: it read as
            "hovering over the input" (owner report, 2026-08-05) and — the
            same root cause — seemed to vanish right after adding a city,
            because the chip row appearing below the input changed the
            column's content and the static-position fallback shifted with
            it. `top-full` (100% of THIS smaller box, not the whole column)
            fixes the position permanently regardless of what renders below. */}
          <div className="relative">
            <Input
              id={id}
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? fieldErrorId(id) : undefined}
              placeholder={t("placeholders.deliveryCity")}
              value={draft}
              onChange={(e) => {
                // A trailing comma commits, same as Enter — the two most natural
                // ways to end a typed city name, both without touching the pointer.
                if (e.target.value.endsWith(",")) {
                  commitValue(e.target.value.slice(0, -1));
                  return;
                }
                setDraft(e.target.value);
                setOpen(true);
                // The list content is about to change (a new `offered` set for
                // the new query), so a highlight from the OLD list would point
                // at the wrong row, or none at all.
                setActiveIndex(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  if (offered.length === 0) return;
                  e.preventDefault();
                  setOpen(true);
                  setActiveIndex((i) =>
                    i === null ? 0 : Math.min(i + 1, offered.length - 1),
                  );
                } else if (e.key === "ArrowUp") {
                  if (offered.length === 0) return;
                  e.preventDefault();
                  setActiveIndex((i) =>
                    i === null ? offered.length - 1 : Math.max(i - 1, 0),
                  );
                } else if (e.key === "Enter") {
                  // The field belongs to a form; Enter must add a city, never
                  // submit the whole page. A highlighted option (arrow-key
                  // navigated) wins over the raw typed text — that is the
                  // whole point of being able to navigate to it.
                  e.preventDefault();
                  if (
                    listShown &&
                    activeIndex !== null &&
                    offered[activeIndex]
                  ) {
                    commitValue(offered[activeIndex].name);
                  } else {
                    commit();
                  }
                } else if (e.key === "Escape" && listShown) {
                  // Closes without committing — Escape backs out, it does not
                  // add whatever is half-typed.
                  e.preventDefault();
                  setOpen(false);
                  setActiveIndex(null);
                }
              }}
              onFocus={() => setOpen(true)}
              onBlur={(e) => {
                // The KEYBOARD path (Tab away) — the document mousedown listener
                // above handles every pointer-driven close. `relatedTarget` is
                // the element ABOUT to receive focus; null for a pointer-driven
                // blur where `preventDefault` kept focus from moving at all
                // (the suggestion buttons), so this never fires for that case.
                // Closes only — does NOT commit (see the header comment).
                if (
                  wrapperRef.current &&
                  !wrapperRef.current.contains(e.relatedTarget as Node | null)
                ) {
                  setOpen(false);
                }
              }}
              role="combobox"
              aria-expanded={listShown}
              aria-controls={listShown ? listId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={
                listShown && activeIndex !== null
                  ? optionId(activeIndex)
                  : undefined
              }
            />

            {listShown ? (
              // Split in two on purpose: the ROUNDED, shadowed box
              // (`.neu-card`) only clips (`overflow-hidden`), it does not
              // scroll — a scrollbar painted on the same element that also
              // carries a `border-radius` does not reliably follow the curve
              // (owner report, 2026-08-05: "scrollbar is a little bit broken
              // in border-radius"). The actual scrolling `<ul>` inside has no
              // radius of its own, so its native scrollbar draws as a plain
              // rectangle that the outer box's `overflow-hidden` then clips
              // to the rounded shape from outside.
              <div className="neu-card absolute top-full z-50 mt-1 w-full overflow-hidden">
                <ul
                  id={listId}
                  role="listbox"
                  aria-label={t("fields.deliveryCities")}
                  className="max-h-56 overflow-y-auto p-1"
                >
                  {offered.map((city, index) => (
                    <li key={city.id}>
                      <button
                        id={optionId(index)}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        data-active={index === activeIndex}
                        // Out of SEQUENTIAL (Tab) focus on purpose (2026-08-05,
                        // CodeRabbit) — this is an `aria-activedescendant`
                        // combobox (see the header comment): the input holds
                        // real DOM focus throughout, and these options are
                        // driven by ArrowUp/ArrowDown, not tabbed to
                        // individually. Leaving the default `tabIndex` (0)
                        // put them in the Tab order anyway, which both
                        // contradicts that pattern and would make a seller
                        // Tab through every suggestion before reaching
                        // whatever control comes after this field.
                        tabIndex={-1}
                        ref={(node) => {
                          optionRefs.current[optionId(index)] = node;
                        }}
                        className="neu-menu-item flex min-h-11 w-full items-center px-3 text-start text-sm focus-ring"
                        // `onMouseDown` rather than `onClick`: the input's blur fires
                        // first and would otherwise close the list before the click
                        // lands on it. `preventDefault` above keeps focus in the
                        // input — this is a multi-add, and `commitValue` itself now
                        // guarantees the list is ready to show the next batch of
                        // suggestions (its own header comment), so no special
                        // handling is needed here beyond the pick itself.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          commitValue(city.name);
                        }}
                        // Mouse and keyboard drive the SAME highlight — hovering
                        // an option while arrow-keying is common, and the two
                        // should never disagree about which row is "active".
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        {city.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* `.neu-row` (raised), not `.neu-chip` (carved) — matches
            `BranchList`'s depth one step down, so a confirmed city and a
            drafted branch read as the same KIND of thing (owner report,
            2026-08-05: "somewhere inset another where raised"). The leading
            `MapPin` is the same touch `BranchList` gained the same day. */}
          {cities.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <li key={city}>
                  <button
                    type="button"
                    className="neu-row flex min-h-11 cursor-pointer items-center gap-1.5 px-4 text-sm font-semibold text-foreground focus-ring sm:min-h-9"
                    onClick={() => onRemove(city)}
                    aria-label={t("actions.removeCity", { city })}
                  >
                    <MapPin
                      aria-hidden="true"
                      className="size-3.5 text-foreground-subtle"
                    />
                    {city}
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Field>
    </div>
  );
}
