"use client";

import { useState } from "react";
import { Plus, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DELIVERY_COVERAGES,
  type DeliveryCoverage,
  type DraftBranch,
  type SellerOnboardingErrors,
  type SellerOnboardingValues,
} from "../model";
import { BranchList } from "./BranchList";
import { BranchMapModal } from "./BranchMapModal";
import { DeliveryCitiesField } from "./DeliveryCitiesField";
import { Field, fieldErrorId } from "./Field";
import { OptionGroup } from "./OptionGroup";
import { ToggleRow } from "./ToggleRow";

/**
 * Registration step 3 — how the business reaches customers, now also where
 * its physical branches live (2026-07-29, item 9).
 *
 * "Only online" (item 4) is a client-side shortcut, not a backend field: it
 * forces `pickupAvailable: false` and empties any drafted branches
 * (hooks.ts `setOnlineOnly`), so a seller who has no physical presence never
 * sees the pickup question or the map at all. Answering "PickUp available:
 * Yes" opens `BranchMapModal`; every branch drafted there travels inline as
 * `SellerOnboardingRequest.pickupBranches` on submit (model.ts
 * `toOnboardingRequest`), created atomically with the business.
 */
export function RegisterStepDelivery({
  values,
  errors,
  setDeliveryCoverage,
  addDeliveryCity,
  removeDeliveryCity,
  setOnlineOnly,
  setPickupAvailable,
  addBranch,
  updateBranch,
  removeBranch,
}: {
  values: SellerOnboardingValues;
  errors: SellerOnboardingErrors;
  setDeliveryCoverage: (coverage: DeliveryCoverage) => void;
  addDeliveryCity: (city: string) => void;
  removeDeliveryCity: (city: string) => void;
  setOnlineOnly: (onlineOnly: boolean) => void;
  setPickupAvailable: (pickupAvailable: boolean) => void;
  addBranch: (branch: Omit<DraftBranch, "draftId">) => void;
  updateBranch: (draftId: string, branch: Omit<DraftBranch, "draftId">) => void;
  removeBranch: (draftId: string) => void;
}) {
  const t = useTranslations("businessCabinet");
  const [mapOpen, setMapOpen] = useState(false);
  // Non-null while editing an already-drafted branch (item 11, 2026-08-05) —
  // set from `BranchList`'s edit action, read by `BranchMapModal` to seed
  // the form instead of starting empty. Cleared whenever the modal closes,
  // by ANY means, so a later "Add another branch" always opens fresh rather
  // than on a stale edit target.
  const [editingBranch, setEditingBranch] = useState<DraftBranch | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <Field
        label={t("fields.deliveryCoverage")}
        htmlFor="business-delivery-coverage"
        error={errors.deliveryCoverage ? t(errors.deliveryCoverage) : undefined}
      >
        <OptionGroup
          name="business-delivery-coverage"
          label={t("fields.deliveryCoverage")}
          value={values.deliveryCoverage}
          invalid={Boolean(errors.deliveryCoverage)}
          describedBy={
            errors.deliveryCoverage
              ? fieldErrorId("business-delivery-coverage")
              : undefined
          }
          options={DELIVERY_COVERAGES.map((coverage) => ({
            value: coverage,
            label: t(`deliveryCoverages.${coverage}`),
          }))}
          onChange={setDeliveryCoverage}
        />
      </Field>

      {values.deliveryCoverage === "SELECTED_CITIES" ? (
        <DeliveryCitiesField
          id="business-delivery-cities"
          cities={values.deliveryCities}
          error={errors.deliveryCities ? t(errors.deliveryCities) : undefined}
          onAdd={addDeliveryCity}
          onRemove={removeDeliveryCity}
        />
      ) : null}

      {/* The same `.neu-rule` divider the wizard's own steps use — cities
          and the online-only switch answer two different questions and sat
          only a `gap-8` apart, which read as one continuous block (owner
          report). */}
      <div aria-hidden="true" className="neu-rule w-full" />

      <ToggleRow
        icon={Wifi}
        label={t("fields.onlineOnly")}
        description={t("hints.onlineOnly")}
        checked={values.onlineOnly}
        onToggle={setOnlineOnly}
        indicator="switch"
        testId="business-online-only"
      />

      {!values.onlineOnly ? (
        <>
          <Field
            label={t("fields.pickup")}
            htmlFor="business-pickup"
            error={
              errors.pickupAvailable ? t(errors.pickupAvailable) : undefined
            }
          >
            <OptionGroup
              name="business-pickup"
              label={t("fields.pickup")}
              value={
                values.pickupAvailable === null
                  ? null
                  : values.pickupAvailable
                    ? "YES"
                    : "NO"
              }
              invalid={Boolean(errors.pickupAvailable)}
              describedBy={
                errors.pickupAvailable
                  ? fieldErrorId("business-pickup")
                  : undefined
              }
              options={[
                { value: "YES", label: t("pickup.yes") },
                { value: "NO", label: t("pickup.no") },
              ]}
              onChange={(value) => {
                const pickupAvailable = value === "YES";
                setPickupAvailable(pickupAvailable);
                if (pickupAvailable) setMapOpen(true);
              }}
            />
          </Field>

          {values.pickupAvailable ? (
            <div className="flex flex-col gap-2">
              {/* Same label typography `Field` gives "Which cities?" — this
                  block isn't a single input, so it doesn't use `Field`
                  itself (its `label htmlFor` expects one control), but the
                  branches list reads as its own answer, not a trailing
                  continuation of the Yes/No control above it, only with a
                  matching title (owner request, 2026-08-05). */}
              <p className="ps-1 text-sm font-semibold text-foreground-muted">
                {t("fields.branches")}
              </p>
              <BranchList
                branches={values.branches}
                onRemove={removeBranch}
                onEdit={(branch) => {
                  setEditingBranch(branch);
                  setMapOpen(true);
                }}
              />
              {/* Full width, not `w-fit` — a small button floating under a
                  full-width city field/branch list read as an odd-sized
                  extra piece (owner report, 2026-08-05: "search bar on whole
                  width but button add branches is not"). The `Plus` matches
                  the icon vocabulary the cities/branches lists just gained. */}
              <button
                type="button"
                className="neu-btn w-full px-4 py-2 text-sm font-semibold focus-ring"
                onClick={() => {
                  // Always starts a fresh add, even if the last thing this
                  // button's sibling edit action did left `editingBranch`
                  // set — `BranchMapModal`'s own close handler already
                  // clears it on every close, but this guards the case
                  // where the modal was never actually closed in between.
                  setEditingBranch(null);
                  setMapOpen(true);
                }}
              >
                <Plus aria-hidden="true" className="size-4" />
                {t("branchModal.addAnotherBranch")}
              </button>
            </div>
          ) : null}

          <BranchMapModal
            open={mapOpen}
            onOpenChange={(next) => {
              setMapOpen(next);
              if (!next) setEditingBranch(null);
            }}
            branches={values.branches}
            onAdd={addBranch}
            onUpdate={updateBranch}
            onRemove={removeBranch}
            editingBranch={editingBranch}
          />
        </>
      ) : null}
    </div>
  );
}
