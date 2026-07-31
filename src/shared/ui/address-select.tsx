"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  districtLocalities,
  getDistricts,
  getRegions,
  isRepublicanCity,
  katoName,
  loadLocalities,
  orderForDisplay,
  regionLocalities,
  type KatoItem,
} from "@/shared/geo/kato";
import { Combobox } from "@/shared/ui/combobox";

/**
 * The Kazakh address cascade — down the KATO registry, one question per level.
 *
 *   republican city  →  city district
 *   oblast           →  district  →  settlement
 *   oblast           →  oblast-level city                 (no district below it)
 *
 * ── WHY THERE IS NO COUNTRY FIELD ──────────────────────────────────────────
 * The control this was ported from opened with a worldwide country select. Here
 * it would be a dead control: the product registers businesses in Kazakhstan
 * only — `REGISTRATION_COUNTRY_CODE` is fixed to KZ and `BusinessLegalForm`
 * offers KZ_IP / KZ_TOO / NONE, so the legal half of every form is Kazakhstan
 * law by construction. A picker with one real answer is exactly the shape the
 * project lock forbids ("a control that is reachable must DO something"), and a
 * second market is gate G4's question, not this component's. When G4 is
 * answered the country level is added ABOVE this cascade, not inside it.
 *
 * ── WHY THE STREET LINE IS NOT IN HERE ─────────────────────────────────────
 * The original bundled a free-text street input behind a `hideAddress` flag.
 * Keeping that here would make this component half-controlled: callers that
 * write the street themselves (the branch modal reverse-geocodes a dropped map
 * pin into it) would have a second copy of that string, and the two would drift
 * the moment either side changed it. So this control answers WHICH PLACE and
 * nothing else; the caller renders its own street field and gates it on
 * `complete`. One string, one owner (P6.2).
 *
 * ── WHAT IT EMITS ──────────────────────────────────────────────────────────
 * The ids AND the names of every level answered. The ids are the only durable
 * identity KATO has; the names are what a person and a courier read. Deciding a
 * WIRE shape here would be this component reaching into a domain it must not
 * know about (§5) — the slice that owns the endpoint composes, via
 * `formatKzAddress` or by reading the parts.
 *
 * ── NOT REHYDRATABLE (stated, not hidden) ──────────────────────────────────
 * The cascade owns its selection state and emits outward; it does not
 * reconstruct itself from a previously emitted value. Doing so would mean
 * loading a locality chunk to resolve one id, on mount, for every consumer —
 * and no caller needs it yet: a branch draft is created and submitted in one
 * sitting. When an EDIT screen appears (the cabinet's Branches tab, roadmap #6)
 * this grows a `value` prop; it is not built on speculation (P8.2).
 */

/** Which level of the cascade a merged oblast-level option came from. */
type OblastPick =
  { kind: "district"; item: KatoItem } | { kind: "locality"; item: KatoItem };

export type KzPlace = {
  regionId: number;
  regionName: string;
  /** A district, or a republican city's city district. */
  districtId: number | null;
  districtName: string | null;
  /** A settlement — under a district, or directly under the oblast. */
  localityId: number | null;
  localityName: string | null;
  /** The most specific level answered. What a `city` field wants. */
  placeName: string;
  /**
   * The cascade is as specific as the registry allows for this branch — there
   * is no further question to ask. Callers gate a street field on this rather
   * than re-deriving "did they finish", which would need the locality chunk.
   */
  complete: boolean;
};

/**
 * The place as one human-readable line, widest first — the order a Kazakh
 * postal address is written in, and the order the cascade asked for it. Pass
 * `street` to append the caller's own street line. Empty levels drop out rather
 * than leaving a doubled separator.
 */
