"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { canAccessDashboard, useAuth } from "@/auth";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

import { useSellerOnboarding } from "../hooks";
import { ONBOARDING_STEP_COUNT } from "../model";
import { RegisterStepDelivery } from "./RegisterStepDelivery";
import { RegisterStepIdentity } from "./RegisterStepIdentity";
import { RegisterStepScope } from "./RegisterStepScope";

/** Ordered 1:1 with `OnboardingStep` — `step - 1` indexes straight in. */
const STEP_TITLE_KEYS = ["identity", "scope", "delivery"] as const;

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
 * THREE STEPS, not one long form (2026-07-28) — identity+proof, what you sell,
 * delivery+pickup — mirroring the grouping the retired React Router frontend's
 * `SellerOnboardingPage` used, minus the two pieces this repo's own docs
 * already exclude: the branch-drafting/map-picker modal for pickup (branch
 * creation belongs to the cabinet's Branches tab, per ux-ui-flow.md) and the
 * `ASK_MANAGED_IMPORT` choice (parked until roadmap #8's import dialog
 * exists). `useSellerOnboarding`'s `goNext` validates ONLY the current step
 * (`validateOnboardingStep`, model.ts) — never the whole form ahead of time,
 * which would surface a step-3 error the instant step 2 is left, before the
 * person has touched step 3 at all. Each field's own handler already clears
 * its error the moment it's fixed, so `goNext` only ever needs to reveal.
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
    setDeliveryCoverage,
    addDeliveryCity,
    removeDeliveryCity,
    errors,
    formError,
    pending,
    result,
    step,
    goNext,
    goBack,
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

  const isLastStep = step === ONBOARDING_STEP_COUNT;

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
        className="neu-card flex flex-col gap-6 px-5 py-7 sm:px-8 sm:py-9"
        onSubmit={(e) => {
          e.preventDefault();
          if (isLastStep) void submit();
          else goNext();
        }}
        noValidate
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground-subtle">
            {t("register.progress", { step, total: ONBOARDING_STEP_COUNT })}
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {t(`register.steps.${STEP_TITLE_KEYS[step - 1]}`)}
          </h2>
        </div>

        {/* A resting groove, not a hairline border — depth is the skin's
            divider vocabulary (D25). Visibility fix lives in `.neu-rule`
            itself now (design-system/neumorphism.css, 2026-07-28: the class
            was fill-less everywhere, nearly invisible full-width in dark),
            so this is just the base class at full width. */}
        <div aria-hidden="true" className="neu-rule w-full" />

        {step === 1 ? (
          <RegisterStepIdentity
            values={values}
            errors={errors}
            setField={setField}
            setCategory={setCategory}
            setLegalForm={setLegalForm}
            toggleSource={toggleSource}
            setLink={setLink}
          />
        ) : null}

        {step === 2 ? (
          <RegisterStepScope
            value={values.businessScope}
            onChange={(scope) => setField("businessScope", scope)}
          />
        ) : null}

        {step === 3 ? (
          <RegisterStepDelivery
            values={values}
            errors={errors}
            setDeliveryCoverage={setDeliveryCoverage}
            addDeliveryCity={addDeliveryCity}
            removeDeliveryCity={removeDeliveryCity}
            setPickupAvailable={(pickupAvailable) =>
              setField("pickupAvailable", pickupAvailable)
            }
          />
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        ) : null}

        <div aria-hidden="true" className="neu-rule w-full" />

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            data-testid="register-back"
            onClick={goBack}
            disabled={step === 1 || pending}
          >
            {t("actions.back")}
          </Button>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? (
              <Spinner label={t("states.creating")} />
            ) : isLastStep ? (
              t("actions.createBusiness")
            ) : (
              t("actions.next")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
