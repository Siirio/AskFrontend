import { getTranslations } from "next-intl/server";

/** /app/auth → renders @/auth AuthPage when the auth slice lands (roadmap Phase 1 #1). [client page behind this server route file, D7] */
export default async function AuthRoute() {
  const t = await getTranslations("app");

  return (
    <main>
      <h1>{t("pages.auth")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
