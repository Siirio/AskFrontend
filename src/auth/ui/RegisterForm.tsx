"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";

import { useRegisterFlow, type VerifyResult } from "../hooks";
import { Field, fieldErrorId } from "./Field";
import { OAuthOptions } from "./OAuthOptions";
import { PasswordInput } from "./PasswordInput";
import { VerifyCodeForm } from "./VerifyCodeForm";

/**
 * Sign up — the backend requires displayName?, email, password (8–128) +
 * confirmation, and an accepted user agreement, then issues an email challenge
 * the shared verify step confirms.
 *
 * The agreement checkbox stays slice-private (D8 rule of three — auth is still
 * the only consumer), but its LOOK is not: it wears `.neu-checkbox-box` from
 * design-system/neumorphism.css, so when a second consumer appears the shared
 * primitive it gets promoted into already matches this one by construction.
 * Values live in the design system, ownership stays with the slice (P9.2).
 */
export function RegisterForm({
  onAuthenticated,
}: {
  onAuthenticated: (result: VerifyResult) => void;
}) {
  const t = useTranslations("auth");
  const { values, setField, errors, pending, challenge, submit, reset } =
    useRegisterFlow();
  // ONE visibility state for password + confirmation: either eye flips both.
  const [showPassword, setShowPassword] = useState(false);

  if (challenge) {
    return (
      <VerifyCodeForm
        authChallengeId={challenge.authChallengeId}
        sentTo={challenge.maskedDestination}
        onAuthenticated={onAuthenticated}
        onBack={reset}
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <Field
        label={t("fields.name")}
        htmlFor="register-name"
        error={errors.displayName}
      >
        <Input
          id="register-name"
          autoComplete="name"
          value={values.displayName}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={
            errors.displayName ? fieldErrorId("register-name") : undefined
          }
          placeholder={t("placeholders.name")}
          onChange={(e) => setField("displayName", e.target.value)}
        />
      </Field>
      <Field
        label={t("fields.email")}
        htmlFor="register-email"
        error={errors.email}
      >
        <Input
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? fieldErrorId("register-email") : undefined
          }
          placeholder={t("placeholders.email")}
          onChange={(e) => setField("email", e.target.value)}
        />
      </Field>
      <Field
        label={t("fields.password")}
        htmlFor="register-password"
        error={errors.password}
      >
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          value={values.password}
          invalid={Boolean(errors.password)}
          describedBy={
            errors.password ? fieldErrorId("register-password") : undefined
          }
          placeholder={t("placeholders.password")}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          onValueChange={(value) => setField("password", value)}
        />
      </Field>
      <Field
        label={t("fields.passwordConfirmation")}
        htmlFor="register-password-confirm"
        error={errors.passwordConfirmation}
      >
        <PasswordInput
          id="register-password-confirm"
          autoComplete="new-password"
          value={values.passwordConfirmation}
          invalid={Boolean(errors.passwordConfirmation)}
          describedBy={
            errors.passwordConfirmation
              ? fieldErrorId("register-password-confirm")
              : undefined
          }
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          onValueChange={(value) => setField("passwordConfirmation", value)}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        {/* The SENTENCE is deliberately NOT inside a <label>: it carries links,
            and a label would toggle the checkbox when one is clicked. Instead a
            label wraps ONLY the box, growing its hit area to the 44px touch
            floor (platform-ui-design §7) while the checkbox keeps its own
            accessible name (a link-free version of the sentence). */}
        <div className="flex min-h-11 items-center justify-center">
          {/* `appearance-none` on the native box, with the visible control
              drawn beside it: a native checkbox cannot be given an inset
              shadow, and the whole point of the skin's checkbox is that
              unchecked reads as an empty SOCKET. The box is the actionable
              control, so the checked fill is the accent — saturation-is-action
              still holds. */}
          <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center">
            {/* The native input is the control — it keeps the checkbox role,
                the label association, keyboard toggling and the form value. It
                is made invisible rather than replaced, and `.neu-checkbox-box`
                below is painted from its :checked state via `peer`. */}
            <input
              id="register-agreement"
              type="checkbox"
              aria-label={t("fields.agreementAria")}
              className="peer absolute size-6.5 cursor-pointer appearance-none rounded-md focus-ring"
              checked={values.acceptedUserAgreement}
              aria-invalid={Boolean(errors.acceptedUserAgreement)}
              aria-describedby={
                errors.acceptedUserAgreement
                  ? fieldErrorId("register-agreement")
                  : undefined
              }
              onChange={(e) =>
                setField("acceptedUserAgreement", e.target.checked)
              }
            />
            {/* `.neu-checkbox-box` (design-system/neumorphism.css) is the skin's
                checkbox: an empty SOCKET carved into the surface, which the
                accent fills when checked — unchecked/checked is inset vs raised
                fill, the same depth grammar as every other control here. It
                carries no text, so the accent gradient is legal on it.
                `data-on` is what the CSS reads; it is driven from the same
                state the input is, so the two can never disagree. */}
            <span
              aria-hidden="true"
              data-on={values.acceptedUserAgreement}
              className="neu-checkbox-box pointer-events-none"
            >
              {values.acceptedUserAgreement ? (
                <Check className="size-3.5" strokeWidth={3.5} />
              ) : null}
            </span>
          </label>
          <span className="text-start text-sm text-foreground-muted">
            {t.rich("fields.agreement", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  className="rounded-xs font-medium text-accent underline underline-offset-2 focus-ring transition-colors"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="rounded-xs font-medium text-accent underline underline-offset-2 focus-ring transition-colors"
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </div>
        {errors.acceptedUserAgreement ? (
          <p
            id={fieldErrorId("register-agreement")}
            role="alert"
            className="text-center text-sm text-destructive"
          >
            {errors.acceptedUserAgreement}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <Spinner label={t("actions.sending")} />
        ) : (
          t("actions.createAccount")
        )}
      </Button>
      <OAuthOptions />
    </form>
  );
}
