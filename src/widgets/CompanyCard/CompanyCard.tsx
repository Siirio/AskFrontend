import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, MessageCircle, X, Send, Loader2 } from "lucide-react";
import type { ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { useMotion } from "../../app/providers/MotionProvider";
import { resolveContactAction } from "../../shared/api/askClient";
import type { ContactResolveDto } from "../../shared/api/dto";

interface Props {
  data: ResultCardData | null;
  onClose: () => void;
}

export function CompanyCard({ data, onClose }: Props) {
  const { reduced } = useMotion();
  const [showChat, setShowChat] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactResolveDto | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  const handleOpenChat = async () => {
    setShowChat(true);
    if (!data?.contactActionId || contactInfo) return;
    setChatBusy(true);
    try {
      const resolved = await resolveContactAction(data.contactActionId);
      setContactInfo(resolved);
    } catch {
      setContactInfo(null);
    } finally {
      setChatBusy(false);
    }
  };

  const handleSend = async () => {
    if (!chatMessage.trim() || !data?.contactActionId) return;
    const text = chatMessage.trim();
    setChatMessage("");
    try {
      const resolved = contactInfo || await resolveContactAction(data.contactActionId);
      setContactInfo(resolved);
      if (resolved.actionType === "REDIRECT" && resolved.redirectUrl) {
        window.open(resolved.redirectUrl, "_blank");
      } else if (resolved.actionType === "DEEP_LINK" && resolved.deepLink) {
        window.open(resolved.deepLink, "_blank");
      }
    } catch {
      // Resolve failed — still clear input
    }
  };

  const brandLabel = data?.brandName || data?.title || "";

  return (
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
                  aria-label="Назад к информации"
                >
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                  onClick={onClose}
                  aria-label="Закрыть"
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
                  {showChat ? `Чат — ${brandLabel}` : brandLabel}
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
                aria-label="Закрыть"
                style={{ marginLeft: "auto" }}
              >
                <X size={18} />
              </button>
            </div>

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
                    ) : (
                      <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                        {contactInfo ? (
                          <div
                            style={{
                              padding: "0.75rem 1rem",
                              backgroundColor: "var(--fcw-color-surface-secondary)",
                              borderRadius: "var(--fcw-radius-lg)",
                              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            }}
                          >
                            <p className="fcw-body-s" style={{ margin: 0 }}>
                              {contactInfo.actionType === "REDIRECT" && "Чат откроется в отдельном приложении. Нажмите кнопку ниже чтобы перейти."}
                              {contactInfo.actionType === "DISPLAY" && `Контакт: ${contactInfo.displayValue || contactInfo.label}`}
                              {contactInfo.actionType === "DEEP_LINK" && "Чат доступен через приложение."}
                              {contactInfo.actionType === "CHAT" && "Напишите ваше сообщение продавцу."}
                            </p>
                            <p className="fcw-body-xs fcw-text-tertiary" style={{ margin: "0.375rem 0 0 0" }}>
                              Через {contactInfo.provider} — {contactInfo.label}
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "0.75rem 1rem",
                              backgroundColor: "var(--fcw-color-surface-secondary)",
                              borderRadius: "var(--fcw-radius-lg)",
                              textAlign: "center",
                            }}
                          >
                            <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                              Напишите продавцу чтобы начать общение
                            </p>
                          </div>
                        )}
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
                      type="text"
                      className="fcw-input"
                      placeholder="Введите сообщение..."
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="fcw-btn fcw-btn-primary fcw-btn-icon"
                      onClick={handleSend}
                      disabled={!chatMessage.trim()}
                      aria-label="Отправить"
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
                        Расстояние: {data.distance}
                      </div>
                    )}
                    {data.price && (
                      <div className="fcw-body-l fcw-weight-bold" style={{ color: "var(--fcw-color-primary)" }}>
                        {data.price}
                      </div>
                    )}
                  </div>

                  {/* Intent reasons */}
                  {data.intentReasons && data.intentReasons.length > 0 && (
                    <div style={{ marginTop: "1.25rem" }}>
                      <span className="fcw-label" style={{ display: "block", marginBottom: "0.5rem" }}>Почему вам подходит</span>
                      <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.375rem" }}>
                        {data.intentReasons.map((reason, i) => (
                          <span
                            key={i}
                            className="fcw-body-s"
                            style={{
                              padding: "0.25rem 0.75rem",
                              backgroundColor: "var(--fcw-color-surface-secondary)",
                              borderRadius: "var(--fcw-radius-full)",
                              color: "var(--fcw-color-text-secondary)",
                            }}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business card placeholder */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      padding: "2rem",
                      textAlign: "center",
                      backgroundColor: "var(--fcw-color-surface-secondary)",
                      borderRadius: "var(--fcw-radius-lg)",
                      border: "1px dashed var(--fcw-color-border)",
                    }}
                  >
                    <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                      Визитка компании загружается...
                    </p>
                  </div>
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
                  Написать продавцу
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
