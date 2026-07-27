"use client";

import { useId, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Input } from "@/shared/ui/input";

import { useCategorySuggestions } from "../hooks";
import { Field, fieldErrorId } from "./Field";

/**
 * The business-category picker: type, get flat BUSINESS suggestions, either pick
 * one or keep your own words.
 *
 * Free text is a FIRST-CLASS outcome, not a fallback — the backend's category
 * contract says so ("the user may explicitly create a category when no
 * suggestion fits") and turns unmatched text into a USER category itself. So
 * this is a combobox, never a select: a seller whose trade is not in the list is
 * not blocked at the second field of their registration.
 *
 * Picking a suggestion stores its IDENTITY (`categoryId`); editing the text
 * afterwards drops that identity again, because the two must never disagree —
 * a stored id with different visible text would send the backend a category the
 * person never read (model.ts keeps them as one decision).
 *
 * ARIA follows the 1.2 combobox pattern: the input owns `aria-expanded` and
 * `aria-activedescendant`, the list is a `listbox` of `option`s, and the input
 * is NOT wrapped in the widget role — screen readers get the field's own label.
 */
export function CategoryField({
  id,
  value,
  categoryId,
  error,
  onChange,
}: {
  id: string;
  value: string;
  categoryId: string | null;
  error?: string;
  onChange: (label: string, categoryId: string | null) => void;
}) {
  const t = useTranslations("businessCabinet");
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { suggestions, loading } = useCategorySuggestions(value);

  // A picked category is not a query — suppress the list so the field does not
  // re-open onto "matches for the thing you already chose".
  const listShown = open && !categoryId && suggestions.length > 0;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;

  const pick = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    onChange(suggestion.label, suggestion.categoryId);
    setOpen(false);
    setActive(-1);
  };

  return (
    <Field label={t("fields.category")} htmlFor={id} error={error}>
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          autoComplete="off"
          aria-expanded={listShown}
          aria-controls={listShown ? listId : undefined}
          aria-activedescendant={listShown ? activeId : undefined}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? fieldErrorId(id) : undefined}
          className={cn(categoryId && "pe-11")}
          placeholder={t("placeholders.category")}
          value={value}
          onChange={(e) => {
            // Typing invalidates a previous pick — see the header note.
            onChange(e.target.value, null);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // A click on an option fires blur BEFORE the option's own handler,
            // so closing synchronously would unmount the row being clicked.
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (!listShown) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(
                (i) => (i - 1 + suggestions.length) % suggestions.length,
              );
            } else if (e.key === "Enter" && active >= 0) {
              // Only swallow Enter when a suggestion is actually highlighted —
              // otherwise Enter must keep submitting the form.
              e.preventDefault();
              pick(active);
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
        />

        {/* Two mutually exclusive end-of-field states, both purely informative:
            a request in flight, or a stored identity. Neither is actionable, so
            neither is a button. */}
        {loading && !categoryId ? (
          <span className="pointer-events-none absolute inset-y-0 inset-e-4 flex items-center text-foreground-subtle">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            <span className="sr-only">{t("category.loading")}</span>
          </span>
        ) : null}
        {categoryId ? (
          <span className="pointer-events-none absolute inset-y-0 inset-e-4 flex items-center text-success">
            <Check aria-hidden="true" className="size-4.5" />
            <span className="sr-only">{t("category.selected")}</span>
          </span>
        ) : null}

        {listShown ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={t("fields.category")}
            // Not a Radix portal — this list is a child of the field, inside the
            // `neu-skin` scope already, so the portal-container lock does not
            // apply and `.neu-card` resolves correctly here.
            className="neu-card absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto p-1.5"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.categoryId}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                data-active={index === active}
                // The highlighted look lives in `.neu-menu-item[data-active]`
                // (design-system/neumorphism.css), driven by the ONE `active`
                // index — so arrowing and hovering can never both light a row.
                className="neu-menu-item cursor-pointer px-3 py-2.5 text-sm font-medium"
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => {
                  // Keep focus in the input so the blur timer never fires.
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                }}
                onClick={() => pick(index)}
              >
                {suggestion.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
