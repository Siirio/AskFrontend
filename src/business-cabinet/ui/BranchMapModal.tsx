"use client";

import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

import { AddressSelect, formatKzAddress } from "@/shared/ui/address-select";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import { useBranchLocation } from "../hooks";
import type { DraftBranch } from "../model";
import { BranchList } from "./BranchList";
import { Field } from "./Field";

/** Leaflet touches `window` at import time — loaded only on the client, only
 *  once the modal actually opens. */
const BranchMapCanvas = dynamic(() => import("./BranchMapCanvas"), {
  ssr: false,
});

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
 * **The address is answered in two STAGES, by two DIFFERENT controls, on
 * purpose (2026-07-31) — but ONE visible text field (2026-08-05).** The KATO
 * cascade (`@/shared/ui/address-select`) answers WHICH PLACE — oblast,
 * district, settlement — from the state registry; the address field below it
 * answers where in it, and doubles as the map search. They are not redundant:
 * OSM's free text is whatever a volunteer typed, in whichever language and
 * transliteration, while KATO is the registry the seller's own documents use.
 * `CreateBranchRequest` has exactly one `address` string and no administrative
 * fields, so the two are composed into that one line by `formatKzAddress` — no
 * invented DTO field (P9.4, Data Lock). **What changed 2026-08-05:** the
 * street field and a separate "Search for an address" box used to be two
 * inputs holding the same kind of text at the same time — reported as
 * confusing on sight. They are now one control: typing it both IS the
 * submitted value and searches Nominatim, offering a dropdown while the pin
 * quietly follows the top match.
 *
 * **The whole draft, including the KATO place, now survives a close or a
 * reload (2026-08-05).** `AddressSelect` takes `value={location.place}` —
 * its seed-once prop, added for exactly this — so the cascade restores
 * itself instead of coming back empty every time this modal remounts
 * (Radix unmounts `DialogContent` on close; a page reload does the rest).
 *
 * The place/pin/address/suggestion state and its Nominatim sync live in
 * `useBranchLocation` (hooks.ts, §3) — both directions of the sync (pin →
 * field via reverse-geocode, field → pin via forward-geocode) are there, not
 * here.
 *
 * Stays open across multiple "Add Branch" clicks — a seller with three
 * locations should not reopen the modal three times.
 *
 * **Editing an already-drafted branch (2026-08-05, item 11) reuses this same
 * modal rather than a second form.** `editingBranch` (set by the caller,
 * `RegisterStepDelivery`, from `BranchList`'s new edit action) seeds every
 * field — including the KATO cascade, via `DraftBranch.place` and
 * `useBranchLocation.load` — instead of starting empty. The submit button
 * branches to `onUpdate` instead of `onAdd`, and unlike a fresh add (which
 * stays open for a multi-add spree), a successful EDIT closes the modal —
 * editing one specific branch is a single, complete action, not the start of
 * a sequence. Closing WITHOUT saving discards the in-progress edit (unlike
 * add mode, where closing deliberately preserves the draft) — reopening
 * "Add another branch" right after a cancelled edit must start empty, not
 * resume someone else's half-finished changes.
 */
export function BranchMapModal({
  open,
  onOpenChange,
  branches,
  onAdd,
  onUpdate,
  onRemove,
  editingBranch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: DraftBranch[];
  onAdd: (branch: Omit<DraftBranch, "draftId">) => void;
  onUpdate: (draftId: string, branch: Omit<DraftBranch, "draftId">) => void;
  onRemove: (draftId: string) => void;
  /** Non-null while editing an existing branch; `null` for a fresh add. */
  editingBranch: DraftBranch | null;
}) {
  const t = useTranslations("businessCabinet");
  const locale = useLocale();

  const [formError, setFormError] = useState<string | null>(null);
  // Remounts AddressSelect after a successful add/edit-seed, so the cascade
  // clears/reseeds with the rest of the draft. The control owns its
  // selection state deliberately (see its header) — a key is the sanctioned
  // way to reset it, and it beats growing a `value` prop that only this one
  // caller would ever set.
  const [placeKey, setPlaceKey] = useState(0);

  const location = useBranchLocation(locale);

  const handlePick = (lat: number, lng: number) => {
    setFormError(null);
    location.pick(lat, lng);
  };

  const resetDraft = () => {
    setPlaceKey((k) => k + 1);
    location.reset();
  };

  // Seeds the draft from the branch being edited every time editing STARTS
  // (a fresh open, or switching which branch is being edited) — keyed on the
  // primitive `draftId` rather than `location`/`location.load`, which are
  // new object/function identities every render and would re-fire this on
  // every keystroke if included.
  useEffect(() => {
    if (open && editingBranch) {
      setFormError(null);
      location.load(editingBranch);
      setPlaceKey((k) => k + 1);
    }
  }, [open, editingBranch?.draftId]);

  const handleOpenChange = (next: boolean) => {
    if (!next && editingBranch) {
      // Cancelled without saving — an edit's draft must NOT survive a close
      // the way an add's does, or the next "Add another branch" would open
      // on someone else's half-edited fields instead of an empty form.
      resetDraft();
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const { place, position, address, name, addressDetails } = location;
    if (!name.trim() || !position || !place?.complete || !address.trim()) {
      setFormError(t("branchModal.errors.incomplete"));
      return;
    }
    const draft: Omit<DraftBranch, "draftId"> = {
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
      place,
    };
    if (editingBranch) {
      onUpdate(editingBranch.draftId, draft);
    } else {
      onAdd(draft);
    }
    resetDraft();
    // Add stays open for a multi-add spree (existing behaviour); edit closes
    // — it is one specific branch's correction, not the start of a sequence.
    if (editingBranch) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* max-h + overflow-y-auto: this modal's content (search, map, three
          fields, the drafted-branch list) routinely exceeds the viewport —
          unlike every other Dialog caller, which fits without scrolling.
          Found by e2e: the Done button became unreachable off-screen with no
          way to scroll to it (2026-07-29). */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingBranch
              ? t("branchModal.editTitle")
              : t("branchModal.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label={t("branchModal.fields.name")} htmlFor="branch-name">
            <Input
              id="branch-name"
              autoComplete="off"
              value={location.name}
              placeholder={t("branchModal.placeholders.name")}
              onChange={(e) => location.setName(e.target.value)}
            />
          </Field>

          <AddressSelect
            key={placeKey}
            value={location.place}
            onChange={location.setPlace}
          />

          {/* Everything below describes a point INSIDE the chosen place, so
              nothing below is asked until the place is settled — and changing
              the place clears all of it (`useBranchLocation.setPlace`).
              Ordering the form this way is what makes that reset harmless:
              widest question first, exactly the order the address itself is
              written in. Before this, the map sat on top and a seller who
              pinned first lost the pin the moment they answered the cascade. */}
          {location.place?.complete ? (
            <>
              {/* ONE field, not two (merged 2026-08-05): it IS the submitted
                  address, and typing it also searches Nominatim — the pin
                  quietly follows the top match, and the dropdown stays
                  available for picking a different one. A separate "search"
                  box above the map used to sit right next to this and hold
                  the same kind of text at the same time, which read as the
                  same control shown twice. */}
              <Field
                label={t("branchModal.fields.address")}
                htmlFor="branch-address"
              >
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 inset-s-3 my-auto size-4 text-foreground-subtle"
                  />
                  <Input
                    id="branch-address"
                    autoComplete="off"
                    className="ps-9"
                    value={location.address}
                    placeholder={t("branchModal.placeholders.address")}
                    onChange={(e) => location.setAddress(e.target.value)}
                    onFocus={() => location.setSearchOpen(true)}
                    onBlur={() =>
                      setTimeout(() => location.setSearchOpen(false), 120)
                    }
                  />
                  {location.searchOpen && location.suggestions.length > 0 ? (
                    <ul className="neu-card absolute inset-x-0 top-full z-20 mt-2 max-h-48 overflow-y-auto p-1.5">
                      {location.suggestions.map((s, i) => (
                        <li key={`${s.lat}-${s.lng}-${i}`}>
                          <button
                            type="button"
                            className="neu-menu-item flex w-full cursor-pointer items-start gap-2 px-3 py-2.5 text-start text-sm font-medium"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handlePick(s.lat, s.lng);
                              location.setSuggestions([]);
                              location.setSearchOpen(false);
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
              </Field>

              <div className="h-64 w-full sm:h-80" data-testid="branch-map">
                {open ? (
                  <BranchMapCanvas
                    position={location.position}
                    focus={location.placeFocus}
                    onPick={handlePick}
                  />
                ) : null}
              </div>
              <p className="text-xs text-foreground-subtle">
                {t("branchModal.mapHint")}
              </p>
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
              value={location.addressDetails}
              placeholder={t("branchModal.placeholders.addressDetails")}
              onChange={(e) => location.setAddressDetails(e.target.value)}
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
            onClick={handleSubmit}
          >
            {editingBranch
              ? t("branchModal.saveChanges")
              : t("branchModal.addBranch")}
          </Button>

          {/* Same `.neu-rule` divider the form fields use between steps — the
              "Add branch" button and the drafted-branch list below it read as
              one undifferentiated block without it (owner report). Gated on
              having branches to divide: an empty `BranchList` renders `null`,
              and a rule sitting above nothing reads as a stray trailing line. */}
          {branches.length > 0 ? (
            <div aria-hidden="true" className="neu-rule w-full" />
          ) : null}

          <BranchList branches={branches} onRemove={onRemove} />
        </div>

        <DialogFooter>
          <Button
            type="button"
            data-testid="branch-modal-done"
            onClick={() => handleOpenChange(false)}
          >
            {t("branchModal.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
