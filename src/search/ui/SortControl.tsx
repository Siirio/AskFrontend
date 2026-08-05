"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";

import { useGeolocation, useUpdateCatalogParams } from "../hooks";
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
 * ── DISTANCE NEEDS A LOCATION FIX, AND ASKS FOR ONE ────────────────────────
 * The same commit added `isDistanceLocationValid`: `sort=distance` without
 * `userLocation` is a 400. The first attempt at handling that silently
 * downgraded distance to relevance inside `toSearchRequest` — which meant the
 * tab rendered SELECTED while the results were ordered by something else. That
 * is a live-looking control that does nothing, the exact shape the project lock
 * was written after ("a reachable control must DO something"), and it was
 * caught by an existing e2e test rather than by review.
 *
 * So the tab now behaves like the radius filter, which had solved this already:
 * clicking it REQUESTS the fix (never auto-prompted on load, hooks.ts), the
 * sort applies once granted, and a denial says so instead of pretending. The
 * two controls share one grammar because they share one requirement.
 *
 * The list is driven by `SORT_OPTIONS`, so a sort is added by adding it there
 * AND to `search.sort.*` in ru/kk/en — this component needs no edit, which is
 * the point, but it also means a missing i18n key surfaces as a broken tab
 * rather than a type error.
 */
export function SortControl({ sort }: { sort: SortOption }) {
  const t = useTranslations("search");
  const updateParams = useUpdateCatalogParams();
  const { state: geo, request: requestLocation } = useGeolocation();

  // Set when the visitor picked Distance without a fix. The sort is applied by
  // the effect below once the fix lands — not here, because the coordinates do
  // not exist yet at click time.
  const [awaitingFix, setAwaitingFix] = useState(false);
  const applied = useRef(false);

  useEffect(() => {
    if (!awaitingFix || geo.status !== "granted" || applied.current) return;
    applied.current = true;
    setAwaitingFix(false);
    updateParams({
      sort: "distance",
      lat: String(geo.lat),
      lng: String(geo.lng),
    });
  }, [awaitingFix, geo, updateParams]);

  const select = (option: SortOption) => {
    if (option !== "distance") {
      setAwaitingFix(false);
      updateParams({ sort: option });
      return;
    }
    if (geo.status === "granted") {
      updateParams({
        sort: "distance",
        lat: String(geo.lat),
        lng: String(geo.lng),
      });
      return;
    }
    // No fix yet — ask, and apply when it arrives. The tab does NOT move to
    // selected in the meantime: the URL is the source of truth for the sort,
    // and claiming a sort the server was never asked for is the defect above.
    setAwaitingFix(true);
    applied.current = false;
    requestLocation();
  };

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-label={t("sort.label")} className="neu-tab-list">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={sort === option}
            onClick={() => select(option)}
            className="neu-tab-trigger min-h-11 px-4 text-sm font-medium focus-ring"
          >
            {t(`sort.${option}`)}
          </button>
        ))}
      </div>

      {awaitingFix && geo.status === "pending" ? (
        <p className="text-xs text-foreground-subtle">
          {t("filters.locationPending")}
        </p>
      ) : null}
      {awaitingFix && geo.status === "denied" ? (
        <div className="flex items-center gap-2 text-xs text-warning">
          <span>{t("sort.distanceNeedsLocation")}</span>
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex items-center gap-1 font-medium text-accent focus-ring hover:underline"
          >
            <LocateFixed className="size-3.5" aria-hidden="true" />
            {t("filters.retryLocation")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
