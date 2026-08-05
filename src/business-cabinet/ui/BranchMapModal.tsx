"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

import {
  AddressSelect,
  formatKzAddress,
  kzPlaceKey,
  type KzPlace,
} from "@/shared/ui/address-select";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import * as api from "../api";
import type { DraftBranch } from "../model";
import { BranchList } from "./BranchList";
import { Field } from "./Field";

/** Leaflet touches `window` at import time — loaded only on the client, only
 *  once the modal actually opens. */
const BranchMapCanvas = dynamic(() => import("./BranchMapCanvas"), {
  ssr: false,
});

const SEARCH_DEBOUNCE_MS = 350;

/**
 * The branch map picker (item 9, 2026-07-29) — OpenStreetMap tiles via
 * `react-leaflet`, Nominatim search/reverse-geocode (both free, no key,
 * `api.ts`). Opened from step 3 when "PickUp available" is Yes.
 *
 * `latitude`/`longitude` are `@NotNull` on the backend's `CreateBranchRequest`
 * (read from source, not inferred), so this is not a decorative map — it is
 * how the branch's required coordinates get collected. Address is required
 * here (item 5): a branch drafted through THIS modal is always a pickup
 * point, so the seller must give customers somewhere to go, while the map
 * pin supplies the coordinates the address text alone cannot guarantee.
 *
 * **The address is now answered twice, on purpose (2026-07-31).** The KATO
 * cascade (`@/shared/ui/address-select`) answers WHICH PLACE — oblast,
 * district, settlement — from the state registry, and the street field answers
 * where in it. They are not redundant: OSM's free text is whatever a volunteer
 * typed, in whichever language and transliteration, while KATO is the registry
 * the seller's own documents use. `CreateBranchRequest` has exactly one
 * `address` string and no administrative fields, so the two are composed into
 * that one line by `formatKzAddress` — no invented DTO field (P9.4, Data Lock).
 *
 * Stays open across multiple "Add Branch" clicks — a seller with three
 * locations should not reopen the modal three times.
 */
