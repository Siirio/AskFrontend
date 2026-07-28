"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

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

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
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
    debounceRef.current = setTimeout(() => {
      api
        .searchAddress(trimmed, controller.signal)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [searchQuery]);

  const pick = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    setFormError(null);
    api
      .reverseGeocode(lat, lng)
      .then((label) => {
        if (label) setAddress(label);
      })
      .catch(() => {
        // The pin is placed either way — reverse geocoding is a convenience,
        // not a requirement; the address field stays editable.
      });
  };

  const resetDraft = () => {
    setName("");
    setAddress("");
    setAddressDetails("");
    setPosition(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleAdd = () => {
    if (!name.trim() || !position || !address.trim()) {
      setFormError(t("branchModal.errors.incomplete"));
      return;
    }
    onAdd({
      name: name.trim(),
      address: address.trim(),
      addressDetails: addressDetails.trim(),
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
              <BranchMapCanvas position={position} onPick={pick} />
            ) : null}
          </div>
          <p className="text-xs text-foreground-subtle">
            {t("branchModal.mapHint")}
          </p>

          <Field label={t("branchModal.fields.name")} htmlFor="branch-name">
            <Input
              id="branch-name"
              autoComplete="off"
              value={name}
              placeholder={t("branchModal.placeholders.name")}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

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
            <p role="alert" className="text-sm font-medium text-destructive">
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
