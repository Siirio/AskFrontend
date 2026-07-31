"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  districtLocalities,
  EMPTY_LOCALITY_CHUNK,
  getDistricts,
  getRegions,
  isRepublicanCity,
  katoName,
  loadLocalities,
  orderForDisplay,
  regionLocalities,
  type KatoItem,
  type LocalityChunk,
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
 * The value is DERIVED and emitted from an effect rather than pushed from each
 * handler (corrected 2026-07-31). It has to be: `complete` depends on the
 * lazily-loaded locality chunk, and the display names depend on the active
 * locale — neither of which is known at the moment a level is clicked. Emitting
 * from handlers meant a district picked while its chunk was still in flight was
 * reported complete (there were "no" settlements yet), and switching language
 * afterwards left the caller holding names in the old one. A ref-guarded effect
 * re-emits on exactly those transitions and on nothing else.
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

/**
 * `error` is a state of its own and not a synonym for `ready` with nothing in
 * it — an empty chunk and a chunk that failed to arrive mean opposite things
 * for whether a settlement still has to be asked for.
 */
type ChunkState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "ready"; chunk: LocalityChunk }
  | { status: "error" };

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
   *
   * False while a locality chunk is still loading: until it lands we do not
   * know whether a settlement is owed, and answering "yes, done" early is how
   * a half-specified address gets submitted.
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

/** Identity of a place, for change detection — ids only, so a locale switch
 *  (which rewrites every name) is not mistaken for a different place. */
export function kzPlaceKey(place: KzPlace | null): string {
  if (!place) return "none";
  return `${place.regionId}/${place.districtId}/${place.localityId}`;
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

  const [chunkState, setChunkState] = useState<ChunkState>({ status: "none" });
  /** Bumped by the retry button to re-run the load effect for the same region. */
  const [reloadToken, setReloadToken] = useState(0);

  const regions = getRegions();
  const republican = isRepublicanCity(region?.id);
  const chunk =
    chunkState.status === "ready" ? chunkState.chunk : EMPTY_LOCALITY_CHUNK;

  // One locality chunk per region, fetched when the region is answered. The
  // `active` guard makes a stale response harmless: switching region twice
  // quickly must not let the first chunk land on top of the second.
  useEffect(() => {
    if (!region || isRepublicanCity(region.id)) {
      setChunkState({ status: "none" });
      return;
    }
    let active = true;
    setChunkState({ status: "loading" });
    loadLocalities(region.id)
      .then((loaded) => {
        if (active) setChunkState({ status: "ready", chunk: loaded });
      })
      .catch(() => {
        if (active) setChunkState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [region, reloadToken]);

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
  const chunkFailed = chunkState.status === "error";

  // ── The emitted value, derived ────────────────────────────────────────────

  const place = useMemo<KzPlace | null>(() => {
    if (!region) return null;
    const regionName = katoName(region, locale);

    let districtItem: KatoItem | null = null;
    let localityItem: KatoItem | null = null;
    let complete = false;

    if (isRepublicanCity(region.id)) {
      districtItem = cityDistrict;
      // A republican city is already a precise place — the city district
      // sharpens it but is not required for the address to make sense.
      complete = true;
    } else if (oblastPick?.kind === "locality") {
      localityItem = oblastPick.item;
      // An oblast-level city IS the answer; nothing narrower exists for it.
      complete = true;
    } else if (oblastPick?.kind === "district") {
      districtItem = oblastPick.item;
      localityItem = settlement;
      if (chunkState.status === "ready") {
        // A district with settlements must name one; a district with none is as
        // specific as the registry gets.
        complete =
          districtLocalities(chunkState.chunk, oblastPick.item.id).length ===
            0 || settlement != null;
      } else if (chunkState.status === "error") {
        // Degraded on purpose: the settlement list cannot be shown, so the
        // district is the most specific answer available. The failure is
        // SURFACED next to the field (below) rather than swallowed — blocking
        // the seller entirely over a chunk that will not load is the worse of
        // the two failures, but pretending nothing happened is not an option.
        complete = true;
      } else {
        // Still loading: we do not yet know whether a settlement is owed.
        complete = false;
      }
    }

    const districtName = districtItem ? katoName(districtItem, locale) : null;
    const localityName = localityItem ? katoName(localityItem, locale) : null;

    return {
      regionId: region.id,
      regionName,
      districtId: districtItem?.id ?? null,
      districtName,
      localityId: localityItem?.id ?? null,
      localityName,
      // Narrowest first — the registry's own order of specificity.
      placeName: localityName ?? districtName ?? regionName,
      complete,
    };
  }, [region, oblastPick, cityDistrict, settlement, chunkState, locale]);

  // `onChange` is not required to be memoized by the caller, so it is read
  // through a ref — otherwise an inline arrow would re-fire this effect on
  // every parent render and emit in a loop.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmitted = useRef<string | null>(null);
  useEffect(() => {
    // Compare the whole value, not just the place key: a locale switch changes
    // every NAME while the ids stay put, and the caller is holding those names.
    const signature = JSON.stringify(place);
    if (signature === lastEmitted.current) return;
    lastEmitted.current = signature;
    onChangeRef.current(place);
  }, [place]);

  // ── Handlers — each resets the levels BELOW it ────────────────────────────

  const pickRegion = useCallback((item: KatoItem) => {
    setRegion(item);
    setOblastPick(null);
    setCityDistrict(null);
    setSettlement(null);
  }, []);

  const pickOblast = useCallback((pick: OblastPick) => {
    setOblastPick(pick);
    setSettlement(null);
  }, []);

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
            loading={chunkState.status === "loading"}
            testId="address-oblast"
            onChange={pickOblast}
          />
          {chunkFailed ? (
            <p
              role="status"
              className="flex flex-wrap items-center gap-2 ps-1 text-sm text-foreground-muted"
            >
              {t("address.localitiesFailed")}
              <button
                type="button"
                className="rounded-sm font-semibold text-accent underline underline-offset-2 focus-ring"
                onClick={() => setReloadToken((token) => token + 1)}
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
