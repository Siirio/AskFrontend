import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, ArrowRight, MapPin, Package, Briefcase, Plus, Send, Flag, Paperclip, Loader2 } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Card } from "../../shared/ui/Card/Card";
import { ReportDialog } from "../../widgets/ReportDialog/ReportDialog";
import {
  getCustomerHistory,
  listChatConversations, getChatMessages, sendChatMessage, markChatRead, uploadChatFile,
} from "../../shared/api/askClient";
import type { CustomerRequestHistoryDto, ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<CustomerRequestHistoryDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [conversationsBusy, setConversationsBusy] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(searchParams.get("conversation"));
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messagesBusy, setMessagesBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.authenticated) return;
    setBusy(true);
    setError("");
    getCustomerHistory()
      .then(all => {
        const withReplies = all.filter(item => item.replyCount > 0).slice(0, 5);
        setItems(withReplies);
      })
      .catch(e => setError(e instanceof Error ? e.message : t("chats.error.title")))
      .finally(() => setBusy(false));
  }, [state.authenticated]);

  useEffect(() => {
    if (!state.authenticated) return;
    setConversationsBusy(true);
    listChatConversations()
      .then(res => setConversations(res.items))
      .catch(() => setConversations([]))
      .finally(() => setConversationsBusy(false));
  }, [state.authenticated]);

  const openConversation = useCallback(async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSearchParams({ conversation: conversationId }, { replace: true });
    setMessagesBusy(true);
    try {
      const res = await getChatMessages(conversationId);
      setMessages(res.items);
      await markChatRead(conversationId).catch(() => undefined);
      setConversations(prev => prev.map(item =>
        item.conversationId === conversationId ? { ...item, customerUnreadCount: 0 } : item));
    } catch {
      setMessages([]);
    } finally {
      setMessagesBusy(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const target = searchParams.get("conversation");
    if (state.authenticated && target && target !== selectedConversationId) {
      openConversation(target);
    } else if (state.authenticated && target && messages.length === 0 && !messagesBusy) {
      openConversation(target);
    }
  }, [state.authenticated]);

  const sendReply = async () => {
    if (!selectedConversationId || !replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");
    try {
      const msg = await sendChatMessage(selectedConversationId, text);
      setMessages(prev => [...prev, msg]);
    } catch {
      setError(t("chats.error.title"));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId) return;
    setUploading(true);
    try {
      const url = await uploadChatFile(selectedConversationId, file);
      const msg = await sendChatMessage(selectedConversationId, "", url);
      setMessages(prev => [...prev, msg]);
    } catch {
      setError(t("chats.error.title"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleViewResults = (item: CustomerRequestHistoryDto) => {
    navigate(buildRoute(ROUTES.results, {}, { query: item.query, mode: item.scope === "PRODUCT" ? "products" : "services", city: item.city }));
  };

  if (!state.authenticated) {
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

  const selectedConversation = conversations.find(item => item.conversationId === selectedConversationId);

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

        {(conversationsBusy || conversations.length > 0) && (
          <section style={{ marginBottom: "var(--fcw-space-lg)" }}>
            <h3 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)" }}>{t("chats.conversations.title")}</h3>
            {conversationsBusy && <Loading size="sm" />}
            {!conversationsBusy && (
              <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                {conversations.map(conv => (
                  <Card
                    key={conv.conversationId}
                    padding="md"
                    className="fcw-card-clickable"
                    onClick={() => openConversation(conv.conversationId)}
                    style={selectedConversationId === conv.conversationId
                      ? { borderColor: "var(--fcw-color-primary)" } : undefined}
                  >
                    <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                      <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 0 }}>
                        <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {conv.subject || conv.customerName}
                        </span>
                        <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                          <span className="fcw-body-xs" style={{
                            color: conv.conversationType === "MANAGED_IMPORT" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-tertiary)",
                            backgroundColor: conv.conversationType === "MANAGED_IMPORT"
                              ? "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)"
                              : "var(--fcw-color-surface-secondary)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--fcw-radius-full)",
                          }}>
                            {t(`chats.conversations.type.${conv.conversationType}`)}
                          </span>
                          <span className="fcw-body-xs fcw-text-tertiary">
                            {t(`chats.conversations.status.${conv.conversationStatus}`)}
                          </span>
                          {conv.lastMessageAt && (
                            <span className="fcw-body-xs fcw-text-tertiary">{timeAgo(conv.lastMessageAt, t)}</span>
                          )}
                        </div>
                      </div>
                      {conv.customerUnreadCount > 0 && (
                        <span className="fcw-body-xs" style={{
                          color: "var(--fcw-color-accent)",
                          backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "var(--fcw-radius-full)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {conv.customerUnreadCount}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {selectedConversationId && (
              <Card padding="md" style={{ marginTop: "var(--fcw-space-sm)" }}>
                <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                  <span className="fcw-body fcw-weight-semibold">
                    {selectedConversation?.subject || t("chats.conversations.thread")}
                  </span>
                  <div className="fcw-flex-col" style={{ gap: "0.5rem", maxHeight: "45vh", overflowY: "auto" }}>
                    {messagesBusy && <Loader2 size={18} className="fcw-spin" />}
                    {!messagesBusy && messages.map(msg => (
                      <div
                        key={msg.messageId}
                        style={{
                          alignSelf: msg.senderType === "CUSTOMER" ? "flex-end" : "flex-start",
                          maxWidth: "80%",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--fcw-radius-md)",
                          backgroundColor: msg.senderType === "CUSTOMER"
                            ? "color-mix(in srgb, var(--fcw-color-primary) 12%, transparent)"
                            : "var(--fcw-color-surface-secondary)",
                        }}
                      >
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                          <span className="fcw-body-xs fcw-text-tertiary">
                            {t(`chats.conversations.sender.${msg.senderType}`)}
                          </span>
                          {msg.senderType !== "CUSTOMER" && msg.senderType !== "SYSTEM" && (
                            <button
                              className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                              style={{ padding: 0, width: 18, height: 18 }}
                              aria-label={t("report.title.MESSAGE")}
                              onClick={() => setReportMessageId(msg.messageId)}
                            >
                              <Flag size={11} />
                            </button>
                          )}
                        </div>
                        {msg.text && <p className="fcw-body-s" style={{ margin: 0 }}>{msg.text}</p>}
                        {msg.attachmentUrl && (
                          <a className="fcw-body-s" href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                            {t("chats.conversations.attachment")}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedConversation?.conversationStatus !== "CLOSED" && (
                    <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                      <label className="fcw-btn fcw-btn-secondary fcw-btn-icon" style={{ cursor: "pointer" }} aria-label={t("chats.conversations.attach")}>
                        {uploading ? <Loader2 size={15} className="fcw-spin" /> : <Paperclip size={15} />}
                        <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
                      </label>
                      <input
                        className="fcw-input"
                        style={{ flex: 1 }}
                        value={replyText}
                        placeholder={t("chats.conversations.placeholder")}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") sendReply(); }}
                      />
                      <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={sendReply} disabled={!replyText.trim()}>
                        <Send size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </section>
        )}

        <ReportDialog
          targetType="MESSAGE"
          targetId={reportMessageId ?? ""}
          open={Boolean(reportMessageId)}
          onClose={() => setReportMessageId(null)}
        />

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

        {!busy && !error && items.length === 0 && conversations.length === 0 && !conversationsBusy && (
          <EmptyState
            title={t("chats.empty.title")}
            description={t("chats.empty.description")}
            icon={<MessageCircle size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
          />
        )}

        {!busy && !error && items.length > 0 && (
          <section>
            <h3 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)" }}>{t("chats.history.title")}</h3>
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
          </section>
        )}
      </div>
    </main>
  );
}
