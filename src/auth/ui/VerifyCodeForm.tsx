"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";

import { useVerifyStep, type VerifyResult } from "../hooks";
import { Field, fieldErrorId } from "./Field";

/**
 * The shared 6-digit code step — used by both log-in and sign-up. On success it
 * hands the result up (the page decides: role modal vs navigate). Loading,
 * error and validation states are all present (P9.3).
 */
export function VerifyCodeForm({
  authChallengeId,
  sentTo,
  onAuthenticated,
  onBack,
}: {
  authChallengeId: string;
  sentTo: string;
  onAuthenticated: (result: VerifyResult) => void;
  onBack: () => void;
}) {
  const t = useTranslations("auth");
  const { code, setCode, error, pending, result, submit } =
    useVerifyStep(authChallengeId);

  useEffect(() => {
    if (result) onAuthenticated(result);
  }, [result, onAuthenticated]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <p className="text-center text-sm text-foreground-muted">
        {t("verify.sentTo", { destination: sentTo })}
      </p>
      <Field
        label={t("verify.codeLabel")}
        htmlFor="verify-code"
        error={error ?? undefined}
      >
        <Input
          id="verify-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="h-11 text-center text-base tracking-widest"
          value={code}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? fieldErrorId("verify-code") : undefined}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <Spinner label={t("actions.verifying")} />
        ) : (
          t("actions.verify")
        )}
      </Button>
      {/* lg (44px) — the back action is on the customer path and must meet the
          touch-target floor (platform-ui-design §7); ghost keeps it quiet. */}
      <Button type="button" variant="ghost" size="lg" onClick={onBack}>
        {t("actions.changeEmail")}
      </Button>
    </form>
  );
}
