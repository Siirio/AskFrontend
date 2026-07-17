import { getTranslations } from "next-intl/server";

/** /app/profile → renders the @/profile page when the profile slice lands (roadmap Phase 1 #6). [client page behind this server route file, D7] */
export default async function ProfileRoute() {
  const t = await getTranslations("app");

  return (
    <main>
      <h1>{t("pages.profile")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