export function formatKzAddress(place: KzPlace, street?: string): string {
  return [place.regionName, place.districtName, place.localityName, street]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

export function AddressSelect({
  onChange,
  disabled = false,
}: {
  onChange: (place: KzPlace | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const fieldId = useId();

  const [region, setRegion] = useState<KatoItem | null>(null);
  /** Oblast path: the merged district-or-city choice. */
  const [oblastPick, setOblastPick] = useState<OblastPick | null>(null);
  /** Republican-city path: the city district. */
  const [cityDistrict, setCityDistrict] = useState<KatoItem | null>(null);
  /** Oblast path: the settlement under a chosen district. */
  const [settlement, setSettlement] = useState<KatoItem | null>(null);

  const [chunk, setChunk] = useState<Record<string, KatoItem[]>>({});
  const [chunkLoading, setChunkLoading] = useState(false);

  const regions = useMemo(() => getRegions(), []);
  const republican = isRepublicanCity(region?.id);

  // One locality chunk per region, fetched when the region is answered. The
  // `active` guard makes a stale response harmless: switching region twice
  // quickly must not let the first chunk land on top of the second.
  useEffect(() => {
    if (!region || isRepublicanCity(region.id)) {
      setChunk({});
      setChunkLoading(false);
      return;
    }
    let active = true;
    setChunkLoading(true);
    loadLocalities(region.id)
      .then((loaded) => {
        if (active) setChunk(loaded);
      })
      .finally(() => {
        if (active) setChunkLoading(false);
      });
    return () => {
      active = false;
    };
  }, [region]);

  // ── Option lists ──────────────────────────────────────────────────────────

  // Regions are NOT re-ordered: the three republican cities are pinned first by
  // the data build precisely because they are the common answer, and sorting
  // here would bury them among 17 oblasts (scripts/build-kato.mjs).
  const regionOptions = regions;

  const cityDistrictOptions = useMemo(
    () => (region ? orderForDisplay(getDistricts(region.id), locale) : []),
    [region, locale],
  );

  /**
   * The oblast's districts and its own cities/villages in ONE list. From the
   * seller's side these are the same question — "where in this oblast are you"
   * — and splitting them into two selects would make someone in Kokshetau hunt
   * for it under a district it does not belong to.
   */
  const oblastOptions = useMemo<OblastPick[]>(() => {
    if (!region || republican) return [];
    const localities = orderForDisplay(
      regionLocalities(chunk, region.id),
      locale,
    ).map((item): OblastPick => ({ kind: "locality", item }));
    const districts = orderForDisplay(getDistricts(region.id), locale).map(
      (item): OblastPick => ({ kind: "district", item }),
    );
    // Oblast-level localities first — that is where the cities are, and
    // `orderForDisplay` has already floated them to the head of that block.
    return [...localities, ...districts];
  }, [region, republican, chunk, locale]);

  const settlementOptions = useMemo(() => {
    if (oblastPick?.kind !== "district") return [];
    return orderForDisplay(
      districtLocalities(chunk, oblastPick.item.id),
      locale,
    );
  }, [oblastPick, chunk, locale]);

  // ── Visibility — a level is asked only once it can be answered ────────────

  const showCityDistrict = republican;
  const showOblastPick = Boolean(region) && !republican;
  const showSettlement = showOblastPick && settlementOptions.length > 0;

  // ── Emit ──────────────────────────────────────────────────────────────────

  /**
   * Build the outward value from an explicit next state. Pure, and deliberately
   * not derived in an effect: every handler resets the levels below it, and an
   * effect chain would emit each stale intermediate combination on the way down.
   */
  const compose = (next: {
    region: KatoItem | null;
    oblastPick: OblastPick | null;
    cityDistrict: KatoItem | null;
    settlement: KatoItem | null;
  }): KzPlace | null => {
    if (!next.region) return null;
    const regionName = katoName(next.region, locale);

    let districtItem: KatoItem | null = null;
    let localityItem: KatoItem | null = null;
    let complete = false;

    if (isRepublicanCity(next.region.id)) {
      districtItem = next.cityDistrict;
      // A republican city is already a precise place — the city district
      // sharpens it but is not required for the address to make sense.
      complete = true;
    } else if (next.oblastPick?.kind === "locality") {
      localityItem = next.oblastPick.item;
      // An oblast-level city IS the answer; nothing narrower exists for it.
      complete = true;
    } else if (next.oblastPick?.kind === "district") {
      districtItem = next.oblastPick.item;
      localityItem = next.settlement;
      // A district with settlements must name one; a district with none is as
      // specific as the registry gets.
      const under = districtLocalities(chunk, next.oblastPick.item.id);
      complete = under.length === 0 || next.settlement != null;
    }

    const districtName = districtItem ? katoName(districtItem, locale) : null;
    const localityName = localityItem ? katoName(localityItem, locale) : null;

    return {
      regionId: next.region.id,
      regionName,
      districtId: districtItem?.id ?? null,
      districtName,
      localityId: localityItem?.id ?? null,
      localityName,
      // Narrowest first — the registry's own order of specificity.
      placeName: localityName ?? districtName ?? regionName,
      complete,
    };
  };

  const pickRegion = (item: KatoItem) => {
    setRegion(item);
    setOblastPick(null);
    setCityDistrict(null);
    setSettlement(null);
    onChange(
      compose({
        region: item,
        oblastPick: null,
        cityDistrict: null,
        settlement: null,
      }),
    );
  };

  const pickCityDistrict = (item: KatoItem) => {
    setCityDistrict(item);
    onChange(
      compose({
        region,
        oblastPick: null,
        cityDistrict: item,
        settlement: null,
      }),
    );
  };

  const pickOblast = (pick: OblastPick) => {
    setOblastPick(pick);
    setSettlement(null);
    onChange(
      compose({
        region,
        oblastPick: pick,
        cityDistrict: null,
        settlement: null,
      }),
    );
  };

  const pickSettlement = (item: KatoItem) => {
    setSettlement(item);
    onChange(
      compose({ region, oblastPick, cityDistrict: null, settlement: item }),
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
          testId="address-region"
          disabled={disabled}
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
            testId="address-city-district"
            disabled={disabled}
            onChange={pickCityDistrict}
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
            testId="address-oblast"
            disabled={disabled}
            loading={chunkLoading}
            onChange={pickOblast}
          />
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
            testId="address-settlement"
            disabled={disabled}
            onChange={pickSettlement}
          />
        </div>
      ) : null}
    </div>
  );
}
