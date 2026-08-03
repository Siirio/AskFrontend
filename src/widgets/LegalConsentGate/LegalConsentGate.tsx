import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { acceptAccountLegalDocuments, listActiveLegalDocuments, type LegalDocument } from "../../shared/api/legalClient";

export function LegalConsentGate() {
  const { t, i18n } = useTranslation();
  const { state, actions } = useAuth();
  const pending = state.session?.pendingLegalDocuments ?? [];
  const locale = i18n.resolvedLanguage?.split("-")[0] ?? "ru";
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pending.length) return;
    listActiveLegalDocuments(locale)
      .then(setDocuments)
      .catch(() => setError(t("auth.legal.documentsError")));
  }, [locale, pending.length, t]);

  const required = useMemo(() => documents.filter(document => pending.includes(document.code)), [documents, pending]);

  if (!state.authenticated || state.registrationJustCompleted || !pending.length) return null;

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await acceptAccountLegalDocuments(pending, locale);
      await actions.refreshSession();
    } catch {
      setError(t("auth.legal.acceptError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fcw-fixed fcw-inset-0 fcw-z-modal fcw-flex-center" role="presentation">
      <div className="fcw-absolute fcw-inset-0 fcw-glass-dark" />
      <section className="fcw-relative fcw-surface-primary fcw-radius-xl fcw-elevation-xl fcw-p-lg" role="dialog" aria-modal="true" aria-labelledby="legal-consent-title" style={{ width: "min(560px, calc(100vw - 2rem))" }}>
        <h2 id="legal-consent-title" className="fcw-h3">{t("auth.legal.gateTitle")}</h2>
        <p className="fcw-body">{t("auth.legal.gateDescription")}</p>
        <div className="fcw-flex-col fcw-gap-sm">
          {required.map(document => (
            <a key={document.code} href={document.publicUrl} target="_blank" rel="noreferrer" className="fcw-link">
              {t(`auth.legal.document.${document.code}`)} · {document.version}
            </a>
          ))}
        </div>
        <label className="fcw-flex fcw-items-center fcw-gap-sm fcw-mt-md">
          <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          <span>{t("auth.legal.roleAccept")}</span>
        </label>
        {error && <p className="fcw-text-danger" role="alert">{error}</p>}
        <button type="button" className="fcw-btn fcw-btn-primary fcw-mt-md" disabled={!confirmed || busy || required.length !== pending.length} onClick={accept}>
          {busy ? t("common.loading") : t("auth.legal.accept")}
        </button>
      </section>
    </div>
  );
}
