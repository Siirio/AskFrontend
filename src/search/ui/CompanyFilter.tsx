"use client";

import { useTranslations } from "next-intl";

import type { SearchCompanyFacet } from "../model";

/**
 * The Companies filter (PRODUCT_VISION §4) — gate G1's last parked control,
 * unblocked 2026-08-04 when backend `526871a` added `SearchResponse.companyFacets`.
 *
 * ── WHY THE OPTIONS COME FROM THE SERVER ───────────────────────────────────
 * Every option and count is `companyFacets`, computed over the FULL current
 * query. Deriving them from the loaded cards — the obvious shortcut — would
 * mean the list showed only companies whose results happened to be on screen,
 * growing as you scroll. Both our server-capability lock and the backend's own
 * lock forbid it.
 *
 * The backend computes facets with every active filter EXCEPT `businessIds`, so
 * selecting a company never shrinks the list it was selected from. That is what
 * makes a multi-select possible at all, and it is easy to lose: with
 * `businessIds` applied, the list would collapse to the selection and a second
 * company could never be added.
 *
 * Ordering is the server's (count desc, then name) and is rendered as given.
 *
 * ── THE COUNT IS METADATA, NOT A RANKING ───────────────────────────────────
 * `resultCount` says how many results a company has for this query. It is a
 * fact about the query, not a judgement about the business, and it is rendered
 * as quiet tabular numerals for the same reason badges are metadata and never a
 * score (project locks). No bar, no share-of-total, nothing that reads as
 * "bigger is better".
 */
export function CompanyFilter({
  facets,
  selected,
  onToggle,
}: {
  facets: SearchCompanyFacet[];
  selected: string[];
  onToggle: (businessId: string) => void;
}) {
  const t = useTranslations("search");

  // Nothing to choose between when the query matched one company (or none) —
  // a filter that can only ever be a no-op is noise, so it is not rendered.
  if (facets.length < 2) return null;

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium text-foreground">
        {t("filters.companies")}
      </legend>

      {/* Capped height: a broad query can return dozens of companies, and a
          sidebar that scrolls the page away is worse than one that scrolls
          itself. */}
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {facets.map((facet) => (
          <label
            key={facet.businessId}
            className="flex min-h-11 items-center gap-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-accent"
              checked={selected.includes(facet.businessId)}
              onChange={() => onToggle(facet.businessId)}
            />
            <span className="min-w-0 flex-1 truncate">
              {facet.businessName}
            </span>
            <span className="shrink-0 text-xs text-foreground-subtle tabular-nums">
              {facet.resultCount}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
