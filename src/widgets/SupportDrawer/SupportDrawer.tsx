import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Headphones, Loader2, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getChatMessages,
  markChatRead,
  openPlatformSupportConversation,
  sendChatMessage,
} from "../../shared/api/askClient";
import type { ChatMessageDto } from "../../shared/api/dto";
import { MessageReadStatus } from "../../shared/ui/MessageReadStatus/MessageReadStatus";

type SupportDrawerProps = {
  open: boolean;
  businessId?: string;
  businessName?: string;
  onClose: () => void;
};

export function SupportDrawer({ open, businessId, businessName, onClose }: SupportDrawerProps) {
  const { t } = useTranslation();
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    setError("");
    openPlatformSupportConversation(businessId)
      .then(async conversation => {
        setConversationId(conversation.conversationId);
        const response = await getChatMessages(conversation.conversationId);
        setMessages(response.items);
        await markChatRead(conversation.conversationId);
      })
      .catch(() => setError(t("supportDrawer.error")))
      .finally(() => setBusy(false));
  }, [open, businessId, t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const value = text.trim();
    if (!value || !conversationId) return;
    setText("");
    try {
      const message = await sendChatMessage(conversationId, value);
      setMessages(current => [...current, message]);
    } catch {
      setText(value);
      setError(t("supportDrawer.error"));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="support-drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 38 }}
          aria-label={t("supportDrawer.title")}
        >
          <header>
            <span className="support-drawer-mark"><Headphones size={20} /></span>
            <span>
              <strong>{t("supportDrawer.title")}</strong>
              <small>{businessName ? t("supportDrawer.businessContext", { business: businessName }) : t("supportDrawer.personalContext")}</small>
            </span>
            <button className="fcw-btn fcw-btn-ghost fcw-btn-icon" onClick={onClose} aria-label={t("common.close")}>
              <X size={18} />
            </button>
          </header>

          <div className="support-drawer-messages">
            {busy && <Loader2 className="fcw-animate-spin" size={22} />}
            {!busy && messages.length === 0 && !error && (
              <div className="support-drawer-empty">
                <Headphones size={28} />
                <strong>{t("supportDrawer.emptyTitle")}</strong>
                <p>{t("supportDrawer.emptyDescription")}</p>
              </div>
            )}
            {messages.map(message => (
              <div
                key={message.messageId}
                className={`support-message${message.senderType === "CUSTOMER" ? " is-own" : ""}`}
              >
                <small>{t(`chats.conversations.sender.${message.senderType}`)}</small>
                <p>{message.text}</p>
                {message.senderType === "CUSTOMER" && <MessageReadStatus readAt={message.readAt} />}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {error && <p className="support-drawer-error">{error}</p>}
          <footer>
            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={t("supportDrawer.placeholder")}
              rows={2}
            />
            <button className="fcw-btn fcw-btn-primary fcw-btn-icon" onClick={send} disabled={!text.trim() || !conversationId}>
              <Send size={17} />
            </button>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
