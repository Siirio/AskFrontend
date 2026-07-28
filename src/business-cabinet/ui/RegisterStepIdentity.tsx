"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import {
  BUSINESS_LEGAL_FORMS,
  legalFormNeedsIdentifier,
  type BusinessLegalForm,
  type SellerOnboardingErrors,
  type SellerOnboardingValues,
} from "../model";
import { CategoryField } from "./CategoryField";
import { Field, fieldErrorId } from "./Field";
import { OptionGroup } from "./OptionGroup";

/**
 * Registration step 1 — who you are: business identity. Proof of trade
 * (verification links) moved to its own step 4 (2026-07-29) — the two no
 * longer share a page, only the `legalForm` decision that gates both.
 */
export function RegisterStepIdentity({
  values,
  errors,
  setField,
  setCategory,
  setLegalForm,
}: {
  values: SellerOnboardingValues;
  errors: SellerOnboardingErrors;
  setField: <K extends keyof SellerOnboardingValues>(
    key: K,
    value: SellerOnboardingValues[K],
  ) => void;
  setCategory: (label: string, categoryId: string | null) => void;
  setLegalForm: (legalForm: BusinessLegalForm) => void;
}) {
  const t = useTranslations("businessCabinet");
  const needsIdentifier = legalFormNeedsIdentifier(values.legalForm);

  return (
    <div className="flex flex-col gap-5">
      <Field
        label={t("fields.businessName")}
        htmlFor="business-name"
        error={errors.businessName ? t(errors.businessName) : undefined}
      >
        <Input
          id="business-name"
          autoComplete="organization"
          value={values.businessName}
          aria-invalid={Boolean(errors.businessName)}
          aria-describedby={
            errors.businessName ? fieldErrorId("business-name") : undefined
          }
          placeholder={t("placeholders.businessName")}
          onChange={(e) => setField("businessName", e.target.value)}
        />
      </Field>

      <CategoryField
        id="business-category"
        value={values.categoryLabel}
        categoryId={values.categoryId}
        error={errors.categoryLabel ? t(errors.categoryLabel) : undefined}
        onChange={setCategory}
      />

      <Field
        label={t("fields.legalForm")}
        htmlFor="business-legal-form"
        hint={t("hints.legalForm")}
        error={errors.legalForm ? t(errors.legalForm) : undefined}
      >
        <OptionGroup
          name="business-legal-form"
          label={t("fields.legalForm")}
          value={values.legalForm}
          invalid={Boolean(errors.legalForm)}
          describedBy={
            errors.legalForm ? fieldErrorId("business-legal-form") : undefined
          }
          options={BUSINESS_LEGAL_FORMS.map((form) => ({
            value: form,
            label: t(`legalForms.${form}`),
            hint: t(`legalFormHints.${form}`),
          }))}
          onChange={setLegalForm}
        />
      </Field>

      {/* The form's ONE branch. A registered entity proves itself with its
          12-digit IIN/BIN; everyone else proves it with links. Exactly one of
          these renders, never both, never neither. */}
      {needsIdentifier ? (
        <>
          <Field
            label={t(`fields.legalIdentifier.${values.legalForm}`)}
            htmlFor="business-legal-identifier"
            hint={t("hints.legalIdentifier")}
            error={
              errors.legalIdentifier ? t(errors.legalIdentifier) : undefined
            }
          >
            <Input
              id="business-legal-identifier"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              dir="ltr"
              value={values.legalIdentifier}
              aria-invalid={Boolean(errors.legalIdentifier)}
              aria-describedby={
                errors.legalIdentifier
                  ? fieldErrorId("business-legal-identifier")
                  : undefined
              }
              placeholder={t("placeholders.legalIdentifier")}
              onChange={(e) =>
                // Digits only, live: the backend's rule is exactly 12 digits,
                // so silently dropping a typed space or dash is a correction
                // the person would otherwise have to make themselves.
                setField(
                  "legalIdentifier",
                  e.target.value.replace(/\D/g, "").slice(0, 12),
                )
              }
            />
          </Field>
          <Field
            label={t("fields.legalName")}
            htmlFor="business-legal-name"
            hint={t("hints.legalName")}
            error={errors.legalName ? t(errors.legalName) : undefined}
          >
            <Input
              id="business-legal-name"
              autoComplete="off"
              value={values.legalName}
              aria-invalid={Boolean(errors.legalName)}
              aria-describedby={
                errors.legalName
                  ? fieldErrorId("business-legal-name")
                  : undefined
              }
              placeholder={t("placeholders.legalName")}
              onChange={(e) => setField("legalName", e.target.value)}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}
