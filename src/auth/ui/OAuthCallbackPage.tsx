"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Spinner } from "@/shared/ui/spinner";

import { useOAuthCallback } from "../hooks";

/**
 * The transient /oauth/callback page. Google returns to the backend, the backend
 * writes the single-use ASK_SESSION bridge cookie and redirects here;
 * useOAuthCallback exchanges that cookie for a Bearer session and hands back a
 * target route (identical to verify/login from there).
 *
 * ALWAYS transient: it shows a spinner while exchanging and until the redirect
 * fires, and an INLINE error + a way back on failure. The error is never a toast
 * — the Toaster host is mounted in the platform layout, and this page sits at the
 * top level (the backend's configured redirect URI), under the root providers
 * only: i18n (defaultLocale) and the auth store, which is all a redirect page
 * needs (features/auth/ux-ui-flow.md).
 */
export function OAuthCallbackPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const state = useOAuthCallback();

  useEffect(() => {
    if (state.status === "done") router.replace(state.targetPath);
  }, [state, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center text-foreground">
      {state.status === "error" ? (
        <>
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
          <Link
            href="/app/auth/login"
            className="rounded-xs text-sm font-medium text-accent focus-ring transition-colors hover:underline"
          >
            {t("oauth.backToLogin")}
          </Link>
        </>
      ) : (
        <div className="flex items-center gap-3 text-foreground-muted">
          <Spinner label={t("oauth.signingIn")} />
          <span aria-hidden="true" className="text-sm">
            {t("oauth.signingIn")}
          </span>
        </div>
      )}
    </div>
  );
}
