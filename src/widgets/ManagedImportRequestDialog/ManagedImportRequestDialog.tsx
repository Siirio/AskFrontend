import { useEffect, useMemo, useState } from "react";
import { Handshake, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { requestManagedImportHelp, type ManagedImportItem } from "../../shared/api/managedImportClient";
import { ApiError } from "../../shared/api/httpClient";
import {
  isValidContactValue,
  type BusinessScope,
  type ContactChannel,
} from "../../shared/utils/validation";
import { Modal } from "../../shared/ui/Modal/Modal";
import { Select } from "../../shared/ui/Select/Select";
import { useToast } from "../../shared/ui/Toast/Toast";

const LINK_SOURCE_TYPES = ["WEBSITE", "KASPI", "OZON", "WILDBERRIES", "TWO_GIS", "INSTAGRAM", "TELEGRAM", "OTHER"] as const;
export type LinkSourceType = typeof LINK_SOURCE_TYPES[number];

interface ManagedImportRequestDialogProps {
  open: boolean;
  businessId: string;
  scope: BusinessScope;
  defaultContactValue: string;
  initialSourceLinks?: Partial<Record<LinkSourceType, string>>;
  onClose: () => void;
  onSubmitted: (item: ManagedImportItem) => void;
}

export function ManagedImportRequestDialog({
  open,
  businessId,
  scope,
  defaultContactValue,
  initialSourceLinks,
  onClose,
  onSubmitted,
}: ManagedImportRequestDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [contactChannel, setContactChannel] = useState<ContactChannel>("EMAIL");
  const [contactValue, setContactValue] = useState(defaultContactValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContactChannel("EMAIL");
    setContactValue(defaultContactValue);
  }, [defaultContactValue, open, scope]);

  const sourceEntries = useMemo(() => Object.entries(initialSourceLinks ?? {})
    .filter((entry): entry is [LinkSourceType, string] => Boolean(entry[1]?.trim())), [initialSourceLinks]);
  const selectedSourceTypes = sourceEntries.map(([type]) => type);
  const sourceLinks = sourceEntries.map(([type, value]) => `${type}: ${value.trim()}`).join("\n");
  const contactValid = isValidContactValue(contactChannel, contactValue);
  const contactError = contactValue.trim() && !contactValid
    ? t(`managedImport.contactValidation.${contactChannel}`)
    : "";

  const submit = async () => {
    if (!contactValid) return;
    setBusy(true);
    try {
      const item = await requestManagedImportHelp(businessId, {
        businessScope: scope,
        selectedSourceTypes,
        preferredContactChannel: contactChannel,
        preferredContactValue: contactValue.trim(),
        sourceLinks,
      });
      onSubmitted(item);
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
    <Modal open={open} onClose={onClose} title={t("managedImport.title", { catalog: catalogLabel })} size="md">
      <div className="managed-import-dialog">
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
            <input
              className="fcw-input"
              type={contactChannel === "EMAIL" ? "email" : "text"}
              inputMode={contactChannel === "WHATSAPP" ? "tel" : "text"}
              value={contactValue}
              placeholder={t(`seller.contactValue.${contactChannel}`)}
              aria-invalid={Boolean(contactError)}
              onChange={event => setContactValue(event.target.value)}
            />
            {contactError && <span className="fcw-body-xs" style={{ color: "var(--fcw-color-error)" }}>{contactError}</span>}
          </label>
        </div>

        <div className="managed-import-actions">
          <button className="fcw-btn fcw-btn-ghost" onClick={onClose}>{t("business.cancel")}</button>
          <button className="fcw-btn fcw-btn-primary" onClick={submit} disabled={busy || !contactValid}>
            {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <Handshake size={16} />}
            {t("managedImport.submit", { catalog: catalogLabel })}
          </button>
        </div>
      </div>
    </Modal>
  );
}
