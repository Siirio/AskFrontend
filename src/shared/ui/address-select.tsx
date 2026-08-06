"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";

import { katoName } from "@/shared/geo/kato";
import { Combobox } from "@/shared/ui/combobox";
import {
  formatKzAddress,
  kzPlaceKey,
  useKzAddressCascade,
  type KzPlace,
} from "@/shared/ui/useKzAddressCascade";

// Re-exported so every existing `@/shared/ui/address-select` import (the
// public module path) keeps working unchanged — the cascade's data model and
// pure helpers moved to `useKzAddressCascade.ts` (P1.1), the module path
// consumers use did not.
export { formatKzAddress, kzPlaceKey };
export type { KzPlace };

/**
 * The Kazakh address cascade — down the KATO registry, one question per level.
 *
 *   republican city  →  city district
 *   oblast           →  district  →  settlement
 *   oblast           →  oblast-level city                 (no district below it)
 *
 * **The cascade's state — the registry walk, the async locality-chunk load,
 * seed-once rehydration, the derived `KzPlace` and its emission — lives in
 * `useKzAddressCascade` (2026-08-06, P1.1). This file is render-only: field
 * order, labels, and the failure/retry affordance for a locality chunk that
 * did not load.** See that hook's header comment for the WHY behind the
 * cascade's shape (no country field, no street line, seed-once rehydration).
 */
export function AddressSelect({
  value = null,
  onChange,
  disabled = false,
}: {
  /** Seeds the cascade from a remembered place, once, on mount — see
   *  `useKzAddressCascade`'s "REHYDRATION IS SEED-ONCE" section. Not a
   *  controlled value. */
  value?: KzPlace | null;
  onChange: (place: KzPlace | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const fieldId = useId();
  /** Owns the oblast field's live region — referenced by the combobox's
   *  aria-describedby when the locality chunk fails. */
  const oblastStatusId = `${fieldId}-oblast-status`;

  const {
    region,
    cityDistrict,
    oblastPick,
    settlement,
    regionOptions,
    cityDistrictOptions,
    oblastOptions,
    settlementOptions,
    showCityDistrict,
    showOblastPick,
    showSettlement,
    chunkFailed,
    loading,
    pickRegion,
    pickOblast,
    setCityDistrict,
    setSettlement,
    retry,
  } = useKzAddressCascade(value, onChange, locale);

  const label = (text: string, htmlFor: string) => (
    <label
      htmlFor={htmlFor}
      className="ps-1 text-sm font-semibold text-foreground-muted"
    >
      {text}
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {label(t("address.region"), `${fieldId}-region`)}
        <Combobox
          id={`${fieldId}-region`}
          value={region}
          options={regionOptions}
          getKey={(item) => item.id}
          getLabel={(item) => katoName(item, locale)}
          placeholder={t("address.selectRegion")}
          searchPlaceholder={t("address.searchRegion")}
          emptyLabel={t("address.noMatches")}
          listLabel={t("address.region")}
          disabled={disabled}
          testId="address-region"
          onChange={pickRegion}
        />
      </div>

      {showCityDistrict ? (
        <div className="flex flex-col gap-2">
          {label(t("address.cityDistrict"), `${fieldId}-city-district`)}
          <Combobox
            id={`${fieldId}-city-district`}
            value={cityDistrict}
            options={cityDistrictOptions}
            getKey={(item) => item.id}
            getLabel={(item) => katoName(item, locale)}
            placeholder={t("address.selectCityDistrict")}
            searchPlaceholder={t("address.searchCityDistrict")}
            emptyLabel={t("address.noMatches")}
            listLabel={t("address.cityDistrict")}
            disabled={disabled}
            testId="address-city-district"
            onChange={setCityDistrict}
          />
        </div>
      ) : null}

      {showOblastPick ? (
        <div className="flex flex-col gap-2">
          {label(t("address.districtOrCity"), `${fieldId}-oblast`)}
          <Combobox
            id={`${fieldId}-oblast`}
            value={oblastPick}
            options={oblastOptions}
            // The merged list holds two kinds of row whose ids come from
            // different tables — prefix them so a district and a locality that
            // happen to share an id can never collide as React keys.
            getKey={(pick) => `${pick.kind}-${pick.item.id}`}
            getLabel={(pick) => katoName(pick.item, locale)}
            placeholder={t("address.selectDistrictOrCity")}
            searchPlaceholder={t("address.searchDistrictOrCity")}
            emptyLabel={t("address.noMatches")}
            listLabel={t("address.districtOrCity")}
            disabled={disabled}
            loading={loading}
            describedBy={chunkFailed ? oblastStatusId : undefined}
            testId="address-oblast"
            onChange={pickOblast}
          />
          {/* Announcement and display are split on purpose, because one element
              cannot do both reliably. The live region is ALWAYS mounted and only
              its TEXT changes — a `role="status"` node inserted at the same
              moment it gains content is routinely missed, and `display: none`
              until it has content has the same defect, so it is `sr-only`
              (present, laid out, just not painted) rather than conditionally
              rendered. The visible message is NOT a live region: it renders only
              on failure, and reaches assistive tech through the combobox's
              aria-describedby, so a reader arriving at the field afterwards is
              still told why the settlement question is absent. */}
          <span className="sr-only" role="status" aria-live="polite">
            {chunkFailed ? t("address.localitiesFailed") : ""}
          </span>
          {chunkFailed ? (
            <p
              id={oblastStatusId}
              className="flex flex-wrap items-center gap-2 ps-1 text-sm text-foreground-muted"
            >
              {t("address.localitiesFailed")}
              <button
                type="button"
                className="rounded-sm font-semibold text-accent underline underline-offset-2 focus-ring"
                onClick={retry}
              >
                {t("address.retry")}
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {showSettlement ? (
        <div className="flex flex-col gap-2">
          {label(t("address.settlement"), `${fieldId}-settlement`)}
          <Combobox
            id={`${fieldId}-settlement`}
            value={settlement}
            options={settlementOptions}
            getKey={(item) => item.id}
            getLabel={(item) => katoName(item, locale)}
            placeholder={t("address.selectSettlement")}
            searchPlaceholder={t("address.searchSettlement")}
            emptyLabel={t("address.noMatches")}
            listLabel={t("address.settlement")}
            disabled={disabled}
            testId="address-settlement"
            onChange={setSettlement}
          />
        </div>
      ) : null}
    </div>
  );
}
