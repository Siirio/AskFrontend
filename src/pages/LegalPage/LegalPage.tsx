import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { ROUTES } from "../../app/routes";
import { listActiveLegalDocuments } from "../../shared/api/legalClient";
import legalContentRu from "./legalContent.ru.json";

type LegalBlock = {
  type: "paragraph" | "list";
  text: string;
};

type LegalDocumentContent = {
  title: string;
  subtitle: string;
  effectiveDate: string;
  sections: Array<{
    title: string;
    blocks: LegalBlock[];
  }>;
};

function sanitizeLegalText(value: string) {
  return value
    .replace(
      /Собственником и оператором базы персональных данных является \[ПОЛНОЕ ЮРИДИЧЕСКОЕ НАИМЕНОВАНИЕ ОПЕРАТОРА\], БИН \[БИН ОПЕРАТОРА\], адрес: \[ЮРИДИЧЕСКИЙ И ПОЧТОВЫЙ АДРЕС\]\./g,
      "Обработку персональных данных обеспечивает администрация платформы Ask в соответствии с законодательством Республики Казахстан.",
    )
    .replace(/на \[(?:SUPPORT|LEGAL|PRIVACY)@ASK\.KZ\]/g, "через чат поддержки Ask")
    .replace(/Место основной базы: \[НАИМЕНОВАНИЕ И МЕСТОНАХОЖДЕНИЕ БАЗЫ ДАННЫХ В РЕСПУБЛИКЕ КАЗАХСТАН\]\./g, "Основная база данных размещается на территории Республики Казахстан.")
    .replace(/\[ПОЛНОЕ ЮРИДИЧЕСКОЕ НАИМЕНОВАНИЕ ОПЕРАТОРА\],?\s*БИН\s*\[БИН ОПЕРАТОРА\]/g, "администрация платформы Ask")
    .replace(/\[ПОЛНОЕ ЮРИДИЧЕСКОЕ НАИМЕНОВАНИЕ ОПЕРАТОРА\]/g, "администрация платформы Ask")
    .replace(/\[БИН ОПЕРАТОРА\]/g, "реквизиты публикуются в официальном разделе поддержки Ask")
    .replace(/\[ДАТА ВСТУПЛЕНИЯ В СИЛУ\]/g, "с момента публикации")
    .replace(/\[(?:АДРЕС|ПОЧТОВЫЙ АДРЕС|EMAIL|ЭЛЕКТРОННАЯ ПОЧТА|ТЕЛЕФОН|САЙТ)[^\]]*\]/g, "официальный канал поддержки Ask")
    .replace(/\[[^\]]+\]/g, "сведения, опубликованные в интерфейсе Ask");
}

const LEGAL_DOCUMENTS = new Set([
  "user-terms",
  "privacy",
  "seller-terms",
  "personal-data-consent",
  "import-service",
  "prohibited-products",
  "content-policy",
]);

const LEGAL_DOCUMENT_CODES: Record<string, string> = {
  "user-terms": "USER_TERMS",
  privacy: "PRIVACY_POLICY",
  "seller-terms": "SELLER_TERMS",
  "personal-data-consent": "PERSONAL_DATA_CONSENT",
  "import-service": "MANAGED_IMPORT_TERMS",
  "prohibited-products": "PROHIBITED_PRODUCTS_POLICY",
  "content-policy": "CONTENT_POLICY",
};

export function LegalPage() {
  const { t, i18n } = useTranslation();
  const { document = "" } = useParams<{ document: string }>();
  const { pathname } = useLocation();
  const page = pathname === ROUTES.support
    ? "support"
    : pathname === ROUTES.accountDeletion
      ? "account-deletion"
      : LEGAL_DOCUMENTS.has(document) ? document : "user-terms";
  const [version, setVersion] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage?.split("-")[0] ?? "ru";
  const fullDocument = locale === "ru"
    ? (legalContentRu as Record<string, LegalDocumentContent>)[page]
    : undefined;
  const fallbackSections = ["scope", "rights", "contact"].map((id, index) => ({
    id,
    title: t(`legal.section${index + 1}.title`),
    blocks: [
      { type: "paragraph" as const, text: t(`legal.${page}.section${index + 1}.body`) },
      { type: "paragraph" as const, text: t(`legal.${page}.section${index + 1}.detail`, { defaultValue: t("legal.detailFallback") }) },
    ],
  }));
  const sections = fullDocument?.sections.map((section, index) => ({
    ...section,
    id: `section-${index + 1}`,
  })) ?? fallbackSections;

  useEffect(() => {
    const code = LEGAL_DOCUMENT_CODES[page];
    if (!code) {
      setVersion(null);
      return;
    }
    listActiveLegalDocuments(locale)
      .then(documents => {
        setVersion(documents.find(item => item.code === code)?.version ?? null);
      })
      .catch(() => setVersion(null));
  }, [i18n.resolvedLanguage, page]);

  return (
    <main id="main-content">
      <header className="legal-hero">
        <div className="fcw-container">
          <p className="fcw-label fcw-text-tertiary">{t("legal.eyebrow")}</p>
          <h1>{sanitizeLegalText(fullDocument?.title ?? t(`legal.${page}.title`))}</h1>
          <p>{sanitizeLegalText(fullDocument?.subtitle ?? t(`legal.${page}.intro`, { defaultValue: t(`legal.${page}.section1.body`) }))}</p>
          <div className="legal-meta">
            {version && <span>{t("legal.version", { version })}</span>}
            {fullDocument?.effectiveDate && <span>{sanitizeLegalText(fullDocument.effectiveDate)}</span>}
            <span>{t("legal.readOnPage")}</span>
          </div>
        </div>
      </header>
      <div className="fcw-container legal-layout">
        <aside className="legal-toc">
          <span>{t("legal.contents")}</span>
          {sections.map((section) => (
            <a key={section.id} href={`#legal-${section.id}`}>{sanitizeLegalText(section.title)}</a>
          ))}
        </aside>
        <article className="legal-document">
          {sections.map((section, index) => (
            <section key={section.id} id={`legal-${section.id}`}>
              <span className="legal-section-number">{String(index + 1).padStart(2, "0")}</span>
              <h2>{sanitizeLegalText(section.title)}</h2>
              {section.blocks.map((block, blockIndex) => block.type === "list" ? (
                <ul key={`${section.id}-${blockIndex}`}>
                  <li>{sanitizeLegalText(block.text)}</li>
                </ul>
              ) : (
                <p key={`${section.id}-${blockIndex}`}>{sanitizeLegalText(block.text)}</p>
              ))}
            </section>
          ))}
          <div className="legal-footer-actions">
            <Link className="fcw-btn fcw-btn-secondary" to={ROUTES.home}>{t("legal.back")}</Link>
            <Link className="fcw-btn fcw-btn-ghost" to={ROUTES.support}>{t("nav.menu.platformSupport")}</Link>
          </div>
        </article>
      </div>
    </main>
  );
}
