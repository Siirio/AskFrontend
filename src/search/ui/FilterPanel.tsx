"use client";

import { useId, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { useGeolocation, useUpdateCatalogParams } from "../hooks";
import type { CatalogSearchParams, SearchCompanyFacet } from "../model";
import { CityField } from "./CityField";
import { CompanyFilter } from "./CompanyFilter";
import { Field } from "./Field";

/** 100 km — the ONE radius the vision names (§4: "search within 100 km"), not
 *  an arbitrary slider. Offering a range the vision never describes would be
 *  inventing a control (P9.1); the backend's cap is 100 000 m (contracts.md),
 *  which is exactly this value. */
const HUNDRED_KM_METERS = 100_000;

/**
 * WHERE to search — one question, mutually exclusive answers.
 *
 * **This is a backend rule, not a preference.** `SearchFilterRequest`'s
 * `isLocationFilterValid` asserts that AT MOST ONE of `city`, `radiusMeters`
 * and `mapArea` is set (backend `c56f75c`); sending two is a 400. Modelling it
 * as a radio group makes that structural — the UI cannot express the invalid
 * state, so there is no validation rule to enforce and none to forget.
 *
 * Before 2026-08-04 the city field and the radius checkbox were independent
 * controls, and ticking both was reachable. That combination now fails on the
 * wire, which is why this is a REWORK of shipped controls rather than an
 * addition beside them.
 *
 * `map` is deliberately absent: the fourth mode needs a map surface, and a
 * radio that selects nothing would be a dead control (project lock). It joins
 * this union when that surface exists.
 */
const LOCATION_MODES = ["anywhere", "city", "radius"] as const;
type LocationMode = (typeof LOCATION_MODES)[number];

function initialMode(params: CatalogSearchParams): LocationMode {
  if (params.radiusMeters) return "radius";
  if (params.city) return "city";
  return "anywhere";
}

/**
 * The Catalog Page's filters (§4: Price, Location). No Companies filter yet
 * (built next, from `companyFacets`); no `openNow` — the backend removed it and
 * it never had a vision entry (P9.1).
 *
 * Local, uncommitted field state applies in ONE navigation on submit — typing
 * a price must not re-fetch the whole page per keystroke. The radius mode is
 * the one exception: it needs the browser's geolocation permission (explicit
 * opt-in only, hooks.ts) before it can be applied at all.
 */
export function FilterPanel({
  params,
  companyFacets,
}: {
  params: CatalogSearchParams;
  companyFacets: SearchCompanyFacet[];
}) {
  const t = useTranslations("search");
  const updateParams = useUpdateCatalogParams();
  const { state: geo, request: requestLocation } = useGeolocation();

  const [minPrice, setMinPrice] = useState(params.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? "");
  const [city, setCity] = useState(params.city ?? "");
  const [mode, setMode] = useState<LocationMode>(() => initialMode(params));
  const [companies, setCompanies] = useState<string[]>(() =>
    (params.businessIds ?? "").split(",").filter(Boolean),
  );

  const minPriceId = useId();
  const maxPriceId = useId();
  const cityId = useId();
  const modeName = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const useRadius = mode === "radius" && geo.status === "granted";
    // Exactly ONE location parameter leaves here, and the others are cleared
    // rather than left behind — a stale `city` in the URL would travel
    // alongside `radiusMeters` and 400 the request.
    updateParams({
      minPrice,
      maxPrice,
      city: mode === "city" ? city.trim() : undefined,
      // Empty means "no company filter", and `useUpdateCatalogParams` deletes a
      // param set to "" — so clearing every box removes it from the URL rather
      // than sending an empty list.
      businessIds: companies.join(","),
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

      {/* A real fieldset/legend, not a styled div: "where" is one question with
          exclusive answers, and that is exactly what a radio group announces to
          a screen reader. The semantics and the backend's assert agree. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">
          {t("filters.location")}
        </legend>

        {LOCATION_MODES.map((option) => (
          <label
            key={option}
            className="flex min-h-11 items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              name={modeName}
              value={option}
              className="size-4 accent-accent"
              checked={mode === option}
              onChange={() => {
                setMode(option);
                // Ask for the fix the moment the visitor opts in — never
                // auto-prompted on load (hooks.ts). Re-requesting an
                // already-granted fix is a no-op, not a second prompt.
                if (option === "radius" && geo.status !== "granted") {
                  requestLocation();
                }
              }}
            />
            {t(
              option === "anywhere"
                ? "filters.locationAnywhere"
                : option === "city"
                  ? "filters.locationCity"
                  : "filters.within100km",
            )}
          </label>
        ))}

        {/* Each mode's own detail sits INSIDE the group, indented under its
            radio, so the relationship is visible rather than implied. */}
        {mode === "city" ? (
          <div className="ps-6">
            <Field label={t("filters.city")} htmlFor={cityId}>
              <CityField id={cityId} value={city} onChange={setCity} />
            </Field>
          </div>
        ) : null}

        {mode === "radius" && geo.status === "pending" ? (
          <p className="ps-6 text-xs text-foreground-subtle">
            {t("filters.locationPending")}
          </p>
        ) : null}
        {mode === "radius" && geo.status === "denied" ? (
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
      </fieldset>

      <CompanyFilter
        facets={companyFacets}
        selected={companies}
        onToggle={(id) =>
          setCompanies((prev) =>
            prev.includes(id)
              ? prev.filter((existing) => existing !== id)
              : [...prev, id],
          )
        }
      />

      <Button type="submit">{t("filters.apply")}</Button>
    </form>
  );
}
