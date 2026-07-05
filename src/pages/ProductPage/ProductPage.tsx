import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Phone, MessageCircle, ShieldCheck, Clock3, Globe, Store } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { BrandBadge } from "../../shared/ui/BrandBadge/BrandBadge";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import type { ResultCardData } from "../../shared/ui/ResultCard/ResultCard";

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { reduced } = useMotion();

  const card = (location.state as { card?: ResultCardData })?.card;

  if (!card) {
    return (
      <main id="main-content">
        <div className="fcw-container fcw-section" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            title="Товар не найден"
            description={`Информация о товаре #${id} недоступна. Перейдите к результатам поиска и выберите товар.`}
            action={
              <button className="fcw-btn fcw-btn-primary" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} />
                Назад
              </button>
            }
          />
        </div>
      </main>
    );
  }

  const typeLabel = card.type === "ServiceCard" ? "Услуга" : "Товар";

  return (
    <main id="main-content">
      <div className="fcw-container fcw-section-sm">
        <button
          className="fcw-btn fcw-btn-ghost fcw-btn-sm"
          onClick={() => navigate(-1)}
          style={{ marginBottom: "var(--fcw-space-md)" }}
        >
          <ArrowLeft size={16} />
          Назад к результатам
        </button>

        <motion.div
          className="fcw-split-60-40"
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <div
              className="fcw-ratio-product fcw-radius-lg fcw-elevation-sm"
              style={{
                backgroundColor: card.brandColor || "var(--fcw-color-surface-secondary)",
                backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />

            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)", marginTop: "var(--fcw-space-md)" }}>
              <Card>
                <div className="fcw-flex-col" style={{ gap: "1rem" }}>
                  <div className="fcw-flex-between">
                    {card.brandName && <BrandBadge name={card.brandName} verified={card.verified} />}
                    <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                      <Clock3 size={12} />
                      {typeLabel}
                    </span>
                  </div>
                  <div>
                    <h1 className="fcw-h2" style={{ margin: "0 0 0.5rem 0" }}>{card.title}</h1>
                    {card.subtitle && (
                      <p className="fcw-body fcw-text-secondary" style={{ margin: 0 }}>
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="fcw-h2 fcw-weight-bold" style={{ color: "var(--fcw-color-primary)" }}>
                    {card.price || "Цена по запросу"}
                  </div>
                  {card.intentReasons && card.intentReasons.length > 0 && (
                    <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.375rem" }}>
                      {card.intentReasons.map((reason, i) => (
                        <span
                          key={i}
                          className="fcw-body-s"
                          style={{
                            padding: "0.125rem 0.5rem",
                            backgroundColor: "var(--fcw-color-surface-tertiary)",
                            borderRadius: "var(--fcw-radius-full)",
                            color: "var(--fcw-color-text-secondary)",
                          }}
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card padding="lg">
                <h2 className="fcw-h3" style={{ margin: "0 0 1rem 0" }}>Связаться</h2>
                <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                  <button className="fcw-btn fcw-btn-primary fcw-btn-full">
                    <MessageCircle size={18} />
                    Написать сообщение
                  </button>
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-full">
                    <Phone size={18} />
                    Показать телефон
                  </button>
                </div>
              </Card>
            </div>
          </div>

          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
            <Card padding="lg">
              <h2 className="fcw-h3" style={{ margin: "0 0 1rem 0" }}>О продавце</h2>
              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                {card.brandName && <BrandBadge name={card.brandName} verified={card.verified} size="md" />}
                <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>
                  Информация о продавце и его верификации.
                </p>
                {card.location && (
                  <div className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                    <MapPin size={12} />
                    {card.location}
                  </div>
                )}
              </div>
            </Card>

            {card.brandName && (
              <Card padding="lg" className="fcw-card-clickable" onClick={() => navigate(`/storefront/${card.id}`)}>
                <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
                  <Store size={20} style={{ color: "var(--fcw-color-primary)" }} />
                  <div>
                    <div className="fcw-body fcw-weight-medium">Витрина бренда</div>
                    <div className="fcw-body-s fcw-text-tertiary">Все товары {card.brandName}</div>
                  </div>
                </div>
              </Card>
            )}

            <Card padding="lg">
              <h2 className="fcw-h3" style={{ margin: "0 0 0.75rem 0" }}>Почему подходит</h2>
              <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                {(card.intentReasons && card.intentReasons.length > 0
                  ? card.intentReasons.slice(0, 3)
                  : ["Соответствует вашему запросу", "Проверенный продавец", "Локальный бизнес"]
                ).map((r, i) => (
                  <div key={i} className="fcw-body-s fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                    <ShieldCheck size={14} style={{ color: "var(--fcw-color-accent)", flexShrink: 0 }} />
                    {r}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
