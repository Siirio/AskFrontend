"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/shared/ui/skeleton";

import type { SearchMapArea } from "../model";

/** Leaflet touches `window` at import time, so the canvas is client-only (D7).
 *  The fallback is the real Skeleton primitive at the map's own height, so the
 *  panel does not jump when tiles arrive (P9.3). */
const MapAreaCanvas = dynamic(() => import("./MapAreaCanvas"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/**
 * The map-area filter (PRODUCT_VISION §4 filter 3) — the fourth answer to
 * "where", and gate G1's last control, unblocked by backend `c56f75c`
 * (`SearchFilterRequest.mapArea`).
 *
 * **The search area is the viewport.** Pan and zoom to frame it; what you see
 * is what is searched. No drawn rectangle to drag, because a box separate from
 * the viewport puts two things on screen both claiming to be "the area".
 *
 * The backend asserts `north > south && east > west` and requires all four
 * bounds together — `getBounds()` satisfies both by construction, which is why
 * the box is never assembled from separate inputs.
 */
export function MapAreaField({
  area,
  onChange,
}: {
  area: SearchMapArea | null;
  onChange: (area: SearchMapArea) => void;
}) {
  const t = useTranslations("search");

  return (
    <div className="flex flex-col gap-1">
      <div className="h-56 w-full overflow-hidden rounded-md">
        <MapAreaCanvas area={area} onChange={onChange} />
      </div>
      <p className="text-xs text-foreground-subtle">
        {t("filters.mapAreaHint")}
      </p>
    </div>
  );
}
