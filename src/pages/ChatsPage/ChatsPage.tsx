import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, ArrowRight, MapPin, Package, Briefcase, Plus } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Card } from "../../shared/ui/Card/Card";
import { getCustomerHistory } from "../../shared/api/askClient";
import type { CustomerRequestHistoryDto } from "../../shared/api/dto";
import { buildRoute, ROUTES } from "../../app/routes";

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("time.minAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("time.hourAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("time.dayAgo", { count: days });
}

export function ChatsPage() {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const { state } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<CustomerRequestHistoryDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.view === "auth") return;
    setBusy(true);
    setError("");
    getCustomerHistory()
      .then(all => {
        const withReplies = all.filter(item => item.replyCount > 0).slice(0, 5);
        setItems(withReplies);
      })
      .catch(e => setError(e instanceof Error ? e.message : t("chats.error.title")))
      .finally(() => setBusy(false));
  }, [state.view]);

  const handleViewResults = (item: CustomerRequestHistoryDto) => {
    navigate(buildRoute(ROUTES.results, {}, { query: item.query, mode: item.scope === "PRODUCT" ? "products" : "services", city: item.city }));
  };

  if (state.view === "auth") {
    return (
      <main id="main-content">
        <div className="fcw-container fcw-section" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title={t("chats.auth.title")}
            description={t("chats.auth.description")}
            action={
              <button className="fcw-btn fcw-btn-primary" onClick={() => navigate(ROUTES.auth)}>
                {t("chats.auth.login")}
                <ArrowRight size={16} />
              </button>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main id="main-content">
      <div className="fcw-container fcw-section">
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fcw-flex-between fcw-flex-wrap"
          style={{ gap: "1rem", marginBottom: "var(--fcw-space-lg)" }}
        >
          <div>
            <h2 className="fcw-h2" style={{ marginBottom: "var(--fcw-space-sm)" }}>{t("chats.title")}</h2>
            <p className="fcw-body fcw-text-secondary" style={{ margin: 0 }}>
              {t("chats.subtitle")}
            </p>
          </div>
          <button
            className="fcw-btn fcw-btn-primary"
            onClick={() => navigate(ROUTES.home)}
            style={{ gap: "0.5rem" }}
          >
            <Plus size={16} />
            {t("chats.newRequest")}
          </button>
        </motion.div>

        {busy && <Loading size="md" text={t("chats.loading")} />}

        {error && (
          <EmptyState
            title={t("chats.error.title")}
            description={error}
            action={
              <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => window.location.reload()}>
                {t("chats.error.retry")}
              </button>
            }
          />
        )}

        {!busy && !error && items.length === 0 && (
          <EmptyState
            title={t("chats.empty.title")}
            description={t("chats.empty.description")}
            icon={<MessageCircle size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
          />
        )}

        {!busy && !error && items.length > 0 && (
          <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={reduced ? {} : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card
                  padding="md"
                  className="fcw-card-clickable"
                  onClick={() => handleViewResults(item)}
                >
                  <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                    <div className="fcw-flex-col fcw-flex-1" style={{ gap: "0.25rem", minWidth: 0 }}>
                      <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                        <MessageCircle size={16} style={{ color: "var(--fcw-color-primary)", flexShrink: 0 }} />
                        <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.query}
                        </span>
                      </div>
                      <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                        <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                          {item.scope === "product" ? <Package size={11} /> : <Briefcase size={11} />}
                          {item.scope === "product" ? t("chats.scope.product") : t("chats.scope.service")}
                        </span>
                        <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                          <MapPin size={11} />
                          {item.city}
                        </span>
                        <span className="fcw-body-s fcw-text-tertiary">{timeAgo(item.createdAt, t)}</span>
                        {item.replyCount > 0 && (
                          <span className="fcw-body-xs" style={{
                            color: "var(--fcw-color-accent)",
                            backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--fcw-radius-full)",
                            fontWeight: 600,
                          }}>
                            {item.replyCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
