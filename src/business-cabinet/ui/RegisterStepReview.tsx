"use client";

import { MapPin, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  legalFormNeedsVerification,
  VERIFICATION_SOURCES,
  type SellerOnboardingErrors,
  type SellerOnboardingValues,
} from "../model";
import { BranchList } from "./BranchList";
import { fieldErrorId } from "./Field";
import { ToggleRow } from "./ToggleRow";

/** The section break inside the recap card — the same `.neu-rule` divider
 *  used elsewhere in the wizard, sized for sitting BETWEEN rows that already
 *  carry their own `py-2` rather than inside a `gap`-spaced column. */
function ReviewSectionBreak() {
  return <div aria-hidden="true" className="neu-rule my-1 w-full" />;
}

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

/** Like `ReviewRow`, but for a value that is itself a short list (the
 *  verification links, the drafted branches) rather than one line — the
 *  label sits above its own block instead of beside a single string. */
function ReviewDetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <span className="text-sm text-foreground-subtle">{label}</span>
      {children}
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
 *
 * **Broken into sections, and cities got the same list treatment as links
 * and branches (2026-08-05, owner report: "banch of informations without
 * visual dividing/separation, branches and links raised cards but cities
 * just ordinary text").** `ReviewSectionBreak` (a `.neu-rule`) now sits
 * between the four groups this data actually came from — identity/contact
 * (step 1's business name through email), setup (scope/catalog/legal form,
 * also step 1–2), proof of trade (step 4's links, only when
 * `needsVerification`), and delivery (step 3) — rather than one continuous
 * column of rows with no seams. Delivery cities render as the same
 * `.neu-row` + `MapPin` chip list `DeliveryCitiesField` and `BranchList` use
 * one step up, not a comma-joined string — a seller confirming the recap
 * should see the same shape of list they just built, not a flattened
 * summary of it.
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
  const filledSources = VERIFICATION_SOURCES.filter((source) =>
    values.links[source]?.trim(),
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-foreground-muted">{t("review.intro")}</p>

      <div className="neu-card flex flex-col px-4 py-2">
        <ReviewRow
          label={t("fields.businessName")}
          value={values.businessName}
        />
        <ReviewRow
          label={t("fields.category")}
          value={values.categoryLabel || t("review.notSet")}
        />
        {/* Both are optional, and "not set" is shown rather than the row being
         *  hidden — these become the public contact channels on every result
         *  card, so a seller about to publish with none should SEE that. */}
        <ReviewRow
          label={t("review.phone")}
          value={values.phone.trim() || t("review.notSet")}
        />
        <ReviewRow
          label={t("review.corporateEmail")}
          value={values.corporateEmail.trim() || t("review.notSet")}
        />

        <ReviewSectionBreak />

        <ReviewRow
          label={t("fields.scope")}
          value={t(`scopes.${values.businessScope}`)}
        />
        <ReviewRow
          label={t("fields.catalogSetup")}
          value={t(
            `catalogSetup.${
              values.catalogSetupMode === "MANUAL" ? "manual" : "managedImport"
            }.title`,
          )}
        />
        <ReviewRow
          label={t("fields.legalForm")}
          value={
            values.legalForm
              ? t(`legalForms.${values.legalForm}`)
              : t("review.notSet")
          }
        />

        <ReviewSectionBreak />

        {needsVerification ? (
          filledSources.length > 0 ? (
            <ReviewDetailRow label={t("fields.verification")}>
              <ul className="flex flex-col gap-1.5">
                {filledSources.map((source) => (
                  <li
                    key={source}
                    className="neu-row flex flex-col gap-0.5 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {t(`sources.${source}`)}
                    </span>
                    <span className="text-xs break-all text-foreground-subtle">
                      {values.links[source]}
                    </span>
                  </li>
                ))}
              </ul>
            </ReviewDetailRow>
          ) : (
            <ReviewRow
              label={t("fields.verification")}
              value={t("review.linkCount", { count: 0 })}
            />
          )
        ) : null}

        {needsVerification ? <ReviewSectionBreak /> : null}

        <ReviewRow
          label={t("fields.deliveryCoverage")}
          value={
            values.deliveryCoverage
              ? t(`deliveryCoverages.${values.deliveryCoverage}`)
              : t("review.notSet")
          }
        />
        {values.deliveryCoverage === "SELECTED_CITIES" &&
        values.deliveryCities.length > 0 ? (
          <ReviewDetailRow label={t("fields.deliveryCities")}>
            <ul className="flex flex-wrap gap-2">
              {values.deliveryCities.map((city) => (
                <li
                  key={city}
                  className="neu-row flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-foreground"
                >
                  <MapPin
                    aria-hidden="true"
                    className="size-3.5 text-foreground-subtle"
                  />
                  {city}
                </li>
              ))}
            </ul>
          </ReviewDetailRow>
        ) : null}
        <ReviewRow
          label={t("fields.pickup")}
          value={
            values.onlineOnly
              ? t("fields.onlineOnly")
              : t(values.pickupAvailable ? "pickup.yes" : "pickup.no")
          }
        />
        {/* `pickupAvailable` gates this, not just a non-empty list — branches
            now survive toggling "online only"/"No" (2026-08-05), so a stale
            draft from before either of those can exist in `values.branches`
            without being anywhere close to submission. Matches
            `toOnboardingRequest`'s own gate exactly (model.ts), so this
            recap never shows a branch that will not actually be sent. */}
        {values.pickupAvailable && values.branches.length > 0 ? (
          <ReviewDetailRow label={t("review.branchCount")}>
            <BranchList branches={values.branches} />
          </ReviewDetailRow>
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
