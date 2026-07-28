import { SearchX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

import type { CatalogSearchParams, SearchResponse, SortOption } from "../model";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { FilterPanel } from "./FilterPanel";
import { ResultSection } from "./ResultSection";
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
 * State is the URL (no `store.ts` for this slice) — `SortControl` and
 * `FilterPanel` are client islands that push new params via
 * `useUpdateCatalogParams`, which the route file reads on the next request.
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
  const sort: SortOption =
    params.sort === "relevance" ||
    params.sort === "distance" ||
    params.sort === "price_asc"
      ? params.sort
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
            <a href={`/app/catalog?${new URLSearchParams(stripUndefined(params)).toString()}`}>
              {t("errors.retry")}
            </a>
          </Button>
        </div>
      ) : response ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="lg:w-64 lg:shrink-0">
            <FilterPanel params={params} />
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
              response.sections.map((section) => (
                <ResultSection
                  key={section.kind}
                  section={section}
                  locale={locale}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <CatalogSkeleton />
      )}
    </main>
  );
}

function stripUndefined(
  params: CatalogSearchParams,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
