"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useLocale } from "@/shared/i18n/LocaleProvider";

import type { VerifyResult } from "../hooks";
import { AuthShell } from "./AuthShell";
import { RegisterForm } from "./RegisterForm";

/**
 * The Sign up page (/app/auth/register). Name/email/password (+ confirm) + the
 * agreement → 6-digit code → session, landing on the backend's startRoute.
 * A fresh single-role signup arms the role-choosing modal (suggestRoleExpansion
 * → useVerifyStep persists the pending flag); the modal itself is hosted by
 * the platform `(main)` layout and appears OVER /app after the navigation —
 * this page no longer owns it.
 */
export function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { locale } = useLocale();

  // At load the tab title comes from the route's generateMetadata, resolved
  // from the ask.locale cookie (D19) — this effect exists for the IN-SESSION
  // locale switch, which the server never sees. Both writers produce the same
  // string ("{pageTitle} - Ask", the root title template).
  useEffect(() => {
    document.title = `${t("register.pageTitle")} - Ask`;
  }, [t, locale]);

  const handleAuthenticated = useCallback(
    (result: VerifyResult) => router.push(result.targetPath),
    [router],
  );

  return (
    <AuthShell
      title={t("register.title")}
      subtitle={t("register.subtitle")}
      footer={
        <>
          {t("register.haveAccount")}{" "}
          <Link
            href="/app/auth/login"
            className="rounded-xs font-medium text-accent focus-ring transition-colors hover:underline"
          >
            {t("register.signIn")}
          </Link>
        </>
      }
    >
      <RegisterForm onAuthenticated={handleAuthenticated} />
    </AuthShell>
  );
}
