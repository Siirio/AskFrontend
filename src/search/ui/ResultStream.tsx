"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ProductCardModal } from "@/catalog";
import { Button } from "@/shared/ui/button";
import {
  InfiniteScroll,
  InfiniteScrollLoader,
} from "@/shared/ui/infinite-scroll";

import { useCatalogPagination } from "../hooks";
import type {
  CatalogSearchParams,
  SearchCardResponse,
  SearchResponse,
} from "../model";
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
 *
 * ── THE PRODUCT CARD MODAL (D33, slice #3) ─────────────────────────────────
 * This is the natural home for "which card is open": it already owns the
 * result list, so `selected` lives here as local `useState` rather than a
 * `store.ts` addition — the value does not outlive this component tree and
 * nothing else needs it (P7.1). `ProductCardModal` renders from the SAME
 * `SearchCardResponse` already in memory — no new fetch. `@/catalog` is the
 * only cross-slice import in this file; catalog never imports back from
 * `@/search` (see `catalog/model.ts`'s header — R5 cycle avoidance).
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
  const [selected, setSelected] = useState<SearchCardResponse | null>(null);

  return (
    <>
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
            // Sections are page-scoped, so `kind` repeats across pages and
            // cannot be the key on its own.
            <ResultSection
              key={`${index}-${section.kind}`}
              section={section}
              onSelect={setSelected}
            />
          ))}

          {/* A failed APPEND keeps what is already on screen and offers a
              retry. Discarding good results because the continuation failed
              would punish the user for a network blip; page 0 failing is the
              route file's error state instead, a different situation (P9.3). */}
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
      {selected ? (
        <ProductCardModal
          card={selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      ) : null}
    </>
  );
}
