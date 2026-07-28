"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import { Field, fieldErrorId } from "./Field";

/**
 * The city list for `deliveryCoverage: SELECTED_CITIES` — free text, not a
 * picker over `GET /cities`: the backend accepts any non-blank string up to
 * 120 characters (SellerOnboardingRequest), so a closed list would refuse
 * names it would otherwise take. At least one entry is required (the
 * backend's `isDeliveryCoverageValid`, mirrored in model.ts).
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
        onBlur={commit}
      />

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
    </Field>
  );
}
