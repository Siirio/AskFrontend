import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowRight, ChevronDown, MapPin, Package, Briefcase, MessageCircle, Loader2, Plus, Send } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Card } from "../../shared/ui/Card/Card";
import { getCustomerHistory, getCustomerRequestDetail } from "../../shared/api/askClient";
import type { CustomerRequestHistoryDto, CustomerRequestDetailDto } from "../../shared/api/dto";
import { buildRoute, ROUTES } from "../../app/routes";

const STATUS_KEYS: Record<string, string> = {
  draft: "history.status.draft",
  dispatching: "history.status.dispatching",
  waiting: "history.status.waiting",
  answered: "history.status.answered",
};

const statusColors: Record<string, string> = {
  draft: "var(--fcw-color-text-tertiary)",
  dispatching: "var(--fcw-amber-500)",
  waiting: "var(--fcw-blue-500)",
  answered: "var(--fcw-color-accent)",
};

const scopeIcons: Record<string, React.ReactNode> = {
  product: <Package size={14} />,
  service: <Briefcase size={14} />,
};

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("time.minAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("time.hourAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("time.dayAgo", { count: days });
}

function lastReplyPreview(detail: CustomerRequestDetailDto | undefined, t: (key: string, opts?: Record<string, string>) => string): string | null {
  if (!detail || detail.replies.length === 0) return null;
  const last = detail.replies[detail.replies.length - 1];
  return last.comment || last.productHint || t("history.lastReplyFallback", { name: last.supplierName });
}

