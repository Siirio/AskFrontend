"use client";

import { useTranslations } from "next-intl";

import {
  DELIVERY_COVERAGES,
  type DeliveryCoverage,
  type SellerOnboardingErrors,
  type SellerOnboardingValues,
} from "../model";
import { DeliveryCitiesField } from "./DeliveryCitiesField";
import { Field, fieldErrorId } from "./Field";
import { OptionGroup } from "./OptionGroup";

/**
 * Registration step 3 — how the business reaches customers.
 *
 * `deliveryCoverage` and `pickupAvailable` are both `@NotNull` on the backend
 * (SellerOnboardingRequest, contracts.md 2026-07-28), so — with step 1 — this
 * is the other step `goNext` can actually refuse to leave.
 */
export function RegisterStepDelivery({
  values,
  errors,
  setDeliveryCoverage,
  addDeliveryCity,
  removeDeliveryCity,
  setPickupAvailable,
}: {
  values: SellerOnboardingValues;
  errors: SellerOnboardingErrors;
  setDeliveryCoverage: (coverage: DeliveryCoverage) => void;
  addDeliveryCity: (city: string) => void;
  removeDeliveryCity: (city: string) => void;
  setPickupAvailable: (pickupAvailable: boolean) => void;
}) {
  const t = useTranslations("businessCabinet");

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

      <Field
        label={t("fields.pickup")}
        htmlFor="business-pickup"
        error={errors.pickupAvailable ? t(errors.pickupAvailable) : undefined}
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
            errors.pickupAvailable ? fieldErrorId("business-pickup") : undefined
          }
          options={[
            { value: "YES", label: t("pickup.yes") },
            { value: "NO", label: t("pickup.no") },
          ]}
          onChange={(value) => setPickupAvailable(value === "YES")}
        />
      </Field>
    </div>
  );
}
