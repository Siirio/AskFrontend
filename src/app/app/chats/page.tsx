import { getTranslations } from "next-intl/server";

/** /app/chats → renders the @/chats page when the chats slice lands (roadmap Phase 1 #4). [client page behind this server route file, D7] */
export default async function ChatsRoute() {
  const t = await getTranslations("app");

  return (
    <main>
      <h1>{t("pages.chats")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
