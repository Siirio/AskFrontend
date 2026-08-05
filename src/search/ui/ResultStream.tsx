"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import {
  InfiniteScroll,
  InfiniteScrollLoader,
} from "@/shared/ui/infinite-scroll";

import { useCatalogPagination } from "../hooks";
import type { CatalogSearchParams, SearchResponse } from "../model";
import { ResultSection } from "./ResultSection";

/**
 * The result list, with infinite scroll (PRODUCT_VISION §4, owner 2026-08-02:
 * pagination is replaced by scrolling "until the goods or services run out").
 *
 * ── THE RESET RULE IS ENFORCED BY THE KEY, NOT BY CODE HERE ────────────────
 * The vision requires that changing any filter or sort DISCARDS the list and
 * re-queries. `CatalogPage` mounts this under a key derived from the URL
 * params, so a new query produces a genuinely NEW component instance with a new
 * store — rather than a `reset()` that a future control could forget to call.
 * The guarantee is structural; there is nothing here to get wrong.
 *
 * ── WHY PAGE 0 IS NOT FETCHED HERE ─────────────────────────────────────────
 * The route file already fetched it server-side (D7) and passes it in. That
 * keeps first paint server-rendered and means a visitor who never scrolls makes
 * exactly one request, as before. This component only ever asks for page 1
 * onward.
 */
export function ResultStream({
  initial,
  params,
  locale,
}: {
  initial: SearchResponse;
  params: CatalogSearchParams;
  locale: string;
}) {
  const t = useTranslations("search");
  const { sections, hasNext, loading, error, loadMore, retry } =
    useCatalogPagination(initial, params, locale);

  return (
    <InfiniteScroll
      className="gap-6"
      onLoadMore={loadMore}
      hasMore={hasNext}
      loading={loading}
      loader={<InfiniteScrollLoader label={t("results.loadingMore")} />}
      endMessage={
        // Only worth saying once the list is long enough for the question to
        // have occurred to anyone. On a single short page "no more results" is
        // noise about something the user can already see.
        sections.length > 1 ? (
          <span className="text-sm text-foreground-subtle">
            {t("results.endOfResults")}
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        {sections.map((section, index) => (
          // Sections are page-scoped, so `kind` repeats across pages and cannot
          // be the key on its own.
          <ResultSection key={`${index}-${section.kind}`} section={section} />
        ))}

        {/* A failed APPEND keeps what is already on screen and offers a retry.
            Discarding good results because the continuation failed would punish
            the user for a network blip; page 0 failing is the route file's
            error state instead, which is a different situation (P9.3). */}
        {error ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-foreground-muted">
              {t("errors.loadMoreFailed")}
            </p>
            <Button variant="secondary" onClick={retry}>
              {t("errors.retry")}
            </Button>
          </div>
        ) : null}
      </div>
    </InfiniteScroll>
  );
}
