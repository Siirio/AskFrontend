"use client";

import { useTranslations } from "next-intl";

import { env } from "@/shared/config/env";
import { Button } from "@/shared/ui/button";

/**
 * The "or / Continue with Google" block under the email form on BOTH the Login
 * and Register pages (PRODUCT_VISION UF 1 — Google OAuth is a required method).
 * Slice-private, two consumers within auth — same call as PasswordInput and the
 * agreement checkbox (D8 rule of three; auth is the first consumer).
 *
 * It is a SECONDARY action, never the accent: the email submit keeps the one
 * saturated fill in the product (saturation-is-action). The control is a
 * full-page navigation — an <a> via Button `asChild` — to the backend's Google
 * entry point, because OAuth must let the browser follow the redirect chain
 * through Google; it is a link, never an httpClient call. Hidden where OAuth is
 * not configured (env.oauthEnabled), so it never renders dead.
 */
export function OAuthOptions() {
  const t = useTranslations("auth");
  if (!env.oauthEnabled) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* The rule is a carved GROOVE, not a hairline: a 1px line is the one
          thing this skin has no vocabulary for, and next to shadowed controls
          it reads as a stray artefact. Two stacked 1px rows — the shadow pair
          in miniature — give the same separation in the skin's own language. */}
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="neu-rule flex-1" />
        <span className="text-xs font-medium text-foreground-subtle">
          {t("oauth.or")}
        </span>
        <span aria-hidden="true" className="neu-rule flex-1" />
      </div>
      {/* Override the Button's fixed height + whitespace-nowrap: the long Google
          label ("Google арқылы жалғастыру" in kk) overflows a narrow button on
          small screens, so allow it to wrap onto two centred lines and let the
          height grow — keeping the 44px touch floor (min-h-11).
          `outline` resolves to the plain RAISED button on this skin — there is
          no bordered variant to be quiet with, so quiet means unsaturated. That
          is the right register: the email submit above keeps the one accent
          fill, and this stays a secondary way in. */}
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-auto min-h-11 w-full py-3 text-center whitespace-normal"
      >
        <a href={env.googleOAuthUrl}>
          {/* The official multicolour Google "G" — a brand asset via <img>, like
              the ASK wordmark (D2). Its fixed brand colours are inherent to the
              logo, so it is exempt from the token rule (P9.2) and the
              lucide-only icon rule (owner request 2026-07-19; Google Sign-in
              branding requires its own mark). Decorative — the button text is
              the accessible name, so alt="". */}
          <img src="/google.svg" alt="" className="size-5" />
          {t("oauth.continueWithGoogle")}
        </a>
      </Button>
    </div>
  );
}
