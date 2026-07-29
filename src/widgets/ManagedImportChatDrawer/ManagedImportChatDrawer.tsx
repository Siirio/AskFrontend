import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getBusinessChatMessages,
  markBusinessChatRead,
  sendBusinessChatMessage,
} from "../../shared/api/askClient";
import type { ChatMessageDto } from "../../shared/api/dto";
import { MessageReadStatus } from "../../shared/ui/MessageReadStatus/MessageReadStatus";

type ManagedImportChatDrawerProps = {
  open: boolean;
  conversationId: string;
  businessId: string;
  businessName?: string;
  onClose: () => void;
};

export function ManagedImportChatDrawer({ open, conversationId, businessId, businessName, onClose }: ManagedImportChatDrawerProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !conversationId) return;
    setBusy(true);
    setError("");
    getBusinessChatMessages(conversationId, businessId)
      .then(async response => {
        setMessages(response.items);
        await markBusinessChatRead(conversationId, businessId);
      })
      .catch(() => setError(t("managedImport.chatError")))
      .finally(() => setBusy(false));
  }, [open, conversationId, businessId, t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const value = text.trim();
    if (!value || !conversationId) return;
    setText("");
    try {
      const message = await sendBusinessChatMessage(conversationId, businessId, value);
      setMessages(current => [...current, message]);
    } catch {
      setText(value);
      setError(t("managedImport.chatError"));
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
        >
          <header>
            <span className="support-drawer-mark"><MessageCircle size={20} /></span>
            <span>
              <strong>{t("managedImport.chatTitle")}</strong>
              <small>{businessName ?? ""}</small>
            </span>
            <button className="fcw-btn fcw-btn-ghost fcw-btn-icon" onClick={onClose} aria-label={t("common.close")}>
              <X size={18} />
            </button>
          </header>

          <div className="support-drawer-messages">
            {busy && <Loader2 className="fcw-animate-spin" size={22} />}
            {!busy && messages.length === 0 && !error && (
              <div className="support-drawer-empty">
                <MessageCircle size={28} />
                <strong>{t(conversationId ? "managedImport.chatEmpty" : "managedImport.chatSubmitted")}</strong>
                <p>{t(conversationId ? "managedImport.chatEmptyDesc" : "managedImport.chatSubmittedDesc")}</p>
              </div>
            )}
            {messages.map(message => (
              <div
                key={message.messageId}
                className={`support-message${message.senderType === "BUSINESS" ? " is-own" : ""}`}
              >
                <small>{t(`chats.conversations.sender.${message.senderType}`)}</small>
                <p>{message.text}</p>
                {message.senderType === "BUSINESS" && <MessageReadStatus readAt={message.readAt} />}
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
              placeholder={t("managedImport.chatPlaceholder")}
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
