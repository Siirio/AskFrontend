import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select } from "../../shared/ui/Select/Select";
import { useToast } from "../../shared/ui/Toast/Toast";
import { ApiError } from "../../shared/api/httpClient";
import { createContentReport, type ReportTargetType } from "../../shared/api/reportClient";

const REASON_CODES = ["SPAM", "FRAUD", "PROHIBITED", "OFFENSIVE", "OTHER"] as const;

type ReportDialogProps = {
  targetType: ReportTargetType;
  targetId: string;
  open: boolean;
  onClose: () => void;
};

export function ReportDialog({ targetType, targetId, open, onClose }: ReportDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [reasonCode, setReasonCode] = useState<string>("SPAM");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await createContentReport({ targetType, targetId, reasonCode, details: details.trim() || undefined });
      toast.show(t("report.sent"), "success");
      setDetails("");
      onClose();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("report.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fcw-fixed fcw-z-modal"
          style={{ inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="fcw-card"
            style={{ width: "min(420px, calc(100vw - 2rem))", padding: "var(--fcw-space-lg)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
              <div className="fcw-flex-between">
                <span className="fcw-body fcw-weight-semibold fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                  <Flag size={16} />
                  {t(`report.title.${targetType}`)}
                </span>
                <button className="fcw-btn fcw-btn-ghost fcw-btn-icon" onClick={onClose} aria-label={t("report.cancel")}>
                  <X size={16} />
                </button>
              </div>
              <Select
                size="sm"
                options={REASON_CODES.map(code => ({ value: code, label: t(`report.reason.${code}`) }))}
                value={reasonCode}
                onChange={setReasonCode}
              />
              <textarea
                className="fcw-input"
                rows={3}
                placeholder={t("report.detailsPlaceholder")}
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
              <div className="fcw-flex" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={onClose}>
                  {t("report.cancel")}
                </button>
                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={busy} onClick={submit}>
                  {busy && <Loader2 size={14} className="fcw-spin" />}
                  {t("report.submit")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
