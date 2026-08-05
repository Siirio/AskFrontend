import { SearchX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

import {
  SORT_OPTIONS,
  type CatalogSearchParams,
  type SearchResponse,
  type SortOption,
} from "../model";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { FilterPanel } from "./FilterPanel";
import { ResultStream } from "./ResultStream";
import { SortControl } from "./SortControl";

/**
 * The Catalog Page (UF 2.1 step 2) — result list, sorting, filters. Server
 * component (D7); the route file already ran `search()` and hands the
 * outcome down as one of four states — `emptyQuery` (a blank/missing `query`
 * param — a typed, bookmarked, or hand-edited URL; the route never calls
 * `search()` with a known-invalid request, P9.4), `error`, `response`, or
 * `pending` (route re-renders while a new URL is in flight; Next shows this
 * only via its own loading.tsx, so in practice this component always
 * receives a settled state, but the type keeps the loading state honest for
 * anyone reusing it).
 *
 * Filters and sort still live in the URL — `SortControl` and `FilterPanel` are
 * client islands that push new params via `useUpdateCatalogParams`, which the
 * route file reads on the next request. What changed on 2026-08-04 is the
 * RESULTS: infinite scroll means pages 1..n arrive after this render, so the
 * list is handed to `ResultStream`, a client island with its own store. Page 0
 * is still the server's, so first paint is unchanged and a visitor who does not
 * scroll still makes exactly one request.
 */
export async function CatalogPage({
  locale,
  params,
  response,
  error,
  emptyQuery,
}: {
  locale: string;
  params: CatalogSearchParams;
  response?: SearchResponse;
  error?: boolean;
  emptyQuery?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "search" });
  // Validated against SORT_OPTIONS rather than a hand-written list: that list
  // was written when there were three sorts and silently ignored the fourth
  // when `unique_offers` shipped, so `?sort=unique_offers` would have rendered
  // the tab UNSELECTED while the server sorted by it. Deriving from the one
  // array means adding a sort cannot desynchronise the two again.
  const sort: SortOption = SORT_OPTIONS.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : "relevance";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        {t("pages.catalog")}
      </h1>

      {emptyQuery ? (
        <EmptyState
          icon={SearchX}
          title={t("errors.queryRequired")}
          description={t("validation.emptyQueryDescription")}
          action={
            <Button asChild>
              <Link href="/app">{t("validation.backToHome")}</Link>
            </Button>
          }
        />
      ) : error ? (
        <div className="neu-card flex flex-col items-center gap-3 px-8 py-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            {t("errors.searchFailed")}
          </p>
          <Button asChild>
            <a
              href={`/app/catalog?${new URLSearchParams(stripUndefined(params)).toString()}`}
            >
              {t("errors.retry")}
            </a>
          </Button>
        </div>
      ) : response ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="lg:w-64 lg:shrink-0">
            <FilterPanel
              params={params}
              companyFacets={response.companyFacets}
            />
          </aside>

          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {response.understoodQuery ? (
                <p className="text-sm text-foreground-muted">
                  {response.understoodQuery}
                </p>
              ) : (
                <span />
              )}
              <SortControl sort={sort} />
            </div>

            {response.sections.length === 0 ? (
              <CatalogEmptyState
                response={response}
                params={params}
                locale={locale}
              />
            ) : (
              /* The KEY is the reset mechanism, not a React formality. The
                 vision requires that changing any filter or sort discards the
                 list and re-queries; keying the island on the params means a
                 changed URL mounts a NEW instance with a NEW store, so the old
                 pages cannot survive into the new query. A `reset()` call would
                 have put that guarantee at the mercy of every future control
                 remembering to make it. */
              <ResultStream
                key={catalogKey(params)}
                initial={response}
                params={params}
                locale={locale}
              />
            )}
          </div>
        </div>
      ) : (
        <CatalogSkeleton />
      )}
    </main>
  );
}

/** The identity of a QUERY, for `ResultStream`'s remount key. Every field that
 *  changes what the server would return is in it — so any change discards the
 *  accumulated pages, and a change to something cosmetic would not. Sorted, so
 *  the key does not depend on the order the params happen to be spread in. */
function catalogKey(params: CatalogSearchParams): string {
  return Object.entries(stripUndefined(params))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

function stripUndefined(params: CatalogSearchParams): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
