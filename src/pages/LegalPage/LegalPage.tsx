import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { Card } from "../../shared/ui/Card/Card";
import { ROUTES } from "../../app/routes";

const LEGAL_DOCUMENTS = new Set([
  "user-terms",
  "privacy",
  "seller-terms",
  "import-service",
  "prohibited-products",
  "content-policy",
]);

export function LegalPage() {
  const { t } = useTranslation();
  const { document = "" } = useParams<{ document: string }>();
  const { pathname } = useLocation();
  const page = pathname === ROUTES.support
    ? "support"
    : pathname === ROUTES.accountDeletion
      ? "account-deletion"
      : LEGAL_DOCUMENTS.has(document) ? document : "user-terms";

  return (
    <main id="main-content">
      <div className="fcw-container" style={{ paddingTop: "var(--fcw-space-xl)", paddingBottom: "var(--fcw-space-xl)", maxWidth: 840 }}>
        <Card padding="lg">
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <div>
              <h1 className="fcw-h2" style={{ marginBottom: "0.5rem" }}>{t(`legal.${page}.title`)}</h1>
              <p className="fcw-body-s fcw-text-tertiary">{t("legal.version", { version: "1.0" })}</p>
            </div>
            <section>
              <h2 className="fcw-h3">{t("legal.section1.title")}</h2>
              <p className="fcw-body fcw-text-secondary">{t(`legal.${page}.section1.body`)}</p>
            </section>
            <section>
              <h2 className="fcw-h3">{t("legal.section2.title")}</h2>
              <p className="fcw-body fcw-text-secondary">{t(`legal.${page}.section2.body`)}</p>
            </section>
            <section>
              <h2 className="fcw-h3">{t("legal.section3.title")}</h2>
              <p className="fcw-body fcw-text-secondary">{t(`legal.${page}.section3.body`)}</p>
            </section>
            <Link className="fcw-btn fcw-btn-secondary" to={ROUTES.home} style={{ alignSelf: "flex-start" }}>
              {t("legal.back")}
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
