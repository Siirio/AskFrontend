import { useEffect, useState } from "react";
import { Check, FileUp, Handshake, Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { requestManagedImportHelp } from "../../shared/api/managedImportClient";
import { ApiError } from "../../shared/api/httpClient";
import { Modal } from "../../shared/ui/Modal/Modal";
import { Select } from "../../shared/ui/Select/Select";
import { useToast } from "../../shared/ui/Toast/Toast";

const SOURCE_TYPES = [
  "EXCEL", "CSV", "WEBSITE", "KASPI", "OZON", "INSTAGRAM",
  "TELEGRAM", "PDF", "MARKDOWN", "TXT", "NOTES", "OTHER",
];

type CatalogScope = "PRODUCTS" | "SERVICES";
type ContactChannel = "WHATSAPP" | "TELEGRAM" | "EMAIL";

interface ManagedImportRequestDialogProps {
  open: boolean;
  businessId: string;
  scope: CatalogScope;
  defaultContactValue: string;
  onClose: () => void;
  onSubmitted: (scope: CatalogScope) => void;
}

export function ManagedImportRequestDialog({
  open,
  businessId,
  scope,
  defaultContactValue,
  onClose,
  onSubmitted,
}: ManagedImportRequestDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [sourceTypes, setSourceTypes] = useState<string[]>(["EXCEL"]);
  const [contactChannel, setContactChannel] = useState<ContactChannel>("EMAIL");
  const [contactValue, setContactValue] = useState(defaultContactValue);
  const [sourceLinks, setSourceLinks] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const configuredPrice = import.meta.env.VITE_MANAGED_IMPORT_PRICE_KZT;

  useEffect(() => {
    if (!open) return;
    setContactValue(defaultContactValue);
    setLegalAccepted(false);
  }, [defaultContactValue, open, scope]);

  const toggleSource = (source: string) => {
    setSourceTypes(current => current.includes(source)
      ? current.filter(item => item !== source)
      : [...current, source]);
  };

  const submit = async () => {
    if (!contactValue.trim() || sourceTypes.length === 0 || !legalAccepted) return;
    setBusy(true);
    try {
      await requestManagedImportHelp(businessId, {
        catalogScope: scope,
        sourceTypes,
        preferredContactChannel: contactChannel,
        preferredContactValue: contactValue.trim(),
        sourceLinks: sourceLinks.trim(),
        sourceNotes: sourceNotes.trim(),
        legalAccepted,
      });
      onSubmitted(scope);
      toast.show(t("managedImport.sent"), "success");
      onClose();
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("managedImport.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const catalogLabel = t(`managedImport.scope.${scope}`);

  return (
    <Modal open={open} onClose={onClose} title={t("managedImport.title", { catalog: catalogLabel })} size="lg">
      <div className="managed-import-dialog">
        <div className="managed-import-promise">
          <div>
            <span className="managed-import-kicker">{t("managedImport.serviceLabel")}</span>
            <h3>{t("managedImport.benefitTitle", { catalog: catalogLabel })}</h3>
            <p>{t("managedImport.benefitDescription", { catalog: catalogLabel })}</p>
          </div>
          <strong>
            {configuredPrice
              ? t("managedImport.priceConfigured", { price: Number(configuredPrice).toLocaleString("ru-KZ") })
              : t("managedImport.priceEstimate")}
          </strong>
        </div>

        <div className="managed-import-benefits">
          <span><FileUp size={17} />{t("managedImport.benefit.collect")}</span>
          <span><ShieldCheck size={17} />{t("managedImport.benefit.clean")}</span>
          <span><Handshake size={17} />{t("managedImport.benefit.publish")}</span>
        </div>

        <div className="managed-import-form-grid">
          <label>
            <span className="fcw-label">{t("managedImport.contactChannel")}</span>
            <Select
              options={[
                { value: "WHATSAPP", label: "WhatsApp" },
                { value: "TELEGRAM", label: "Telegram" },
                { value: "EMAIL", label: "Email" },
              ]}
              value={contactChannel}
              onChange={value => setContactChannel(value as ContactChannel)}
            />
          </label>
          <label>
            <span className="fcw-label">{t("managedImport.contactValue")}</span>
            <input className="fcw-input" value={contactValue} onChange={event => setContactValue(event.target.value)} />
          </label>
        </div>

        <div>
          <span className="fcw-label">{t("managedImport.sources")}</span>
          <div className="managed-import-source-list">
            {SOURCE_TYPES.map(source => (
              <button
                key={source}
                type="button"
                className={sourceTypes.includes(source) ? "is-selected" : ""}
                onClick={() => toggleSource(source)}
              >
                {sourceTypes.includes(source) && <Check size={13} />}
                {source}
              </button>
            ))}
          </div>
        </div>

        <label>
          <span className="fcw-label">{t("managedImport.sourceLinks")}</span>
          <textarea className="fcw-input" rows={3} value={sourceLinks} onChange={event => setSourceLinks(event.target.value)} placeholder={t("managedImport.sourceLinksPlaceholder")} />
        </label>
        <label>
          <span className="fcw-label">{t("managedImport.sourceNotes")}</span>
          <textarea className="fcw-input" rows={3} value={sourceNotes} onChange={event => setSourceNotes(event.target.value)} placeholder={t("managedImport.sourceNotesPlaceholder")} />
        </label>

        <label className="managed-import-legal">
          <input type="checkbox" checked={legalAccepted} onChange={event => setLegalAccepted(event.target.checked)} />
          <span>{t("managedImport.legal")} <a href="/legal/import-service" target="_blank" rel="noreferrer">{t("managedImport.terms")}</a></span>
        </label>

        <div className="managed-import-actions">
          <button className="fcw-btn fcw-btn-ghost" onClick={onClose}>{t("business.cancel")}</button>
          <button className="fcw-btn fcw-btn-primary" onClick={submit} disabled={busy || !legalAccepted || !contactValue.trim() || sourceTypes.length === 0}>
            {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <Handshake size={16} />}
            {t("managedImport.submit", { catalog: catalogLabel })}
          </button>
        </div>
      </div>
    </Modal>
  );
}
