import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listAllCustomerRequests, type CustomerRequestItem } from "../../shared/api/platformClient";
import { Card } from "../../shared/ui/Card/Card";

export function AdminRequests() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<CustomerRequestItem[]>([]);

  useEffect(() => {
    listAllCustomerRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.sections.requests")}</h1>
      </div>
      <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
        <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.requests.title")}</h2>
        {requests.length === 0 && (
          <Card padding="md">
            <p className="fcw-body-s fcw-text-secondary">{t("platform.requests.empty")}</p>
          </Card>
        )}
        {requests.map(req => (
          <Card key={req.id} padding="md">
            <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                <span className="fcw-body fcw-weight-medium" style={{ wordBreak: "break-word" }}>
                  {req.query}
                </span>
                <span className="fcw-body-xs"
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "var(--fcw-radius-full)",
                    backgroundColor: req.status === "ROUTED" || req.status === "CREATED"
                      ? "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)"
                      : "var(--fcw-color-surface-secondary)",
                    flexShrink: 0,
                    fontWeight: 600,
                    color: req.status === "ROUTED" || req.status === "CREATED"
                      ? "var(--fcw-color-accent)"
                      : "var(--fcw-color-text-tertiary)",
                  }}>
                  {t(`platform.requests.status.${req.status}`)}
                </span>
              </div>
              <div className="fcw-flex fcw-flex-wrap" style={{ gap: "1rem" }}>
                <span className="fcw-body-xs fcw-text-secondary">
                  {req.scope} · {req.city}
                </span>
                <span className="fcw-body-xs fcw-text-tertiary">
                  {t("platform.requests.suppliers")}: {req.matchedSuppliers}
                </span>
                <span className="fcw-body-xs fcw-text-tertiary">
                  {t("platform.requests.replies")}: {req.replyCount}
                </span>
                <span className="fcw-body-xs fcw-text-tertiary">
                  {new Date(req.createdAt).toLocaleString("ru-KZ")}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
