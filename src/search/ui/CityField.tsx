"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import { useCitySuggestions } from "../hooks";

/**
 * The Catalog Page's city filter: type, get flat city suggestions, pick one.
 *
 * Same ARIA combobox shape as `business-cabinet/ui/CategoryField.tsx` —
 * duplicated per D8 (same LOOK, different owner/data: this hits `/cities` for
 * search's OWN location filter, not the seller-onboarding category picker).
 * Simpler than that one: `explicitFilters.city` is a `String` on the backend,
 * so free text IS the filter value and there is no "picked vs. typed"
 * distinction to track. `CityDto.id` is still used as the React key — it is
 * the row's real identity, and two cities may share a name.
 */
export function CityField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (city: string) => void;
}) {
  const t = useTranslations("search");
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { suggestions, loading } = useCitySuggestions(value);

  const listShown = open && suggestions.length > 0;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;

  const pick = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    onChange(suggestion.name);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        autoComplete="off"
        aria-expanded={listShown}
        aria-controls={listShown ? listId : undefined}
        aria-activedescendant={listShown ? activeId : undefined}
        aria-autocomplete="list"
        placeholder={t("filters.cityPlaceholder")}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
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
            setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(active);
          } else if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
        }}
      />

      {loading ? (
        <span className="sr-only" role="status">
          {t("filters.cityLoading")}
        </span>
      ) : null}

      {listShown ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("filters.city")}
          className="neu-card absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto p-1.5"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              data-active={index === active}
              className="neu-menu-item cursor-pointer px-3 py-2.5 text-sm font-medium"
              onMouseEnter={() => setActive(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
              }}
              onClick={() => pick(index)}
            >
              {suggestion.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
