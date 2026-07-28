import { getTranslations } from "next-intl/server";

import { SearchForm } from "./SearchForm";

/**
 * Home (UF 2.1 step 1) — navigation menu (app chrome, mounted one level up by
 * the `(main)` layout), headline text, the search form. Server component
 * (D7/D23): still behind the auth gate, so it renders dynamically, but there
 * is no per-request data to fetch here — only the client `SearchForm` island
 * is interactive.
 *
 * The decoration (`.neu-hero-decor{,-bottom}`, `.neu-hero-dots`,
 * design-system/neumorphism.css) is pure — `aria-hidden`, `pointer-events:
 * none`, sat behind the content (z-0 vs. the content's z-10) — giving the
 * page some real presence beyond a bare form (owner request, 2026-07-28;
 * extended with a foot glow + one corner dot-grid texture the same day,
 * second review pass — deliberately NOT the scattered-icon/arrow/card-
 * mockup treatment of a marketing landing, see the CSS header note). The
 * wrapper needs `relative` for these absolutely-positioned layers to anchor
 * to.
 *
 * `min-h-svh` centres the hero in the viewport rather than pinning it near
 * the top with a lot of dead space below (owner review, same day) — the
 * same centring convention `auth/ui/AuthShell` already uses.
 *
 * `locale` is passed by the route file (resolved from the `ask.locale`
 * cookie, D19) rather than read here — `getTranslations(namespace)` alone
 * always falls back to `defaultLocale` (shared/i18n/request.ts never reads
 * the cookie itself), the same reason the route placeholders it replaces
 * threaded `locale` through.
 */
export async function HomePage({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "search" });

  return (
    <main className="relative">
      {/* Spans the full-bleed width so the blur fades out naturally instead
          of cutting off at the narrower content column's edge. */}
      <span className="neu-hero-decor" aria-hidden="true" />
      <span className="neu-hero-decor-bottom" aria-hidden="true" />
      <span className="neu-hero-dots" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-2xl flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-balance text-foreground sm:text-4xl">
            {t("home.headline")}
          </h1>
          <p className="text-base text-pretty text-foreground-muted sm:text-lg">
            {t("home.subtitle")}
          </p>
        </div>
        <SearchForm />
      </div>
    </main>
  );
}
