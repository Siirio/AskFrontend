import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, MessageCircle, X, Send, Loader2, Pin, PinOff, CheckCheck, Paperclip, FileText } from "lucide-react";
import { useChat } from "./ChatContext";
import { useMotion } from "../../app/providers/MotionProvider";
import { startChatConversation, getChatMessages, sendChatMessage, markChatRead, getPublicBusinessCard, uploadChatFile } from "../../shared/api/askClient";
import type { BusinessCardDto, ChatMessageDto } from "../../shared/api/dto";

const PANEL_WIDTH = 380;

export function ChatPanel() {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const { isOpen, isPinned, chatData, closeChat, togglePin } = useChat();
  const [showChat, setShowChat] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [cardData, setCardData] = useState<BusinessCardDto | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatError, setChatError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !chatData?.businessId) return;
    setCardLoading(true);
    getPublicBusinessCard(chatData.businessId)
      .then(setCardData)
      .catch(() => setCardData(null))
      .finally(() => setCardLoading(false));
  }, [isOpen, chatData?.businessId]);

  useEffect(() => {
    if (!isOpen) {
      setShowChat(false);
      setChatMessage("");
      setMessages([]);
      setConversationId(null);
      setChatError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isPinned) {
      document.body.setAttribute("data-chat-panel-pinned", "");
    } else {
      document.body.removeAttribute("data-chat-panel-pinned");
    }
    return () => { document.body.removeAttribute("data-chat-panel-pinned"); };
  }, [isOpen, isPinned]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeChat]);

  useEffect(() => {
    if (!isOpen || isPinned) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as HTMLElement)) {
        closeChat();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isPinned, closeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (convId: string) => {
    try {
      const res = await getChatMessages(convId);
      setMessages(res.items);
    } catch {
      setMessages([]);
    }
  };

  const handleOpenChat = async () => {
    setShowChat(true);
    setChatError("");
    if (!chatData?.businessId || conversationId) return;
    setChatBusy(true);
    try {
      const subject = chatData.title || chatData.brandName || t("companyCard.newChat");
      const conv = await startChatConversation(chatData.businessId, subject);
      setConversationId(conv.conversationId);
      await loadMessages(conv.conversationId);
    } catch {
      setChatError(t("companyCard.chat.error"));
    } finally {
      setChatBusy(false);
    }
  };

  const handleSend = async () => {
    if (!chatMessage.trim()) return;
    const text = chatMessage.trim();
    setChatMessage("");
    setChatError("");

    if (conversationId) {
      try {
        const msg = await sendChatMessage(conversationId, text);
        setMessages(prev => [...prev, msg]);
      } catch {
        setChatError(t("companyCard.chat.sendError"));
      }
      return;
    }

    if (!chatData?.businessId) {
      setChatError(t("companyCard.chat.error"));
      return;
    }

    try {
      const subject = chatData.title || chatData.brandName || t("companyCard.newChat");
      const conv = await startChatConversation(chatData.businessId, subject);
      setConversationId(conv.conversationId);
      const msg = await sendChatMessage(conv.conversationId, text);
      setMessages([msg]);
    } catch {
      setChatError(t("companyCard.chat.error"));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setChatError("");
    try {
      let targetConversationId = conversationId;
      if (!targetConversationId) {
        if (!chatData?.businessId) {
          setChatError(t("companyCard.chat.error"));
          return;
        }
        const subject = chatData.title || chatData.brandName || t("companyCard.newChat");
        const conv = await startChatConversation(chatData.businessId, subject);
        targetConversationId = conv.conversationId;
        setConversationId(conv.conversationId);
      }
      const url = await uploadChatFile(targetConversationId, file);
      const msg = await sendChatMessage(targetConversationId, "", url);
      setMessages(prev => [...prev, msg]);
    } catch {
      setChatError(t("companyCard.chat.uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const brandLabel = chatData?.brandName || chatData?.title || "";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <AnimatePresence>
      {isOpen && chatData && (
        <>
          {isMobile && (
            <motion.div
              style={{
                position: "fixed", inset: 0, zIndex: 9998,
                backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeChat}
            />
          )}

          <motion.div
            ref={panelRef}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: isMobile ? "100%" : PANEL_WIDTH,
              height: "100vh",
              zIndex: 9999,
              backgroundColor: "var(--fcw-color-surface)",
              borderLeft: isMobile ? "none" : "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              display: "flex",
              flexDirection: "column",
              boxShadow: isMobile ? "none" : "-8px 0 40px rgba(0,0,0,0.15)",
            }}
            initial={reduced ? { opacity: 0 } : { x: isMobile ? "100%" : PANEL_WIDTH }}
            animate={{ x: 0, opacity: 1 }}
            exit={isMobile ? { x: "100%", opacity: 0 } : { x: PANEL_WIDTH, opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 360, damping: 36 }}
          >
            <div
              style={{
                padding: "0.875rem 1rem",
                borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                flexShrink: 0,
              }}
            >
              {showChat ? (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                  onClick={() => setShowChat(false)}
                  aria-label={t("companyCard.backToInfo")}
                >
                  <ArrowLeft size={18} />
                </button>
              ) : null}
              <div
                style={{
                  width: 36, height: 36,
                  borderRadius: "var(--fcw-radius-md)",
                  backgroundColor: chatData.brandColor || "var(--fcw-color-surface-tertiary)",
                  backgroundImage: chatData.imageUrl ? `url(${chatData.imageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  flexShrink: 0,
                }}
              />
              <div className="fcw-flex-col" style={{ gap: "0.0625rem", minWidth: 0, flex: 1 }}>
                <span className="fcw-body fcw-weight-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                  {showChat ? t("companyCard.chatWith", { brand: brandLabel }) : brandLabel}
                </span>
                {!showChat && chatData.brandName && (
                  <span className="fcw-body-xs fcw-text-tertiary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {chatData.title}
                  </span>
                )}
              </div>
              {!isMobile && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                  onClick={togglePin}
                  aria-label={isPinned ? t("chatPanel.unpin") : t("chatPanel.pin")}
                  style={{ color: isPinned ? "var(--fcw-color-primary)" : undefined }}
                >
                  {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
              )}
              <button
                className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                onClick={closeChat}
                aria-label={t("companyCard.close")}
              >
                <X size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showChat ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                  <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
                    {chatBusy ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                        <Loader2 className="fcw-animate-spin" size={22} style={{ color: "var(--fcw-color-text-tertiary)" }} />
                      </div>
                    ) : chatError ? (
                      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                        <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: 0 }}>{chatError}</p>
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                        <AnimatePresence>
                          {messages.map((msg, i) => {
                            const isMe = msg.senderType === "CUSTOMER";
                            return (
                              <motion.div
                                key={msg.messageId || i}
                                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: i === messages.length - 1 ? 0 : 0 }}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: isMe ? "flex-end" : "flex-start",
                                }}
                              >
                                <div
                                  style={{
                                    maxWidth: "80%",
                                    padding: "0.625rem 0.875rem",
                                    borderRadius: isMe ? "var(--fcw-radius-lg) var(--fcw-radius-lg) 0 var(--fcw-radius-lg)" : "var(--fcw-radius-lg) var(--fcw-radius-lg) var(--fcw-radius-lg) 0",
                                    backgroundColor: isMe ? "var(--fcw-color-primary)" : "var(--fcw-color-surface-secondary)",
                                    color: isMe ? "#fff" : "var(--fcw-color-text)",
                                  }}
                                >
                                  {msg.text ? <p className="fcw-body-s" style={{ margin: 0, lineHeight: 1.5 }}>{msg.text}</p> : null}
                                  {msg.attachmentUrl && (
                                    <a
                                      href={msg.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.375rem",
                                        color: isMe ? "#fff" : "var(--fcw-color-primary)",
                                        marginTop: msg.text ? "0.375rem" : 0,
                                        fontSize: "0.8125rem",
                                      }}
                                    >
                                      <FileText size={14} />
                                      {t("companyCard.chat.attachment")}
                                    </a>
                                  )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.125rem" }}>
                                  <span className="fcw-body-xs" style={{ color: "var(--fcw-color-text-tertiary)", fontSize: "0.65rem" }}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {isMe && msg.readAt && <CheckCheck size={10} style={{ color: "var(--fcw-color-primary)" }} />}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                        <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                          {t("companyCard.chat.start")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                      display: "flex",
                      gap: "0.5rem",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                      accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.csv"
                    />
                    <button
                      className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label={t("companyCard.chat.attachFile")}
                    >
                      {uploading ? <Loader2 className="fcw-animate-spin" size={16} /> : <Paperclip size={16} />}
                    </button>
                    <input
                      type="text"
                      className="fcw-input"
                      placeholder={t("companyCard.chatPlaceholder")}
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="fcw-btn fcw-btn-primary fcw-btn-icon"
                      onClick={handleSend}
                      disabled={!chatMessage.trim()}
                      aria-label={t("companyCard.send")}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flex: 1, overflowY: "auto", padding: "1rem" }}
                >
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: chatData.brandColor || "var(--fcw-color-primary)",
                      marginBottom: "1rem",
                    }}
                  />

                  <div className="fcw-flex-col" style={{ gap: "0.625rem" }}>
                    {chatData.location && (
                      <div className="fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                        <MapPin size={14} style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }} />
                        <span className="fcw-body-s fcw-text-secondary">{chatData.location}</span>
                      </div>
                    )}
                    {chatData.distance && (
                      <div className="fcw-body-s fcw-text-secondary">
                        {t("companyCard.distance")}: {chatData.distance}
                      </div>
                    )}
                    {chatData.price && (
                      <div className="fcw-body-l fcw-weight-bold" style={{ color: "var(--fcw-color-primary)" }}>
                        {chatData.price}
                      </div>
                    )}
                  </div>



                  {cardLoading ? (
                    <div style={{ marginTop: "1.25rem", padding: "2rem", textAlign: "center" }}>
                      <Loader2 className="fcw-animate-spin" size={20} style={{ color: "var(--fcw-color-text-tertiary)" }} />
                    </div>
                  ) : cardData && cardData.blocks.length > 0 ? (
                    <div style={{ marginTop: "1.25rem" }}>
                      {[...cardData.blocks].sort((a, b) => a.displayOrder - b.displayOrder).map((block) => (
                        <div key={block.localId} style={{ marginBottom: "0.625rem" }}>
                          <PreviewBlock block={block} brandColor={chatData.brandColor} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>

            {!showChat && (
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                  flexShrink: 0,
                }}
              >
                <button
                  className="fcw-btn fcw-btn-primary"
                  style={{ width: "100%", gap: "0.5rem" }}
                  onClick={handleOpenChat}
                >
                  <MessageCircle size={16} />
                  {t("companyCard.messageSeller")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PreviewBlock({ block, brandColor }: { block: { blockType: string; config: Record<string, unknown> }; brandColor?: string }) {
  const cfg = block.config || {};
  const bg = (cfg.backgroundColor as string) || "transparent";
  const color = (cfg.textColor as string) || "var(--fcw-color-text)";

  switch (block.blockType) {
    case "HERO":
      return (
        <div style={{ padding: "0.75rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)", textAlign: "center" }}>
          {(cfg.heroImage as string) && <img src={cfg.heroImage as string} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: "var(--fcw-radius-sm)", marginBottom: "0.375rem" }} />}
          {(cfg.heroTitle as string) && <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700, color }}>{cfg.heroTitle as string}</h3>}
          {(cfg.heroSubtitle as string) && <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color, opacity: 0.7 }}>{cfg.heroSubtitle as string}</p>}
        </div>
      );
    case "ABOUT":
      return (
        <div style={{ padding: "0.75rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          {(cfg.aboutTitle as string) && <h4 style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color }}>{cfg.aboutTitle as string}</h4>}
          {(cfg.aboutText as string) && <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color, opacity: 0.8, lineHeight: 1.5 }}>{cfg.aboutText as string}</p>}
        </div>
      );
    case "GALLERY": {
      const images = (cfg.images as string[]) || [];
      if (images.length === 0) return null;
      return (
        <div style={{ padding: "0.5rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: "0.375rem" }}>
            {images.map((img, i) => (
              <img key={i} src={img} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "var(--fcw-radius-sm)" }} />
            ))}
          </div>
        </div>
      );
    }
    case "CONTACTS": {
      const contacts = (cfg.contacts as Array<{ provider: string; url: string; label: string }>) || [];
      if (contacts.length === 0) return null;
      return (
        <div style={{ padding: "0.625rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          {contacts.map((c, i) => (
            <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: "0.75rem", color: brandColor || "var(--fcw-color-primary)", textDecoration: "none", marginBottom: "0.25rem" }}>
              {c.label || c.provider}
            </a>
          ))}
        </div>
      );
    }
    case "SERVICES": {
      const services = (cfg.services as Array<{ name: string; description?: string; price?: string }>) || [];
      if (services.length === 0) return null;
      return (
        <div style={{ padding: "0.625rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          {services.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0", borderBottom: i < services.length - 1 ? "1px solid var(--fcw-color-border)" : undefined }}>
              <span style={{ fontSize: "0.75rem", color }}>{s.name}</span>
              {s.price && <span style={{ fontSize: "0.75rem", fontWeight: 600, color }}>{s.price}</span>}
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
