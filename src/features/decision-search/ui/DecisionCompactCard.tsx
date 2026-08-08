import { useTranslation } from "react-i18next";
import { ThumbsDown, Plus, Check, Store } from "lucide-react";
import type { SearchV2CardDto } from "../../../shared/api/dto";

type Props = {
  card: SearchV2CardDto;
  inShortlist: boolean;
  onShortlist: () => void;
};

export function DecisionCompactCard({ card, inShortlist, onShortlist }: Props) {
  const { t } = useTranslation();
  const imageUrl = card.images?.[0]?.url;
  const primaryTradeoff = card.tradeoffs?.[0];

  return (
    <article className="decision-compact-card ask-surface">
      <div className="decision-compact-card__media">
        {imageUrl ? <img src={imageUrl} alt={card.title} loading="lazy" /> : <Store size={28} />}
      </div>
      <div className="decision-compact-card__body">
        <h3 className="decision-compact-card__title">{card.title}</h3>
        <div className="decision-compact-card__meta">
          {card.price != null && (
            <span className="decision-compact-card__price">
              {new Intl.NumberFormat("ru-KZ").format(card.price)} {card.currency === "KZT" || !card.currency ? "₸" : card.currency}
            </span>
          )}
          {card.businessName && <span className="decision-compact-card__business">{card.businessName}</span>}
        </div>
        {primaryTradeoff && (
          <p className="decision-compact-card__tradeoff">
            <ThumbsDown size={13} />
            {primaryTradeoff}
          </p>
        )}
      </div>
      <button
        type="button"
        className={`decision-shortlist-btn is-compact${inShortlist ? " is-active" : ""}`}
        onClick={onShortlist}
        aria-label={inShortlist ? t("decision.inShortlist") : t("decision.toShortlist")}
      >
        {inShortlist ? <Check size={15} /> : <Plus size={15} />}
      </button>
    </article>
  );
}
