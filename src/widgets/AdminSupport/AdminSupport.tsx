import { useEffect, useState, useCallback } from "react";
import { Send, X, Loader2, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listPlatformSupportConversations,
  getPlatformSupportMessages,
  sendPlatformSupportMessage,
  closePlatformSupportConversation,
} from "../../shared/api/platformClient";
import { uploadChatFile } from "../../shared/api/askClient";
import type { ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
import { Card } from "../../shared/ui/Card/Card";
import { Loading } from "../../shared/ui/Loading/Loading";
import { useToast } from "../../shared/ui/Toast/Toast";
import { ApiError } from "../../shared/api/httpClient";

export function AdminSupport() {
  const { t } = useTranslation();
  const toast = useToast();
  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messagesBusy, setMessagesBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);

  const loadConversations = useCallback(() => {
    listPlatformSupportConversations()
      .then(res => setConversations(res.items))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (conversationId: string) => {
    setSelectedId(conversationId);
    setMessagesBusy(true);
    try {
      const res = await getPlatformSupportMessages(conversationId);
      setMessages(res.items);
    } catch {
      setMessages([]);
    } finally {
      setMessagesBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selectedId || (!replyText.trim() && !replyFile)) return;
    const text = replyText.trim();
    setReplyText("");
    try {
      const attachmentUrl = replyFile
        ? await uploadChatFile(selectedId, replyFile)
        : undefined;
      const msg = await sendPlatformSupportMessage(selectedId, text, attachmentUrl);
      setReplyFile(null);
      setMessages(prev => [...prev, msg]);
      loadConversations();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.support.sendError"), "error");
    }
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    try {
      await closePlatformSupportConversation(selectedId);
      toast.show(t("platform.support.closed"), "success");
      setSelectedId(null);
      setMessages([]);
      loadConversations();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.support.sendError"), "error");
    }
  };

  if (loading) return <Loading />;

  const selected = conversations.find(c => c.conversationId === selectedId);

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.sections.support")}</h1>
        <p className="fcw-body-s fcw-text-secondary">{t("platform.support.subtitle")}</p>
      </div>
      <div className="fcw-grid" style={{ gridTemplateColumns: "minmax(240px, 1fr) 2fr", gap: "var(--fcw-space-md)", alignItems: "start" }}>
        <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
          {conversations.length === 0 && (
            <Card padding="md">
              <p className="fcw-body-s fcw-text-secondary">{t("platform.support.empty")}</p>
            </Card>
          )}
          {conversations.map(conv => (
            <Card
              key={conv.conversationId}
              padding="md"
              className="fcw-card-clickable"
              onClick={() => openConversation(conv.conversationId)}
              style={selectedId === conv.conversationId ? { borderColor: "var(--fcw-color-primary)" } : undefined}
            >
              <div className="fcw-flex-between" style={{ gap: "0.5rem" }}>
                <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
                  <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.subject || conv.customerName || t("platform.support.noSubject")}
                  </span>
                  <span className="fcw-body-xs fcw-text-tertiary">
                    {t(`platform.support.status.${conv.conversationStatus}`)}
                  </span>
                </div>
                {conv.businessUnreadCount > 0 && (
                  <span className="fcw-body-xs" style={{
                    color: "var(--fcw-color-accent)",
                    backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "var(--fcw-radius-full)",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {conv.businessUnreadCount}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
        <Card padding="md">
          {!selectedId && (
            <p className="fcw-body-s fcw-text-secondary">{t("platform.support.select")}</p>
          )}
          {selectedId && (
            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
              <div className="fcw-flex-between" style={{ gap: "0.5rem" }}>
                <span className="fcw-body fcw-weight-semibold">
                  {selected?.subject || selected?.customerName || t("platform.support.noSubject")}
                </span>
                {selected?.conversationStatus !== "CLOSED" && (
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={closeConversation}>
                    <X size={14} />
                    {t("platform.support.close")}
                  </button>
                )}
              </div>
              <div className="fcw-flex-col" style={{ gap: "0.5rem", maxHeight: "50vh", overflowY: "auto" }}>
                {messagesBusy && <Loader2 size={18} className="fcw-spin" />}
                {!messagesBusy && messages.map(msg => (
                  <div
                    key={msg.messageId}
                    style={{
                      alignSelf: msg.senderType === "PLATFORM" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--fcw-radius-md)",
                      backgroundColor: msg.senderType === "PLATFORM"
                        ? "color-mix(in srgb, var(--fcw-color-primary) 12%, transparent)"
                        : "var(--fcw-color-surface-secondary)",
                    }}
                  >
                    <span className="fcw-body-xs fcw-text-tertiary">{t(`platform.support.sender.${msg.senderType}`)}</span>
                    {msg.text && <p className="fcw-body-s" style={{ margin: 0 }}>{msg.text}</p>}
                    {msg.attachmentUrl && (
                      <a className="fcw-body-s" href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                        {t("platform.support.attachment")}
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {selected?.conversationStatus !== "CLOSED" && (
                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                  <label className="fcw-btn fcw-btn-secondary fcw-btn-sm">
                    <Paperclip size={14} />
                    <input type="file" style={{ display: "none" }} onChange={e => setReplyFile(e.target.files?.[0] || null)} />
                  </label>
                  <input
                    className="fcw-input"
                    style={{ flex: 1 }}
                    value={replyText}
                    placeholder={t("platform.support.placeholder")}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendReply(); }}
                  />
                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={sendReply} disabled={!replyText.trim() && !replyFile}>
                    <Send size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
