"use client";

import { useState } from "react";
import { Wifi } from "lucide-react";
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
  removeBranch: (draftId: string) => void;
}) {
  const t = useTranslations("businessCabinet");
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
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
              <BranchList branches={values.branches} onRemove={removeBranch} />
              <button
                type="button"
                className="neu-btn w-fit px-4 py-2 text-sm font-semibold focus-ring"
                onClick={() => setMapOpen(true)}
              >
                {t("branchModal.addAnotherBranch")}
              </button>
            </div>
          ) : null}

          <BranchMapModal
            open={mapOpen}
            onOpenChange={setMapOpen}
            branches={values.branches}
            onAdd={addBranch}
            onRemove={removeBranch}
          />
        </>
      ) : null}
    </div>
  );
}
