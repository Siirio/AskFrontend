import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../shared/ui/Modal/Modal";
import "./PlatformSanctionDialog.css";

type Props = {
  open: boolean;
  targetName: string;
  action: "block" | "restore" | "delete";
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function PlatformSanctionDialog({
  open,
  targetName,
  action,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, targetName, action]);

  const destructive = action === "delete";

  return (
    <Modal open={open} onClose={onClose} title={t(`platform.sanctions.${action}.title`)} size="sm">
      <div className="platform-sanction-dialog">
        <div className={`platform-sanction-summary${destructive ? " is-destructive" : ""}`}>
          <AlertTriangle size={19} />
          <div>
            <strong>{targetName}</strong>
            <p>{t(`platform.sanctions.${action}.effect`)}</p>
          </div>
        </div>

        <label>
          <span>{t("platform.sanctions.reason")}</span>
          <textarea
            className="ask-field"
            rows={4}
            value={reason}
            placeholder={t("platform.sanctions.reasonPlaceholder")}
            onChange={event => setReason(event.target.value)}
          />
        </label>

        <div className="platform-sanction-actions">
          <button type="button" className="ask-secondary-button" disabled={busy} onClick={onClose}>
            {t("platform.users.cancel")}
          </button>
          <button
            type="button"
            className={destructive ? "platform-danger-button" : "ask-primary-button"}
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {busy && <Loader2 size={15} className="fcw-spin" />}
            {t(`platform.sanctions.${action}.confirm`)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

