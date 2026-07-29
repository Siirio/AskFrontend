import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getBusinessChatMessages,
  markBusinessChatRead,
  sendBusinessChatMessage,
  uploadChatFile,
} from "../../shared/api/askClient";
import type { ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
import { MessageReadStatus } from "../../shared/ui/MessageReadStatus/MessageReadStatus";

type BusinessChatDrawerProps = {
  businessId: string;
  conversation: ChatConversationDto | null;
  onClose: () => void;
  onActivity: () => void;
};

export function BusinessChatDrawer({
  businessId,
  conversation,
  onClose,
  onActivity,
}: BusinessChatDrawerProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation?.conversationId ?? "";

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setText("");
      setFile(null);
      return;
    }
    setBusy(true);
    setError("");
    getBusinessChatMessages(conversationId, businessId)
      .then(response => setMessages(response.items))
      .then(() => markBusinessChatRead(conversationId, businessId))
      .then(onActivity)
      .catch(reason => setError(reason instanceof Error ? reason.message : t("business.chats.loadError")))
      .finally(() => setBusy(false));
  }, [businessId, conversationId, onActivity, t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const value = text.trim();
    if (!conversationId || (!value && !file) || sending) return;
    setSending(true);
    setError("");
    try {
      const attachmentUrl = file ? await uploadChatFile(conversationId, file) : undefined;
      const message = await sendBusinessChatMessage(conversationId, businessId, value, attachmentUrl);
      setMessages(current => [...current, message]);
      setText("");
      setFile(null);
      onActivity();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("business.chats.sendError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {conversation && (
        <motion.aside
          className="support-drawer business-chat-drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 38 }}
          aria-label={conversation.subject}
        >
          <header>
            <span className="support-drawer-mark"><MessageCircle size={20} /></span>
            <span>
              <strong>{conversation.subject || t("business.chats.title")}</strong>
              <small>{conversation.customerName || t("business.chats.customer")}</small>
            </span>
            <button type="button" className="fcw-btn fcw-btn-ghost fcw-btn-icon" onClick={onClose} aria-label={t("common.close")}>
              <X size={18} />
            </button>
          </header>

          <div className="support-drawer-messages">
            {busy && <Loader2 className="fcw-animate-spin" size={22} />}
            {!busy && messages.length === 0 && !error && (
              <div className="support-drawer-empty">
                <MessageCircle size={28} />
                <strong>{t("business.chats.noMessages")}</strong>
              </div>
            )}
            {messages.map(message => (
              <div
                key={message.messageId}
                className={`support-message support-message--${message.senderType.toLowerCase()}${message.senderType === "BUSINESS" ? " is-own" : ""}`}
              >
                <small>{t(`chats.conversations.sender.${message.senderType}`)}</small>
                {message.text && <p>{message.text}</p>}
                {message.attachmentUrl && (
                  <a href={message.attachmentUrl} target="_blank" rel="noreferrer">
                    {t("business.chats.attachment")}
                  </a>
                )}
                {message.senderType === "BUSINESS" && <MessageReadStatus readAt={message.readAt} compact />}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {file && (
            <div className="business-chat-drawer__file">
              <Paperclip size={14} />
              <span>{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label={t("common.close")}><X size={13} /></button>
            </div>
          )}
          {error && <p className="support-drawer-error">{error}</p>}
          <footer>
            <label className="fcw-btn fcw-btn-secondary fcw-btn-icon">
              <Paperclip size={17} />
              <input
                type="file"
                hidden
                onChange={event => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={t("business.chats.replyPlaceholder")}
              rows={2}
            />
            <button type="button" className="fcw-btn fcw-btn-primary fcw-btn-icon" onClick={send} disabled={sending || (!text.trim() && !file)}>
              {sending ? <Loader2 className="fcw-animate-spin" size={17} /> : <Send size={17} />}
            </button>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
