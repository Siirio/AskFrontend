import { getTranslations } from "next-intl/server";

/** /app/catalog → renders @/search CatalogPage when the search slice lands (roadmap Phase 1 #2). [server, D7] */
export default async function CatalogRoute() {
  const t = await getTranslations("app");

  return (
    <main>
      <h1>{t("pages.catalog")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
