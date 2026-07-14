import { getTranslations } from "next-intl/server";

/** /app/product/:id → renders the @/catalog ProductCard as a full page (D10) when the catalog slice lands (roadmap Phase 1 #3). [server, D7] */
export default async function ProductRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("app");

  return (
    <main>
      <h1>{t("pages.product")}</h1>
      <p>{id}</p>
      <p>{t("placeholder")}</p>
    </main>
  );
}
