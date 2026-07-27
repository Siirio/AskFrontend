"use client";

/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { formatPageTitle } from "@/shared/config/site";
import { useLocale } from "@/shared/i18n/LocaleProvider";

import type { VerifyResult } from "../hooks";
import { AuthShell } from "./AuthShell_old";
import { LoginForm } from "./LoginForm_old";

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
  // locale switch, which the server never sees. Both writers derive from the
  // one template in shared/config/site.ts (P6.2).
  useEffect(() => {
    document.title = formatPageTitle(t("login.pageTitle"));
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
