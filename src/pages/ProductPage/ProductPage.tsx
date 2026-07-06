import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Phone, MessageCircle, ShieldCheck, Clock3, Store, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { BrandBadge } from "../../shared/ui/BrandBadge/BrandBadge";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Modal } from "../../shared/ui/Modal/Modal";
import { useAuth } from "../../app/providers/AuthProvider";
import { resolveContactAction } from "../../shared/api/askClient";
import type { ResultCardData } from "../../shared/ui/ResultCard/ResultCard";

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const { state: authState } = useAuth();

  const card = (location.state as { card?: ResultCardData })?.card;
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [contactState, setContactState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [contactError, setContactError] = useState("");

  if (!card) {
    return (
      <main id="main-content">
        <div className="fcw-container fcw-section" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title={t("product.notFound")}
            description={t("product.notFoundDesc", { id })}
            action={
              <button className="fcw-btn fcw-btn-primary" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} />
                {t("auth.button.back")}
              </button>
            }
          />
        </div>
      </main>
    );
  }

  const typeLabel = card.type === "ServiceCard" ? t("product.type.service") : t("product.type.product");
  const reasons = card.intentReasons?.slice(0, 3) || [];

  const handleRequestContact = async () => {
    if (!authState.session) {
      navigate("/auth");
      return;
    }
    setContactState("loading");
    setContactError("");
    try {
      await resolveContactAction(id!);
      setContactState("success");
    } catch (err: unknown) {
      setContactState("error");
      setContactError(err instanceof Error ? err.message : t("product.contactFailed"));
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setContactState("loading");
    setContactError("");
    try {
      await resolveContactAction(id!);
      setContactState("success");
      setMessageText("");
      setShowMessageModal(false);
    } catch (err: unknown) {
      setContactState("error");
      setContactError(err instanceof Error ? err.message : t("product.messageFailed"));
    }
  };

  return (
    <main id="main-content">
      <div className="fcw-container fcw-section-sm">
        <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: "var(--fcw-space-md)" }}>
          <ArrowLeft size={16} />
          {t("product.backToResults")}
        </button>

        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--fcw-space-lg)", alignItems: "start" }}
        >
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <div
              className="fcw-elevation-sm"
              style={{
                minHeight: 360,
                aspectRatio: "4 / 3",
                borderRadius: "var(--fcw-radius-lg)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                overflow: "hidden",
                background:
                  card.imageUrl
                    ? `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.22)), url(${card.imageUrl})`
                    : `linear-gradient(135deg, ${card.brandColor || "var(--fcw-color-surface-secondary)"}, var(--fcw-color-surface-tertiary))`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "flex-end",
                padding: "1.25rem",
              }}
            >
              {!card.imageUrl && (
                <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem", color: "var(--fcw-color-text-secondary)" }}>
                  <ImageIcon size={28} />
                  <span className="fcw-body-s">{t("product.photoPending")}</span>
                </div>
              )}
            </div>

            <Card padding="lg">
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", marginBottom: "0.75rem" }}>
                {card.brandName && <BrandBadge name={card.brandName} verified={card.verified} />}
                <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                  <Clock3 size={12} />
                  {typeLabel}
                </span>
              </div>
              <h1 className="fcw-h1" style={{ margin: "0 0 0.5rem 0" }}>{card.title}</h1>
              {card.subtitle && <p className="fcw-body fcw-text-secondary" style={{ margin: "0 0 1rem 0" }}>{card.subtitle}</p>}
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "1rem" }}>
                <div className="fcw-h2 fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", margin: 0 }}>
                  {card.price || t("product.priceOnRequest")}
                </div>
                {card.location && (
                  <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                    <MapPin size={13} />
                    {card.location}
                  </span>
                )}
              </div>
            </Card>
          </div>

          <aside className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)", position: "sticky", top: 86 }}>
            <Card padding="lg">
              <h2 className="fcw-h3" style={{ margin: "0 0 0.75rem 0" }}>{t("product.contact")}</h2>
              <div className="fcw-flex-col" style={{ gap: "0.625rem" }}>
                <button className="fcw-btn fcw-btn-primary fcw-btn-full" onClick={() => setShowMessageModal(true)}>
                  <MessageCircle size={18} />
                  {t("product.messageSeller")}
                </button>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-full" onClick={handleRequestContact} disabled={contactState === "loading"}>
                  {contactState === "loading" ? <Loader2 className="fcw-animate-spin" size={18} /> : contactState === "success" ? <CheckCircle2 size={18} /> : <Phone size={18} />}
                  {contactState === "success" ? t("product.requestSent") : t("product.requestContact")}
                </button>
                {contactState === "error" && (
                  <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: 0 }}>{contactError}</p>
                )}
              </div>
            </Card>

            <Card padding="lg">
              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                  <div>
                    <h2 className="fcw-h3" style={{ margin: 0 }}>{card.brandName || t("product.seller")}</h2>
                    {card.location && <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.25rem 0 0" }}>{card.location}</p>}
                  </div>
                  <Store size={20} style={{ color: "var(--fcw-color-primary)", flexShrink: 0 }} />
                </div>
                {card.brandName && (
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => navigate(`/storefront/${card.id}`)}>
                    {t("product.openStorefront")}
                  </button>
                )}
              </div>
            </Card>

            {reasons.length > 0 && (
              <Card padding="lg">
                <h2 className="fcw-h3" style={{ margin: "0 0 0.75rem 0" }}>{t("product.whyMatch")}</h2>
                <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                  {reasons.map((reason, index) => (
                    <div key={index} className="fcw-body-s fcw-flex" style={{ gap: "0.5rem", alignItems: "flex-start" }}>
                      <ShieldCheck size={14} style={{ color: "var(--fcw-color-accent)", flexShrink: 0, marginTop: 2 }} />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </aside>
        </motion.div>

        <Modal open={showMessageModal} onClose={() => { setShowMessageModal(false); setContactState("idle"); setContactError(""); }} title={t("product.modal.title")}>
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <p className="fcw-body fcw-text-secondary" style={{ margin: 0 }}>
              {t("product.modal.body", { seller: card.brandName || "", product: card.title })}
            </p>
            <textarea
              className="fcw-input"
              rows={4}
              placeholder={t("product.modal.placeholder")}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            />
            {contactState === "error" && (
              <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: 0, display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <AlertCircle size={14} />
                {contactError}
              </p>
            )}
            <div className="fcw-flex" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="fcw-btn fcw-btn-secondary" onClick={() => { setShowMessageModal(false); setContactState("idle"); setContactError(""); }}>
                {t("product.modal.cancel")}
              </button>
              <button className="fcw-btn fcw-btn-primary" onClick={handleSendMessage} disabled={!messageText.trim() || contactState === "loading"}>
                {contactState === "loading" ? <Loader2 className="fcw-animate-spin" size={16} /> : <MessageCircle size={16} />}
                {t("product.modal.send")}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