export function BranchMapModal({
  open,
  onOpenChange,
  branches,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: DraftBranch[];
  onAdd: (branch: Omit<DraftBranch, "draftId">) => void;
  onRemove: (draftId: string) => void;
}) {
  const t = useTranslations("businessCabinet");
  const locale = useLocale();

  const [name, setName] = useState("");
  const [place, setPlace] = useState<KzPlace | null>(null);
  // Where the chosen registry place IS, so the map can frame it before a pin
  // exists. KATO carries codes and names, never coordinates, so this is
  // geocoded — the same Nominatim call the address search already uses.
  const [placeFocus, setPlaceFocus] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  // Remounts AddressSelect after a successful add, so the cascade clears with
  // the rest of the draft. The control owns its selection state deliberately
  // (see its header) — a key is the sanctioned way to reset that, and it beats
  // growing a `value` prop that only this one caller would ever set.
  const [placeKey, setPlaceKey] = useState(0);
  /** Identity of the last place seen, so a locale switch (same ids, new names)
   *  is not mistaken for the seller moving the branch. */
  const placeKeyRef = useRef<string>(kzPlaceKey(null));
  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<api.GeocodeResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    // Bias the search to the place the seller already picked. It does not make
    // an out-of-place pin impossible — nothing here can, since KATO carries no
    // geometry to test containment against — but it stops "Абая 10" from
    // offering an Abay street in a different oblast as the first hit.
    const scoped = place ? `${trimmed}, ${place.placeName}` : trimmed;
    debounceRef.current = setTimeout(() => {
      api
        .searchAddress(scoped, locale, controller.signal)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [searchQuery, place, locale]);

  const pick = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    setFormError(null);
    api
      .reverseGeocode(lat, lng, locale)
      .then((label) => {
        if (label) setAddress(label);
      })
      .catch(() => {
        // The pin is placed either way — reverse geocoding is a convenience,
        // not a requirement; the address field stays editable.
      });
  };

  // Frame the map on the chosen place. Runs only while there is NO pin: once
  // the seller drops one, their answer outranks a geocoded guess at the city
  // centre, and moving the map under them would be hostile.
  //
  // Failure is silent by design — the map simply stays where it is, which is
  // what it did before this existed. A geocoder outage must not block a form
  // whose real requirement is a pin the seller places themselves.
  useEffect(() => {
    if (!place || position) return;
    const controller = new AbortController();
    let active = true;
    api
      .searchAddress(place.placeName, locale, controller.signal)
      .then((results) => {
        const first = results[0];
        if (active && first) {
          setPlaceFocus({ lat: first.lat, lng: first.lng });
        }
      })
      .catch(() => {
        /* stay put — see above */
      });
    return () => {
      active = false;
      controller.abort();
    };
    // Keyed on the place IDENTITY, and `position` is deliberately absent: this
    // must not re-run — and re-frame the map — when the seller drops a pin,
    // only when the PLACE changes. `kzPlaceKey` is ids-only, so a locale switch
    // (same place, re-rendered names) does not re-frame either.
  }, [kzPlaceKey(place), locale]);

  /**
   * Changing the registry place invalidates everything narrower than it — the
   * pin, the street line and the search box all describe a location INSIDE the
   * old place (found by review 2026-07-31: picking a new region left the old
   * coordinates and street attached, so a branch could be submitted claiming
   * one oblast and pointing at another).
   *
   * Keyed on `kzPlaceKey` — ids only — so switching the app language, which
   * re-emits the same place with re-rendered names, does NOT throw away a pin
   * the seller already dropped.
   */
  const handlePlaceChange = (next: KzPlace | null) => {
    const key = kzPlaceKey(next);
    // A ref, not the `place` state read inside a setState updater: an updater
    // must stay pure (React may invoke it twice), and this comparison has to
    // drive four sibling resets.
    if (key !== placeKeyRef.current) {
      placeKeyRef.current = key;
      setPosition(null);
      setAddress("");
      setSearchQuery("");
      setSuggestions([]);
    }
    setPlace(next);
  };

  const resetDraft = () => {
    setName("");
    setPlace(null);
    placeKeyRef.current = kzPlaceKey(null);
    setPlaceKey((k) => k + 1);
    setAddress("");
    setAddressDetails("");
    setPosition(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleAdd = () => {
    if (!name.trim() || !position || !place?.complete || !address.trim()) {
      setFormError(t("branchModal.errors.incomplete"));
      return;
    }
    onAdd({
      name: name.trim(),
      // ONE `address` string is all `CreateBranchRequest` has — the registry
      // levels and the street line are composed into it, widest first.
      address: formatKzAddress(place, address),
      addressDetails: addressDetails.trim(),
      // The narrowest registry level in Russian — submit resolves it to a
      // `cityId` (B3). Kept beside the composed address because that string is
      // seller-editable and cannot be parsed back into a place.
      cityNameRu: place.placeNameRu,
      latitude: position.lat,
      longitude: position.lng,
    });
    resetDraft();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetDraft();
        onOpenChange(next);
      }}
    >
      {/* max-h + overflow-y-auto: this modal's content (search, map, three
          fields, the drafted-branch list) routinely exceeds the viewport —
          unlike every other Dialog caller, which fits without scrolling.
          Found by e2e: the Done button became unreachable off-screen with no
          way to scroll to it (2026-07-29). */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("branchModal.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label={t("branchModal.fields.name")} htmlFor="branch-name">
            <Input
              id="branch-name"
              autoComplete="off"
              value={name}
              placeholder={t("branchModal.placeholders.name")}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <AddressSelect key={placeKey} onChange={handlePlaceChange} />

          {/* Everything below describes a point INSIDE the chosen place, so
              nothing below is asked until the place is settled — and changing
              the place clears all of it (handlePlaceChange). Ordering the form
              this way is what makes that reset harmless: widest question first,
              exactly the order the address itself is written in. Before this,
              the map sat on top and a seller who pinned first lost the pin the
              moment they answered the cascade. */}
          {place?.complete ? (
            <>
              <div className="relative">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 inset-s-3 my-auto size-4 text-foreground-subtle"
                  />
                  <Input
                    className="ps-9"
                    placeholder={t("branchModal.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                  />
                </div>
                {searchOpen && suggestions.length > 0 ? (
                  <ul className="neu-card absolute inset-x-0 top-full z-20 mt-2 max-h-48 overflow-y-auto p-1.5">
                    {suggestions.map((s, i) => (
                      <li key={`${s.lat}-${s.lng}-${i}`}>
                        <button
                          type="button"
                          className="neu-menu-item flex w-full cursor-pointer items-start gap-2 px-3 py-2.5 text-start text-sm font-medium"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            pick(s.lat, s.lng);
                            setSearchQuery(s.label);
                            setSuggestions([]);
                            setSearchOpen(false);
                          }}
                        >
                          <MapPin
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0 text-accent"
                          />
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="h-64 w-full sm:h-80" data-testid="branch-map">
                {open ? (
                  <BranchMapCanvas
                    position={position}
                    focus={placeFocus}
                    onPick={pick}
                  />
                ) : null}
              </div>
              <p className="text-xs text-foreground-subtle">
                {t("branchModal.mapHint")}
              </p>

              <Field
                label={t("branchModal.fields.address")}
                htmlFor="branch-address"
              >
                <Input
                  id="branch-address"
                  autoComplete="off"
                  value={address}
                  placeholder={t("branchModal.placeholders.address")}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </>
          ) : null}

          <Field
            label={t("branchModal.fields.addressDetails")}
            htmlFor="branch-address-details"
            hint={t("branchModal.hints.addressDetails")}
          >
            <textarea
              id="branch-address-details"
              className="neu-input min-h-20 resize-none"
              value={addressDetails}
              placeholder={t("branchModal.placeholders.addressDetails")}
              onChange={(e) => setAddressDetails(e.target.value)}
            />
          </Field>

          {formError ? (
            <p
              role="alert"
              data-testid="branch-modal-error"
              className="text-sm font-medium text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            data-testid="branch-modal-add"
            onClick={handleAdd}
          >
            {t("branchModal.addBranch")}
          </Button>

          <BranchList branches={branches} onRemove={onRemove} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            data-testid="branch-modal-done"
            onClick={() => onOpenChange(false)}
          >
            {t("branchModal.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
