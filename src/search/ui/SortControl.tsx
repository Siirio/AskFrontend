"use client";

import { useTranslations } from "next-intl";

import { useUpdateCatalogParams } from "../hooks";
import { SORT_OPTIONS, type SortOption } from "../model";

/**
 * The Catalog Page's sort tabs — §4's full set: Relevance, Distance, Cost and
 * Unique Offers. Relevance is the default and is NEVER unselectable: the slice
 * lock forbids a price-FIRST default, not a price sort existing at all.
 *
 * **The Unique-Offers tab arrived 2026-08-04, when gate G1 closed** — backend
 * `c56f75c` added `unique_offers` to `SearchRequest.sort`. Until then there was
 * no server sort behind it, and faking one by re-ordering a loaded page is
 * exactly what the server-capability lock forbids.
 *
 * The list is driven by `SORT_OPTIONS`, so a sort is added by adding it there
 * AND to `search.sort.*` in ru/kk/en — this component needs no edit, which is
 * the point, but it also means a missing i18n key surfaces as a broken tab
 * rather than a type error.
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
