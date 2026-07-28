import { SearchX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/shared/ui/empty-state";

import type { CatalogSearchParams, SearchMode, SearchResponse } from "../model";

/**
 * The Catalog Page's empty state (P8.4/P9.3 — mandatory even though the
 * vision doesn't draw it) — **never a dead end, and never a request CTA**.
 * The fallback-request feature was removed from the product on 2026-07-28
 * (ROADMAP, features/search/ux-ui-flow.md); the honest endings today are the
 * response's OWN `suggestions[]`/`ambiguity` when present, a link to clear
 * filters, and a link to try the other mode — never a control pointing at a
 * destination that no longer exists (project lock).
 *
 * Server component: every action here is a plain navigation (Link), so no
 * client state is needed.
 */
export async function CatalogEmptyState({
  response,
  params,
  locale,
}: {
  response: SearchResponse;
  params: CatalogSearchParams;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "search" });
  const otherMode: SearchMode = response.mode === "ITEM" ? "SERVICE" : "ITEM";

  const clearFiltersHref = `/app/catalog?${new URLSearchParams({
    query: params.query ?? "",
    mode: response.mode,
  }).toString()}`;
  const otherModeHref = `/app/catalog?${new URLSearchParams({
    query: params.query ?? "",
    mode: otherMode,
  }).toString()}`;

  return (
    <EmptyState
      icon={SearchX}
      title={t("empty.title")}
      description={response.ambiguity ?? t("empty.description")}
      action={
        <div className="flex flex-col items-center gap-3">
          {response.suggestions.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {response.suggestions.map((suggestion) => (
                <Link
                  key={suggestion}
                  href={`/app/catalog?${new URLSearchParams({
                    query: suggestion,
                    mode: response.mode,
                  }).toString()}`}
                  className="neu-chip focus-ring"
                >
                  {suggestion}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={clearFiltersHref}
              className="rounded-xs text-sm font-medium text-accent focus-ring hover:underline"
            >
              {t("empty.clearFilters")}
            </Link>
            <Link
              href={otherModeHref}
              className="rounded-xs text-sm font-medium text-accent focus-ring hover:underline"
            >
              {t(`empty.tryMode.${otherMode}`)}
            </Link>
          </div>
        </div>
      }
    />
  );
}
