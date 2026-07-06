import { useTranslation } from "react-i18next";
import { Clock, Send, ShieldCheck } from "lucide-react";
import type { CustomerRequest } from "../../entities/request/model";

type Props = {
  query: string;
  city: string;
  isSending: boolean;
  request: CustomerRequest | null;
  onCreate: (scope: "product" | "service") => void;
};

export function FallbackRequestPanel({ query, city, isSending, request, onCreate }: Props) {
  const { t } = useTranslation();
  return (
    <section className="fallback-panel">
      <div>
        <p className="eyebrow">{t("fallbackRequest.eyebrow")}</p>
        <h2>{t("fallbackRequest.heading")}</h2>
        <p className="muted">
          {t("fallbackRequest.subtext")}
        </p>
      </div>

      {request ? (
        <div className="waiting-state">
          <Clock size={22} aria-hidden="true" />
          <div>
            <strong>{t("fallbackRequest.sent")}</strong>
            <span>
              {t("fallbackRequest.sentSuppliers", { count: request.matchedSuppliers, query: request.query, city })}
            </span>
          </div>
        </div>
      ) : (
        <div className="fallback-actions">
          <button disabled={!query.trim() || isSending} onClick={() => onCreate("product")}>
            <Send size={17} aria-hidden="true" />
            {t("fallbackRequest.product")}
          </button>
          <button disabled={!query.trim() || isSending} onClick={() => onCreate("service")}>
            <ShieldCheck size={17} aria-hidden="true" />
            {t("fallbackRequest.service")}
          </button>
        </div>
      )}
    </section>
  );
}
