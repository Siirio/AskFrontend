"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { canAccessDashboard, useAuth } from "@/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";

import { useSellerOnboarding } from "../hooks";
import {
  BUSINESS_LEGAL_FORMS,
  BUSINESS_SCOPES,
  legalFormNeedsIdentifier,
  legalFormNeedsVerification,
} from "../model";
import { CategoryField } from "./CategoryField";
import { Field, fieldErrorId } from "./Field";
import { OptionGroup } from "./OptionGroup";
import { VerificationSources } from "./VerificationSources";

/**
 * The business registration page — PRODUCT_VISION UF 3.1 step 0, "the seller is
 * redirected to the business registration page", built 2026-07-27 on the
 * owner's directive.
 *
 * WHY IT EXISTS. The role-choosing modal has always offered "set up your
 * business", and it always routed to `/app/business` — where
 * `RequireDashboardAccess` bounced the customer-only session that had just
 * chosen it straight back to `/app`. The fork looked live and did nothing. This
 * page is the destination that makes the choice real: it creates the business
 * (`POST /api/v1/business/onboarding`), which promotes the account to
 * BUSINESS_OWNER, and only then is the cabinet reachable.
 *
 * PLACEMENT IS STATUS, as everywhere else in this tree. The page sits at
 * `app/app/(main)/business/register/` — INSIDE `(main)`, so `RequireAuth` still
 * demands a session, and OUTSIDE `business/(cabinet)/`, which is the group that
 * carries `RequireDashboardAccess`. That is the whole trick: a customer must be
 * able to reach this page precisely because they are not a seller yet, and no
 * per-URL allowlist was needed to say so.
 *
 * ALREADY A SELLER? Straight to the cabinet. The backend's own UX contract
 * ("existing business members go to their cabinet instead of seeing another
 * create-business entry") and the fact that a second POST would create a second
 * business both point the same way.
 *
 * WHAT IS DELIBERATELY NOT HERE. `catalogSetupMode` is fixed to MANUAL: the
 * other value, ASK_MANAGED_IMPORT, is contracted to open a managed-import
 * request dialog that does not exist until roadmap #8, so offering it would
 * rebuild the exact dead end this page removes. `countryCode` is fixed to KZ —
 * the legal forms on offer are Kazakhstan's (api.ts). Branch creation is
 * optional at registration and belongs to the cabinet's Branches tab.
 */
export function BusinessRegisterPage() {
  const t = useTranslations("businessCabinet");
  const router = useRouter();
  const { status, user } = useAuth();
  const {
    values,
    setField,
    setLegalForm,
    setCategory,
    toggleSource,
    setLink,
    errors,
    formError,
    pending,
    result,
    submit,
  } = useSellerOnboarding();

  const alreadySeller = canAccessDashboard(user);

  useEffect(() => {
    // Never redirect while the session is still restoring — the same rule the
    // guards follow (D23), for the same reason: `user` is null during loading
    // and would read as "not a seller".
    if (status === "authenticated" && alreadySeller && !result) {
      router.replace("/app/business");
    }
  }, [status, alreadySeller, result, router]);

  useEffect(() => {
    if (result) router.replace(result.targetPath);
  }, [result, router]);

  const needsIdentifier = legalFormNeedsIdentifier(values.legalForm);
  const needsVerification = legalFormNeedsVerification(values.legalForm);
  // The success window: the business exists and the browser is on its way to
  // the cabinet. Showing the form again here would invite a duplicate submit.
  const leaving =
    Boolean(result) || (status === "authenticated" && alreadySeller);

  if (status === "loading" || leaving) {
    // The same shape the route guards show (auth's GuardFallback) — this page
    // is doing the same thing they are: holding the screen while it decides
    // where the person belongs. A bare token utility, no arbitrary value (P9.2).
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-foreground-muted">
        <Spinner
          label={t(result ? "states.creating" : "states.loading")}
          className="size-6"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {t("register.title")}
        </h1>
        <p className="text-sm text-foreground-muted sm:text-base">
          {t("register.subtitle")}
        </p>
      </header>

      <form
        className="neu-card flex flex-col gap-5 px-5 py-7 sm:px-8 sm:py-9"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
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

        <Field label={t("fields.scope")} htmlFor="business-scope">
          <OptionGroup
            name="business-scope"
            label={t("fields.scope")}
            value={values.businessScope}
            options={BUSINESS_SCOPES.map((scope) => ({
              value: scope,
              label: t(`scopes.${scope}`),
            }))}
            onChange={(scope) => setField("businessScope", scope)}
          />
        </Field>

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

        {needsVerification ? (
          <VerificationSources
            selected={values.sources}
            links={values.links}
            sourcesError={errors.sources ? t(errors.sources) : undefined}
            linkErrors={
              errors.links
                ? Object.fromEntries(
                    Object.entries(errors.links).map(([key, value]) => [
                      key,
                      t(value),
                    ]),
                  )
                : undefined
            }
            onToggle={toggleSource}
            onLinkChange={setLink}
          />
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <Spinner label={t("states.creating")} />
          ) : (
            t("actions.createBusiness")
          )}
        </Button>
      </form>
    </div>
  );
}
