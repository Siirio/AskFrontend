import { useTranslation } from "react-i18next";
import { X, ArrowRight, RefreshCw } from "lucide-react";
import type { SearchV2CardDto } from "../../../shared/api/dto";

type Props = {
  shortlistCards: SearchV2CardDto[];
  onRemove: (resultId: string) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
  onRecalculate: () => void;
  recalculating: boolean;
  onCompare: () => void;
  compareDisabled: boolean;
};

export function TradeoffPanel({
  shortlistCards,
  onRemove,
  customText,
  onCustomTextChange,
  onRecalculate,
  recalculating,
  onCompare,
  compareDisabled,
}: Props) {
  const { t } = useTranslation();

  return (
    <aside className="decision-tradeoff-panel">
      <section className="decision-tradeoff-panel__section">
        <h3>{t("decision.shortlist")}</h3>
        {shortlistCards.length === 0 && (
          <p className="decision-tradeoff-panel__empty">{t("decision.shortlistEmpty")}</p>
        )}
        <ul className="decision-tradeoff-panel__shortlist">
          {shortlistCards.map(card => (
            <li key={card.resultId} className="decision-tradeoff-panel__shortlist-item">
              <div className="decision-tradeoff-panel__shortlist-media">
                {card.images?.[0]?.url ? (
                  <img src={card.images[0].url} alt={card.title} loading="lazy" />
                ) : (
                  <span className="decision-tradeoff-panel__shortlist-placeholder" />
                )}
              </div>
              <div className="decision-tradeoff-panel__shortlist-body">
                <span className="decision-tradeoff-panel__shortlist-title">{card.title}</span>
                {card.price != null && (
                  <span className="decision-tradeoff-panel__shortlist-price">
                    {new Intl.NumberFormat("ru-KZ").format(card.price)} {card.currency === "KZT" || !card.currency ? "₸" : card.currency}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="decision-tradeoff-panel__shortlist-remove"
                onClick={() => onRemove(card.resultId)}
                aria-label={`Убрать ${card.title}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="decision-tradeoff-panel__section">
        <h3>{t("decision.addCondition")}</h3>
        <textarea
          className="decision-tradeoff-panel__custom-input"
          value={customText}
          onChange={e => onCustomTextChange(e.target.value)}
          placeholder={t("decision.addConditionPlaceholder")}
          rows={3}
          maxLength={500}
        />
        <button
          type="button"
          className="ask-primary-button decision-tradeoff-panel__recalculate"
          onClick={onRecalculate}
          disabled={recalculating || !customText.trim()}
        >
          <RefreshCw size={16} className={recalculating ? "fcw-spin" : ""} />
          {recalculating ? t("decision.recalculating") : t("decision.recalculate")}
        </button>
      </section>

      <button
        type="button"
        className="ask-primary-button decision-tradeoff-panel__compare"
        onClick={onCompare}
        disabled={compareDisabled}
      >
        <ArrowRight size={16} />
        {t("decision.compare")}
      </button>
    </aside>
  );
}
