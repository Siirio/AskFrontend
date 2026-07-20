"use client";

import { useTranslations } from "next-intl";

import { Spinner } from "@/shared/ui/spinner";

/**
 * The transient screen a route guard shows while it CANNOT yet render the page:
 * the session is still restoring (status "loading"), or access was denied and the
 * redirect has been issued but not yet navigated. Slice-private — the guards
 * (RequireAuth, RequireDashboardAccess) share it so the "checking access" surface
 * is defined once (P6.2). Centered spinner, same shape as the OAuth callback's
 * transient state; the label is the only user-facing string (§7 i18n).
 */
export function GuardFallback() {
  const t = useTranslations("app");
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-foreground-muted">
      <Spinner label={t("loading")} className="size-6" />
    </div>
  );
}
