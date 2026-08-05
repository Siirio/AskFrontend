"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
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
 * not two competing ones. Each chip carries its own remove button —
 * `.neu-chip` at rest, no `data-active`, since these are not a single-choice
 * group like the verification sources.
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
  const listId = useId();
  const { suggestions } = useCitySuggestions(draft);

  // Never offer a city that is already a chip — picking it would be a no-op the
  // seller cannot see the result of.
  const offered = suggestions.filter((c) => !cities.includes(c.name));
  const listShown = open && offered.length > 0;

  // Takes the value explicitly rather than closing over `draft` — the comma
  // path in onChange needs to commit the SLICED value in the same tick it
  // computes it, before the state update carrying it has committed.
  const commitValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  };
  const commit = () => commitValue(draft);

  return (
    <Field
      label={t("fields.deliveryCities")}
      htmlFor={id}
      hint={t("hints.deliveryCities")}
      error={error}
    >
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
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // The field belongs to a form; Enter must add a city, never
              // submit the whole page.
              e.preventDefault();
              commit();
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Committing on blur is what makes a half-typed city survive the
            // seller clicking Apply — but the blur ALSO fires when they click a
            // suggestion, so the commit is deferred past the click that follows.
            setTimeout(() => {
              setOpen(false);
              commit();
            }, 120);
          }}
          role="combobox"
          aria-expanded={listShown}
          aria-controls={listShown ? listId : undefined}
          aria-autocomplete="list"
        />

        {listShown ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={t("fields.deliveryCities")}
            className="neu-card absolute z-50 mt-1 max-h-56 w-full overflow-y-auto p-1"
          >
            {offered.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="neu-menu-item flex min-h-11 w-full items-center px-3 text-start text-sm focus-ring"
                  // `onMouseDown` rather than `onClick`: the input's blur fires
                  // first and would otherwise close the list before the click
                  // lands on it.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitValue(city.name);
                    setOpen(false);
                  }}
                >
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {cities.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  className="neu-chip flex min-h-11 cursor-pointer items-center gap-1.5 px-4 focus-ring sm:min-h-9"
                  onClick={() => onRemove(city)}
                  aria-label={t("actions.removeCity", { city })}
                >
                  {city}
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
