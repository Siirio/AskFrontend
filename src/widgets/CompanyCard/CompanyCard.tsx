import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, MessageCircle, X, Send, Loader2, CheckCheck, Paperclip, FileText, Flag } from "lucide-react";
import type { ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { useMotion } from "../../app/providers/MotionProvider";
import { getPublicBusinessCard, startChatConversation, getChatMessages, sendChatMessage, uploadChatFile } from "../../shared/api/askClient";
import { ReportDialog } from "../ReportDialog/ReportDialog";
import type { BusinessCardDto, ChatMessageDto } from "../../shared/api/dto";

interface Props {
  data: ResultCardData | null;
  onClose: () => void;
}

export function CompanyCard({ data, onClose }: Props) {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const [showChat, setShowChat] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [cardData, setCardData] = useState<BusinessCardDto | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatError, setChatError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data?.businessId) return;
    setCardLoading(true);
    getPublicBusinessCard(data.businessId)
      .then(setCardData)
      .catch(() => setCardData(null))
      .finally(() => setCardLoading(false));
  }, [data?.businessId]);

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
    if (!data?.businessId || conversationId) return;
    setChatBusy(true);
    try {
      const subject = data.title || data.brandName || t("companyCard.newChat");
      const conv = await startChatConversation(data.businessId, subject);
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

    if (!data?.businessId) {
      setChatError(t("companyCard.chat.error"));
      return;
    }

    try {
      const subject = data.title || data.brandName || t("companyCard.newChat");
      const conv = await startChatConversation(data.businessId, subject);
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
        if (!data?.businessId) {
          setChatError(t("companyCard.chat.error"));
          return;
        }
        const subject = data.title || data.brandName || t("companyCard.newChat");
        const conv = await startChatConversation(data.businessId, subject);
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

  const brandLabel = data?.brandName || data?.title || "";

  return (
    <>
      <AnimatePresence>
      {data && (
        <motion.div
          className="fcw-fixed fcw-z-modal"
          style={{
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: showChat ? 720 : 720,
              maxHeight: "92vh",
              backgroundColor: "var(--fcw-color-surface)",
              borderRadius: "var(--fcw-radius-xl) var(--fcw-radius-xl) 0 0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
            }}
            initial={reduced ? {} : { y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexShrink: 0,
              }}
            >
              {showChat ? (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                  onClick={() => setShowChat(false)}
                  aria-label={t("companyCard.backToInfo")}
                >
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                  onClick={onClose}
                  aria-label={t("companyCard.close")}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--fcw-radius-md)",
                  backgroundColor: data.brandColor || "var(--fcw-color-surface-tertiary)",
                  backgroundImage: data.imageUrl ? `url(${data.imageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  flexShrink: 0,
                }}
              />
              <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
                <span className="fcw-body fcw-weight-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {showChat ? t("companyCard.chatWith", { brand: brandLabel }) : brandLabel}
                </span>
                {!showChat && (
                  <span className="fcw-body-xs fcw-text-tertiary">
                    {data.brandName ? data.title : ""}
                  </span>
                )}
              </div>
              <button
                className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                onClick={onClose}
                aria-label={t("companyCard.close")}
                style={{ marginLeft: "auto" }}
              >
                <X size={18} />
              </button>
            </div>

            {!showChat && data.businessId && (
              <button
                className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                style={{ alignSelf: "flex-start", margin: "0.25rem 1rem 0", gap: "0.375rem", color: "var(--fcw-color-text-tertiary)" }}
                onClick={() => setReportOpen(true)}
              >
                <Flag size={12} />
                {t("report.title.BUSINESS")}
              </button>
            )}

            {/* Content */}
            <AnimatePresence mode="wait">
              {showChat ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                  {/* Messages area */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
                    {chatBusy ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                        <Loader2 className="fcw-animate-spin" size={24} style={{ color: "var(--fcw-color-text-tertiary)" }} />
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

                  {/* Chat input */}
                  <div
                    style={{
                      padding: "0.75rem 1.25rem",
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
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}
                >
                  {/* Brand stripe */}
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: data.brandColor || "var(--fcw-color-primary)",
                      marginBottom: "1.25rem",
                    }}
                  />

                  {/* Info section */}
                  <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                    {data.location && (
                      <div className="fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                        <MapPin size={14} style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }} />
                        <span className="fcw-body-s fcw-text-secondary">{data.location}</span>
                      </div>
                    )}
                    {data.distance && (
                      <div className="fcw-body-s fcw-text-secondary">
                        {t("companyCard.distance")}: {data.distance}
                      </div>
                    )}
                    {data.price && (
                      <div className="fcw-body-l fcw-weight-bold" style={{ color: "var(--fcw-color-primary)" }}>
                        {data.price}
                      </div>
                    )}
                  </div>



                  {/* Business card */}
                  {cardLoading ? (
                    <div style={{ marginTop: "1.5rem", padding: "2rem", textAlign: "center" }}>
                      <Loader2 className="fcw-animate-spin" size={20} style={{ color: "var(--fcw-color-text-tertiary)" }} />
                    </div>
                  ) : cardData && cardData.blocks.length > 0 ? (
                    <div style={{ marginTop: "1.5rem" }}>
                      {[...cardData.blocks].sort((a, b) => a.displayOrder - b.displayOrder).map((block) => (
                        <div key={block.localId} style={{ marginBottom: "0.75rem" }}>
                          <PreviewBlock block={block} brandColor={data?.brandColor} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            {!showChat && (
              <div
                style={{
                  padding: "1rem 1.25rem",
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
        </motion.div>
      )}
      </AnimatePresence>
      <ReportDialog
        targetType="BUSINESS"
        targetId={data?.businessId ?? ""}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}

function PreviewBlock({ block, brandColor }: { block: { blockType: string; config: Record<string, unknown> }; brandColor?: string }) {
  const cfg = block.config || {};
  const bg = (cfg.backgroundColor as string) || "transparent";
  const color = (cfg.textColor as string) || "var(--fcw-color-text)";

  switch (block.blockType) {
    case "HERO":
      return (
        <div style={{ padding: "1rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)", textAlign: "center" }}>
          {(cfg.heroImage as string) && <img src={cfg.heroImage as string} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: "var(--fcw-radius-sm)", marginBottom: "0.5rem" }} />}
          {(cfg.heroTitle as string) && <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>{cfg.heroTitle as string}</h3>}
          {(cfg.heroSubtitle as string) && <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color, opacity: 0.7 }}>{cfg.heroSubtitle as string}</p>}
        </div>
      );
    case "ABOUT":
      return (
        <div style={{ padding: "1rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          {(cfg.aboutTitle as string) && <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color }}>{cfg.aboutTitle as string}</h4>}
          {(cfg.aboutText as string) && <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color, opacity: 0.8, lineHeight: 1.5 }}>{cfg.aboutText as string}</p>}
        </div>
      );
    case "GALLERY": {
      const images = (cfg.images as string[]) || [];
      if (images.length === 0) return null;
      return (
        <div style={{ padding: "0.5rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.375rem" }}>
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
        <div style={{ padding: "0.75rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          {contacts.map((c, i) => (
            <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: "0.8125rem", color: brandColor || "var(--fcw-color-primary)", textDecoration: "none", marginBottom: "0.25rem" }}>
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
        <div style={{ padding: "0.75rem", backgroundColor: bg, borderRadius: "var(--fcw-radius-md)" }}>
          {services.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.375rem 0", borderBottom: i < services.length - 1 ? "1px solid var(--fcw-color-border)" : undefined }}>
              <span style={{ fontSize: "0.8125rem", color }}>{s.name}</span>
              {s.price && <span style={{ fontSize: "0.8125rem", fontWeight: 600, color }}>{s.price}</span>}
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
