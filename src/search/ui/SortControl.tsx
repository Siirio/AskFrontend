"use client";

import { useTranslations } from "next-intl";

import { useUpdateCatalogParams } from "../hooks";
import { SORT_OPTIONS, type SortOption } from "../model";

/**
 * The Catalog Page's sort tabs (§4: Relevance, Distance, Cost). Relevance is
 * the default and is NEVER unselectable — the slice lock forbids a price-
 * first default, not a price sort existing at all. No Unique-Offers tab
 * (gate G1 — no backend sort supports it).
 */
export function SortControl({ sort }: { sort: SortOption }) {
  const t = useTranslations("search");
  const updateParams = useUpdateCatalogParams();

  return (
    <div role="group" aria-label={t("sort.label")} className="neu-tab-list">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={sort === option}
          onClick={() => updateParams({ sort: option })}
          className="neu-tab-trigger min-h-11 px-4 text-sm font-medium focus-ring"
        >
          {t(`sort.${option}`)}
        </button>
      ))}
    </div>
  );
}
