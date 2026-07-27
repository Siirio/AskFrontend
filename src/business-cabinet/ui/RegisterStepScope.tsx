"use client";

import { useTranslations } from "next-intl";

import { BUSINESS_SCOPES, type BusinessScope } from "../model";
import { Field } from "./Field";
import { OptionGroup } from "./OptionGroup";

/**
 * Registration step 2 — what you sell.
 *
 * The one field here (`businessScope`) always has a default, so this step can
 * never block `goNext` (model.ts `validateOnboardingStep` returns nothing for
 * step 2) — it exists as its own step because it is its own DECISION, not
 * because it needs validation.
 */
export function RegisterStepScope({
  value,
  onChange,
}: {
  value: BusinessScope;
  onChange: (scope: BusinessScope) => void;
}) {
  const t = useTranslations("businessCabinet");

  return (
    <Field label={t("fields.scope")} htmlFor="business-scope">
      <OptionGroup
        name="business-scope"
        label={t("fields.scope")}
        value={value}
        options={BUSINESS_SCOPES.map((scope) => ({
          value: scope,
          label: t(`scopes.${scope}`),
        }))}
        onChange={onChange}
      />
    </Field>
  );
}
