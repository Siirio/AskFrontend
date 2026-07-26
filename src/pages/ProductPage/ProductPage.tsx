import { useState } from "react";
import { ArrowLeft, Clock3, MapPin, MessageCircle, Store } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { buildRoute, ROUTES } from "../../app/routes";
import { useAuth } from "../../app/providers/AuthProvider";
import { startChatConversation } from "../../shared/api/askClient";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import type { ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { ReportDialog } from "../../widgets/ReportDialog/ReportDialog";

export function ProductPage() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAuth();
  const card = (location.state as { card?: ResultCardData } | null)?.card;
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  if (!card) {
    return (
      <main id="main-content" className="ask-product-page">
        <EmptyState
          title="Карточка недоступна"
          description="Вернитесь к результатам и откройте предложение заново."
          action={(
            <button type="button" className="ask-primary-button" onClick={() => navigate(ROUTES.results)}>
              <ArrowLeft size={17} />
              К результатам
            </button>
          )}
        />
      </main>
    );
  }

  const openChat = async () => {
    if (!card.businessId) return;
    if (!state.authenticated) {
      navigate(ROUTES.auth, { state: { from: location.pathname } });
      return;
    }
    setChatBusy(true);
    setChatError("");
    try {
      const conversation = await startChatConversation(card.businessId, card.title);
      navigate(`${ROUTES.chats}?conversation=${encodeURIComponent(conversation.conversationId)}`);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Не удалось открыть чат");
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <main id="main-content" className="ask-product-page">
      <button type="button" className="ask-back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={17} />
        Назад к поиску
      </button>

      <div className="ask-product-layout">
        <section className="ask-product-card">
          <div
            className="ask-product-card__media"
            style={{
              backgroundColor: card.brandColor || undefined,
              backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : undefined,
            }}
          >
            {!card.imageUrl && <Store size={54} />}
          </div>

          <div className="ask-product-card__content">
            <div className="ask-product-card__eyebrow">{card.category || (card.resultType === "ITEM" ? "Товар" : "Услуга")}</div>
            <h1>{card.title}</h1>
            {card.summary && <p>{card.summary}</p>}
            {card.price && <strong>{card.price}</strong>}

            {card.matchReasons.length > 0 && (
              <div className="ask-product-card__chips">
                {card.matchReasons.map(reason => <span key={reason}>{reason}</span>)}
              </div>
            )}
          </div>
        </section>

        <aside className="ask-product-aside">
          <div className="ask-product-aside__identity">
            <span style={{ backgroundColor: card.brandColor || undefined }}>
              {card.businessProfile?.logoUrl
                ? <img src={card.businessProfile.logoUrl} alt="" />
                : <Store size={24} />}
            </span>
            <div>
              <h2>{card.brandName || card.title}</h2>
              {card.availability && <p>{card.availability}</p>}
            </div>
          </div>

          <div className="ask-product-aside__meta">
            {card.openingLabel && <span><Clock3 size={16} />{card.openingLabel}</span>}
            {(card.location || card.city) && <span><MapPin size={16} />{[card.location, card.city].filter(Boolean).join(", ")}</span>}
          </div>

          <button type="button" className="ask-primary-button" onClick={openChat} disabled={chatBusy || !card.businessId}>
            <MessageCircle size={18} />
            {chatBusy ? "Открываем чат..." : "Написать"}
          </button>
          {card.businessId && (
            <button
              type="button"
              className="ask-secondary-button"
              onClick={() => navigate(buildRoute(ROUTES.storefront, { businessId: card.businessId! }))}
            >
              Открыть профиль
            </button>
          )}
          {chatError && <p className="ask-form-error">{chatError}</p>}
          {card.resultType === "ITEM" && (
            <button type="button" className="ask-report-link" onClick={() => setReportOpen(true)}>
              Пожаловаться
            </button>
          )}
        </aside>
      </div>

      <ReportDialog
        targetType="PRODUCT"
        targetId={id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </main>
  );
}
