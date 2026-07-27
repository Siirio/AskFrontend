"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

import { useVerifyStep, type VerifyResult } from "../hooks";
import { CodeInput } from "./CodeInput";
import { Field, fieldErrorId } from "./Field";

/**
 * The shared 6-digit code step — used by both log-in and sign-up. On success it
 * hands the result up (the page decides: role modal vs navigate). Loading,
 * error and validation states are all present (P9.3).
 *
 * The code is entered in SIX CELLS (CodeInput — the neumorui OTPInput pattern)
 * rather than one wide field: see that file for why. `code` remains a single
 * string owned by useVerifyStep, so the flow, the request and the validation
 * are all unchanged — only the way the six characters are collected differs.
 *
 * Filling the last cell submits, via CodeInput's `onComplete`. That is the
 * whole point of the step: the code came from another device and the person is
 * mid-transcription, so asking for one more click on a button they can already
 * see is friction with no purpose. `pending` guards the double-fire, and the
 * button stays for keyboard submit and for a retry after an error.
 */
export function VerifyCodeForm({
  verificationId,
  purpose,
  sentTo,
  onAuthenticated,
  onBack,
}: {
  verificationId: string;
  /** The challenge's backend purpose. "REGISTER" (sign-up) is what arms the
   *  role-choosing modal; log-in's 2FA challenge passes none. */
  purpose?: string;
  sentTo: string;
  onAuthenticated: (result: VerifyResult) => void;
  onBack: () => void;
}) {
  const t = useTranslations("auth");
  const { code, setCode, error, pending, result, submit } = useVerifyStep(
    verificationId,
    purpose,
  );

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
        <CodeInput
          id="verify-code"
          value={code}
          invalid={Boolean(error)}
          describedBy={error ? fieldErrorId("verify-code") : undefined}
          disabled={pending}
          digitLabel={(position, total) =>
            t("verify.digitAria", { position, total })
          }
          onValueChange={setCode}
          onComplete={() => {
            if (!pending) void submit();
          }}
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
