"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useLocale } from "@/shared/i18n/LocaleProvider";

import type { VerifyResult } from "../hooks";
import { AuthShell } from "./AuthShell";
import { LoginForm } from "./LoginForm";

/**
 * The Log in page (/app/auth/login). Email → 6-digit code → session, landing on
 * the backend's startRoute. Log-in never triggers role expansion (that is only
 * for a fresh sign-up), so there is no modal here.
 */
export function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { locale } = useLocale();

  // At load the tab title comes from the route's generateMetadata, resolved
  // from the ask.locale cookie (D19) — this effect exists for the IN-SESSION
  // locale switch, which the server never sees. Both writers produce the same
  // string ("{pageTitle} - Ask", the root title template).
  useEffect(() => {
    document.title = `${t("login.pageTitle")} - Ask`;
  }, [t, locale]);

  const handleAuthenticated = useCallback(
    (result: VerifyResult) => router.push(result.targetPath),
    [router],
  );

  return (
    <AuthShell
      title={t("login.title")}
      subtitle={t("login.subtitle")}
      footer={
        <>
          {t("login.noAccount")}{" "}
          <Link
            href="/app/auth/register"
            className="rounded-xs font-medium text-accent focus-ring transition-colors hover:underline"
          >
            {t("login.createAccount")}
          </Link>
        </>
      }
    >
      <LoginForm onAuthenticated={handleAuthenticated} />
    </AuthShell>
  );
}
