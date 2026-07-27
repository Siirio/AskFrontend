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
import { RegisterForm } from "./RegisterForm_old";

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
  // locale switch, which the server never sees. Both writers derive from the
  // one template in shared/config/site.ts (P6.2).
  useEffect(() => {
    document.title = formatPageTitle(t("register.pageTitle"));
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
