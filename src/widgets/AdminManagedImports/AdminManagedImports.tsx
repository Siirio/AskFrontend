import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  activateManagedImport,
  listPlatformManagedImports,
  type ManagedImportItem,
} from "../../shared/api/managedImportClient";
import { Card } from "../../shared/ui/Card/Card";
import { useToast } from "../../shared/ui/Toast/Toast";
import { ApiError } from "../../shared/api/httpClient";

type Props = {
  onOpenChat: (businessId: string) => void;
};

export function AdminManagedImports({ onOpenChat }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [items, setItems] = useState<ManagedImportItem[]>([]);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    listPlatformManagedImports().then(setItems).catch(() => setItems([]));
  }, []);

  const activate = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const updated = await activateManagedImport(requestId);
      setItems(prev => prev.map(item => item.id === requestId ? updated : item));
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.sections.managedImports")}</h1>
      </div>
      <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
        {items.length === 0 && (
          <Card padding="md">
            <p className="fcw-body-s fcw-text-secondary">{t("platform.managed.empty")}</p>
          </Card>
        )}
        {items.map(item => (
          <Card key={item.id} padding="lg">
            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                <div>
                  <h3 className="fcw-body-l fcw-weight-semibold">{item.businessName}</h3>
                  <p className="fcw-body-s fcw-text-secondary">{item.requestedByName} · {item.status}</p>
                </div>
                <span className="fcw-label">{item.businessScope} · {item.selectedSourceTypes.join(", ")}</span>
              </div>
              <p className="fcw-body-s">{item.preferredContactChannel}: {item.preferredContactValue}</p>
              {item.expiresAt && (
                <p className="fcw-body-s fcw-text-secondary">
                  Доступ и чат до {new Date(item.expiresAt).toLocaleString("ru-KZ")}
                </p>
              )}
              {item.sourceLinks && <p className="fcw-body-s fcw-text-secondary">{item.sourceLinks}</p>}
              <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                {item.status === "PENDING" && (
                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={busyId === item.id} onClick={() => activate(item.id)}>
                    {t("platform.managed.activate")}
                  </button>
                )}
                {item.conversationId && (
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => onOpenChat(item.conversationId as string)}>
                    {t("platform.managed.chat")}
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
