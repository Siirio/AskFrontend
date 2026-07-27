"use client";

/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button_old";
import { Input } from "@/shared/ui/input_old";
import { Spinner } from "@/shared/ui/spinner_old";

import { useLoginFlow, type VerifyResult } from "../hooks";
import { Field, fieldErrorId } from "./Field_old";
import { OAuthOptions } from "./OAuthOptions_old";
import { PasswordInput } from "./PasswordInput_old";
import { VerifyCodeForm } from "./VerifyCodeForm_old";

/**
 * Log in — email + password (POST /auth/login). A session comes back directly
 * and is handed up; if the account has two-factor enabled the backend returns a
 * challenge instead, and the shared verify step takes over.
 */
export function LoginForm({
  onAuthenticated,
}: {
  onAuthenticated: (result: VerifyResult) => void;
}) {
  const t = useTranslations("auth");
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    formError,
    pending,
    challenge,
    result,
    submit,
    reset,
  } = useLoginFlow();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (result) onAuthenticated(result);
  }, [result, onAuthenticated]);

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
        label={t("fields.email")}
        htmlFor="login-email"
        error={errors.email}
      >
        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-11 text-base"
          value={email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? fieldErrorId("login-email") : undefined
          }
          placeholder={t("placeholders.email")}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field
        label={t("fields.password")}
        htmlFor="login-password"
        error={errors.password}
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          value={password}
          invalid={Boolean(errors.password)}
          describedBy={
            errors.password ? fieldErrorId("login-password") : undefined
          }
          placeholder={t("placeholders.passwordLogin")}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          onValueChange={setPassword}
        />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <Spinner label={t("actions.sending")} />
        ) : (
          t("actions.signIn")
        )}
      </Button>
      <OAuthOptions />
    </form>
  );
}
