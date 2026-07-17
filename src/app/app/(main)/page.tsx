import { getTranslations } from "next-intl/server";

/** /app → renders @/search HomePage when the search slice lands (roadmap Phase 1 #2). [server, D7] */
export default async function HomeRoute() {
  const t = await getTranslations("app");

  return (
    <main>
      <h1>{t("pages.home")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