export function HistoryPage() {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const { state } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<CustomerRequestHistoryDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerRequestDetailDto | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailCache, setDetailCache] = useState<Record<string, CustomerRequestDetailDto>>({});
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (state.view === "auth") return;
    setBusy(true);
    setError("");
    getCustomerHistory()
      .then(async (all) => {
        setItems(all);
        const withReplies = all.filter(item => item.replyCount > 0);
        const results = await Promise.allSettled(
          withReplies.map(item => getCustomerRequestDetail(item.id))
        );
        const cache: Record<string, CustomerRequestDetailDto> = {};
        results.forEach((r, i) => {
          if (r.status === "fulfilled") cache[withReplies[i].id] = r.value;
        });
        setDetailCache(cache);
      })
      .catch(e => setError(e instanceof Error ? e.message : t("history.error.title")))
      .finally(() => setBusy(false));
  }, [state.view]);

  const loadDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setReplyText("");
      return;
    }
    setExpandedId(id);
    setReplyText("");
    if (detailCache[id]) {
      setDetail(detailCache[id]);
      return;
    }
    setDetailBusy(true);
    try {
      const d = await getCustomerRequestDetail(id);
      setDetail(d);
      setDetailCache(prev => ({ ...prev, [id]: d }));
    } catch {
      setDetail(null);
    } finally {
      setDetailBusy(false);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    navigate(buildRoute(ROUTES.results, {}, { query: replyText.trim(), mode: "products", city: detail?.city || "" }));
  };

  if (state.view === "auth") {
    return (
      <main id="main-content">
        <div className="fcw-container fcw-section" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title={t("history.auth.title")}
            description={t("history.auth.description")}
            action={
              <button className="fcw-btn fcw-btn-primary" onClick={() => navigate(ROUTES.auth)}>
                {t("history.auth.login")}
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
            <h2 className="fcw-h2" style={{ marginBottom: "var(--fcw-space-sm)" }}>{t("history.title")}</h2>
            <p className="fcw-body fcw-text-secondary" style={{ margin: 0 }}>
              {t("history.subtitle")}
            </p>
          </div>
          <button
            className="fcw-btn fcw-btn-primary"
            onClick={() => navigate(ROUTES.home)}
            style={{ gap: "0.5rem" }}
          >
            <Plus size={16} />
            {t("history.newRequest")}
          </button>
        </motion.div>

        {busy && <Loading size="md" text={t("history.loading")} />}

        {error && (
          <EmptyState
            title={t("history.error.title")}
            description={error}
            action={
              <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => window.location.reload()}>
                {t("history.error.retry")}
              </button>
            }
          />
        )}

        {!busy && !error && items.length === 0 && (
          <EmptyState
            title={t("history.empty.title")}
            description={t("history.empty.description")}
            icon={<Clock size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
          />
        )}

        {!busy && !error && items.length > 0 && (
          <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
            {items.map((item, i) => {
              const cachedDetail = detailCache[item.id];
              const preview = lastReplyPreview(cachedDetail, t);

              return (
              <motion.div
                key={item.id}
                initial={reduced ? {} : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card padding="md" className="fcw-card-clickable" onClick={() => loadDetail(item.id)}>
                  <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                    <div className="fcw-flex-col fcw-flex-1" style={{ gap: "0.25rem", minWidth: 0 }}>
                      <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                        {scopeIcons[item.scope]}
                        <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.query}
                        </span>
                      </div>
                      {preview && (
                        <span className="fcw-body-s fcw-text-tertiary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {preview}
                        </span>
                      )}
                      <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                        <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                          <MapPin size={11} />
                          {item.city}
                        </span>
                        <span className="fcw-body-s fcw-text-tertiary">{timeAgo(item.createdAt, t)}</span>
                        {item.replyCount > 0 ? (
                          <span className="fcw-body-xs" style={{
                            color: "var(--fcw-color-accent)",
                            backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--fcw-radius-full)",
                            fontWeight: 600,
                          }}>
                            <MessageCircle size={10} style={{ marginRight: "0.2rem", display: "inline", verticalAlign: "middle" }} />
                            {item.replyCount}
                          </span>
                        ) : (
                          <span className="fcw-body-s fcw-text-tertiary">{t("history.noReplies")}</span>
                        )}
                      </div>
                    </div>
                    <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", flexShrink: 0 }}>
                      <span
                        className="fcw-label"
                        style={{
                          color: statusColors[item.status] || "var(--fcw-color-text-tertiary)",
                          backgroundColor: "var(--fcw-color-surface-tertiary)",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "var(--fcw-radius-full)",
                        }}
                      >
                        {t(STATUS_KEYS[item.status] || item.status)}
                      </span>
                      <motion.span
                        animate={{ rotate: expandedId === item.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: "inline-flex" }}
                      >
                        <ChevronDown size={16} style={{ color: "var(--fcw-color-text-tertiary)" }} />
                      </motion.span>
                    </div>
                  </div>
                </Card>

                <AnimatePresence>
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          padding: "var(--fcw-space-md)",
                          backgroundColor: "var(--fcw-color-surface-secondary)",
                          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                          borderTop: "none",
                          borderRadius: "0 0 var(--fcw-radius-lg) var(--fcw-radius-lg)",
                        }}
                      >
                        {detailBusy && <Loading size="sm" text={t("history.loadingReplies")} />}
                        {!detailBusy && detail && detail.replies.length === 0 && (
                          <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>{t("history.noRepliesYet")}</p>
                        )}
                        {!detailBusy && detail && detail.replies.length > 0 && (
                          <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                            {detail.replies.map((reply, j) => (
                              <div key={reply.id} style={{
                                padding: "0.75rem",
                                backgroundColor: "var(--fcw-color-surface)",
                                borderRadius: "var(--fcw-radius-md)",
                                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                              }}>
                                <div className="fcw-flex-between" style={{ marginBottom: "0.375rem" }}>
                                  <span className="fcw-body-s fcw-weight-semibold">{reply.supplierName}</span>
                                  <span className="fcw-label" style={{
                                    color: reply.status === "ANSWERED" ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)",
                                  }}>
                                    {reply.statusLabel || reply.status}
                                  </span>
                                </div>
                                <div className="fcw-body-s fcw-text-tertiary" style={{ marginBottom: "0.25rem" }}>
                                  {reply.branchName}
                                </div>
                                {reply.productHint && (
                                  <p className="fcw-body-s" style={{ margin: "0 0 0.25rem 0" }}>{reply.productHint}</p>
                                )}
                                {reply.comment && (
                                  <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>{reply.comment}</p>
                                )}
                                {reply.price !== null && (
                                  <div className="fcw-body fcw-weight-bold" style={{ marginTop: "0.375rem", color: "var(--fcw-color-primary)" }}>
                                    {reply.price.toLocaleString("ru-KZ")} ₸
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline reply input */}
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                          <input
                            type="text"
                            className="fcw-input"
                            placeholder={t("history.replyInput.placeholder")}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSendReply(); }}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="fcw-btn fcw-btn-primary fcw-btn-sm fcw-btn-icon"
                            onClick={handleSendReply}
                            disabled={!replyText.trim()}
                            aria-label={t("history.replyInput.send")}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
