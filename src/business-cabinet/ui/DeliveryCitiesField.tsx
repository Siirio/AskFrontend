"use client";

import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import { Field, fieldErrorId } from "./Field";
import { useCityComboboxField } from "./useCityComboboxField";

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
 * treatment one step down, not `.neu-chip`.
 *
 * **The combobox behaviour (suggestion filtering, keyboard nav, outside-click
 * handling, commit/normalize logic) lives in `useCityComboboxField`
 * (2026-08-06, P1.1) — this file is render-only.** That hook's own header
 * comment carries the mechanics; the two things that stay here because they
 * are DOM/JSX-level, not state logic: the label-focus-capture workaround
 * below, and the dropdown/chip markup itself.
 *
 * **Clicking `Field`'s own `<label>` didn't close the list, and STAY closed
 * (2026-08-05, owner report: "click text... it still is not closing").**
 * `wrapperRef` correctly saw the label as "outside" (it sits beside our
 * content inside `Field`'s own markup, not inside it) and closed the list on
 * `mousedown` — but a `<label htmlFor>` ALSO natively refocuses its
 * associated control on `click`, which fires right after, undoing the close
 * a moment later. The fix leaves `wrapperRef` scoped to input/dropdown/chips
 * only, and separately neutralizes the label's native refocus with a
 * capture-phase `onClickCapture` on the outermost wrapper below:
 * `preventDefault()` on a `LABEL` target, called during capture (before the
 * browser resolves the label's default action), cancels the refocus without
 * touching `Field` itself — every other consumer of `Field` keeps normal
 * label-click-focuses-input behaviour.
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
  const {
    draft,
    listShown,
    offered,
    activeIndex,
    setActiveIndex,
    listId,
    optionId,
    wrapperRef,
    optionRefs,
    commitValue,
    handleChange,
    handleKeyDown,
    handleBlur,
    onFocus,
  } = useCityComboboxField(cities, onAdd);

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
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={(e) => handleBlur(e.relatedTarget as Node | null)}
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
