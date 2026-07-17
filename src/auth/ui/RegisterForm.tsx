"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";

import { useRegisterFlow, type VerifyResult } from "../hooks";
import { Field } from "./Field";
import { PasswordInput } from "./PasswordInput";
import { VerifyCodeForm } from "./VerifyCodeForm";

/**
 * Sign up — the backend requires displayName?, email, password (8–128) +
 * confirmation, and an accepted user agreement, then issues an email challenge
 * the shared verify step confirms. The agreement is a slice-private, token-
 * styled checkbox (KISS/rule-of-three — auth is the first consumer, so it stays
 * here rather than promoting a shared/ui primitive).
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
          className="h-11 text-base"
          value={values.displayName}
          aria-invalid={Boolean(errors.displayName)}
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
          className="h-11 text-base"
          value={values.email}
          aria-invalid={Boolean(errors.email)}
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
          placeholder={t("placeholders.password")}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          onChange={(value) => setField("password", value)}
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
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          onChange={(value) => setField("passwordConfirmation", value)}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        {/* The SENTENCE is deliberately NOT inside a <label>: it carries links,
            and a label would toggle the checkbox when one is clicked. Instead a
            label wraps ONLY the box, growing its hit area to the 44px touch
            floor (platform-ui-design §7) while the checkbox keeps its own
            accessible name (a link-free version of the sentence). */}
        <div className="flex min-h-11 items-center justify-center">
          {/* appearance-none + peer'd icon instead of the native accent-color
              checkbox: natives cannot transition, this fades/scales the check
              in. The box is the actionable control, so the checked fill is the
              accent (saturation-is-action holds). */}
          <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center">
            <input
              id="register-agreement"
              type="checkbox"
              aria-label={t("fields.agreementAria")}
              className="peer size-5 appearance-none rounded-xs border border-border-strong bg-surface-raised focus-ring transition-colors checked:border-accent checked:bg-accent aria-invalid:border-destructive"
              checked={values.acceptedUserAgreement}
              aria-invalid={Boolean(errors.acceptedUserAgreement)}
              onChange={(e) =>
                setField("acceptedUserAgreement", e.target.checked)
              }
            />
            <Check
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 m-auto size-3.5 scale-50 text-accent-foreground opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
            />
          </label>
          {/* text-balance evens the two lines — a centred sentence that wraps
              goes ragged (a long first line + an orphan) without it. */}
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
          <p role="alert" className="text-center text-sm text-destructive">
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
    </form>
  );
}
