"use client";

import { useId, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { useGeolocation, useUpdateCatalogParams } from "../hooks";
import type { CatalogSearchParams } from "../model";
import { CityField } from "./CityField";
import { Field } from "./Field";

/** 100 km — the ONE radius the vision names (§4: "search within 100 km"), not
 *  an arbitrary slider. Offering a range the vision never describes would be
 *  inventing a control (P9.1); the backend's cap is 100 000 m (contracts.md),
 *  which is exactly this value. */
const HUNDRED_KM_METERS = 100_000;

/**
 * The Catalog Page's filters (§4: Price, Location — city and within 100 km).
 * No Companies filter and no map-area filter (gate G1 — no backend param);
 * no `openNow` (no vision entry, P9.1).
 *
 * Local, uncommitted field state applies in ONE navigation on submit — typing
 * a price must not re-fetch the whole page per keystroke. The radius toggle
 * is the one exception: it needs the browser's geolocation permission
 * (explicit opt-in only, hooks.ts) before it can be applied at all.
 */
export function FilterPanel({ params }: { params: CatalogSearchParams }) {
  const t = useTranslations("search");
  const updateParams = useUpdateCatalogParams();
  const { state: geo, request: requestLocation } = useGeolocation();

  const [minPrice, setMinPrice] = useState(params.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? "");
  const [city, setCity] = useState(params.city ?? "");
  const [radiusEnabled, setRadiusEnabled] = useState(
    Boolean(params.radiusMeters),
  );

  const minPriceId = useId();
  const maxPriceId = useId();
  const cityId = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const useRadius = radiusEnabled && geo.status === "granted";
    updateParams({
      city: city.trim(),
      minPrice,
      maxPrice,
      radiusMeters: useRadius ? String(HUNDRED_KM_METERS) : undefined,
      lat: useRadius ? String(geo.lat) : undefined,
      lng: useRadius ? String(geo.lng) : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("filters.minPrice")} htmlFor={minPriceId}>
          <Input
            id={minPriceId}
            type="number"
            min={0}
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </Field>
        <Field label={t("filters.maxPrice")} htmlFor={maxPriceId}>
          <Input
            id={maxPriceId}
            type="number"
            min={0}
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("filters.city")} htmlFor={cityId}>
        <CityField id={cityId} value={city} onChange={setCity} />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={radiusEnabled}
            onChange={(e) => {
              setRadiusEnabled(e.target.checked);
              // Ask for the location fix the moment the visitor opts in — not
              // before (never auto-prompted on load, hooks.ts). Re-requesting
              // on an already-granted fix is a no-op cost, not a second prompt.
              if (e.target.checked && geo.status !== "granted") {
                requestLocation();
              }
            }}
          />
          {t("filters.within100km")}
        </label>
        {radiusEnabled && geo.status === "pending" ? (
          <p className="ps-6 text-xs text-foreground-subtle">
            {t("filters.locationPending")}
          </p>
        ) : null}
        {radiusEnabled && geo.status === "denied" ? (
          <div className="flex items-center gap-2 ps-6 text-xs text-warning">
            <span>{t("filters.locationDenied")}</span>
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

      <Button type="submit">{t("filters.apply")}</Button>
    </form>
  );
}
