"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  legalFormNeedsVerification,
  type SellerOnboardingErrors,
  type SellerOnboardingValues,
} from "../model";
import { fieldErrorId } from "./Field";
import { ToggleRow } from "./ToggleRow";

/** One label/value row in the recap — the whole component is a list of these. */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-foreground-subtle">{label}</span>
      <span className="text-end text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

/**
 * Registration step 5 — review and confirm (new, 2026-07-29, item 10).
 *
 * A read-only recap of everything the previous four steps collected, plus the
 * one thing this page adds: `agreementConfirmed`, a required checkbox
 * gating submit (model.ts `validateOnboarding`). Nothing here is editable —
 * "Back" through the earlier steps is the correction path, matching how the
 * rest of the wizard already treats a mistake (goBack, not an inline edit).
 */
export function RegisterStepReview({
  values,
  errors,
  agreementConfirmed,
  onAgreementChange,
}: {
  values: SellerOnboardingValues;
  errors: SellerOnboardingErrors;
  agreementConfirmed: boolean;
  onAgreementChange: (agreementConfirmed: boolean) => void;
}) {
  const t = useTranslations("businessCabinet");
  const needsVerification = legalFormNeedsVerification(values.legalForm);
  const linkCount = Object.values(values.links).filter((v) => v?.trim())
    .length;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-foreground-muted">{t("review.intro")}</p>

      <div className="neu-card flex flex-col px-4 py-2">
        <ReviewRow label={t("fields.businessName")} value={values.businessName} />
        <ReviewRow
          label={t("fields.category")}
          value={values.categoryLabel || t("review.notSet")}
        />
        <ReviewRow
          label={t("fields.scope")}
          value={t(`scopes.${values.businessScope}`)}
        />
        <ReviewRow
          label={t("fields.catalogSetup")}
          value={t(`catalogSetup.${
            values.catalogSetupMode === "MANUAL" ? "manual" : "managedImport"
          }.title`)}
        />
        <ReviewRow
          label={t("fields.legalForm")}
          value={
            values.legalForm
              ? t(`legalForms.${values.legalForm}`)
              : t("review.notSet")
          }
        />
        {needsVerification ? (
          <ReviewRow
            label={t("fields.verification")}
            value={t("review.linkCount", { count: linkCount })}
          />
        ) : null}
        <ReviewRow
          label={t("fields.deliveryCoverage")}
          value={
            values.deliveryCoverage
              ? t(`deliveryCoverages.${values.deliveryCoverage}`)
              : t("review.notSet")
          }
        />
        {values.deliveryCoverage === "SELECTED_CITIES" ? (
          <ReviewRow
            label={t("fields.deliveryCities")}
            value={values.deliveryCities.join(", ")}
          />
        ) : null}
        <ReviewRow
          label={t("fields.pickup")}
          value={
            values.onlineOnly
              ? t("fields.onlineOnly")
              : t(values.pickupAvailable ? "pickup.yes" : "pickup.no")
          }
        />
        {values.branches.length > 0 ? (
          <ReviewRow
            label={t("review.branchCount")}
            value={String(values.branches.length)}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <ToggleRow
          icon={ShieldCheck}
          label={t("review.agreement")}
          checked={agreementConfirmed}
          onToggle={onAgreementChange}
          indicator="checkbox"
          invalid={Boolean(errors.agreementConfirmed)}
          describedBy={
            errors.agreementConfirmed
              ? fieldErrorId("business-agreement")
              : undefined
          }
          testId="business-agreement"
        />
        {errors.agreementConfirmed ? (
          <p
            id={fieldErrorId("business-agreement")}
            role="alert"
            className="ps-1 text-sm font-medium text-destructive"
          >
            {t(errors.agreementConfirmed)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
