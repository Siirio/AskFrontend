import { getTranslations } from "next-intl/server";

import { SearchForm } from "./SearchForm";

/**
 * Home (UF 2.1 step 1) — navigation menu (app chrome, mounted one level up by
 * the `(main)` layout), headline text, the search form. Server component
 * (D7/D23): still behind the auth gate, so it renders dynamically, but there
 * is no per-request data to fetch here — only the client `SearchForm` island
 * is interactive.
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
    <main className="mx-auto flex max-w-xl flex-col items-center gap-8 px-4 py-16 text-center sm:py-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {t("home.headline")}
        </h1>
        <p className="text-sm text-foreground-muted sm:text-base">
          {t("home.subtitle")}
        </p>
      </div>
      <SearchForm />
    </main>
  );
}
