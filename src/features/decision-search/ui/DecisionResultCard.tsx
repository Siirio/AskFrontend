import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Store,
  Plus,
  Check,
  ExternalLink,
} from "lucide-react";
import type { SearchV2CardDto } from "../../../shared/api/dto";

type Props = {
  card: SearchV2CardDto;
  recommended?: boolean;
  inShortlist: boolean;
  onShortlist: () => void;
  onChat: () => void;
  onBusiness: () => void;
};

function statusIcon(status: string) {
  switch (status) {
    case "PASS": return <CheckCircle size={14} className="decision-status-icon is-pass" />;
    case "FAIL": return <AlertTriangle size={14} className="decision-status-icon is-fail" />;
    case "PARTIAL": return <MinusCircle size={14} className="decision-status-icon is-partial" />;
    default: return <HelpCircle size={14} className="decision-status-icon is-unknown" />;
  }
}

export function DecisionResultCard({ card, recommended, inShortlist, onShortlist, onChat, onBusiness }: Props) {
  const { t } = useTranslation();
  const imageUrl = card.images?.[0]?.url;
  const brandLogo = card.brandLogoUrl ?? card.businessProfile?.logoUrl;

  return (
    <article className="decision-result-card ask-surface">
      {(recommended || card.decisionLabel) && (
        <span className="decision-result-card__badge">{t("decision.bestVariant")}</span>
      )}

      <div className="decision-result-card__layout">
        <div className="decision-result-card__media">
          {imageUrl ? (
            <img src={imageUrl} alt={card.title} loading="lazy" />
          ) : (
            <Store size={48} />
          )}
        </div>

        <div className="decision-result-card__body">
          <div className="decision-result-card__brand">
            {brandLogo && <img src={brandLogo} alt="" className="decision-result-card__brand-logo" />}
            {card.businessName && (
              <button type="button" className="decision-result-card__brand-name" onClick={onBusiness}>
                {card.businessName}
              </button>
            )}
          </div>

          <h2 className="decision-result-card__title">{card.title}</h2>

          {card.price != null && (
            <strong className="decision-result-card__price">
              {new Intl.NumberFormat("ru-KZ").format(card.price)} {card.currency === "KZT" || !card.currency ? "₸" : card.currency}
            </strong>
          )}

          {card.criterionAssessments && card.criterionAssessments.length > 0 && (
            <ul className="decision-result-card__criteria">
              {card.criterionAssessments.map(a => (
                <li key={a.criterionKey} className="decision-result-card__criterion">
                  {statusIcon(a.status)}
                  <span className="decision-result-card__criterion-label">{a.label}</span>
                  {a.displayValue && <span className="decision-result-card__criterion-value">{a.displayValue}</span>}
                  {a.consequence && <span className="decision-result-card__criterion-consequence">{a.consequence}</span>}
                </li>
              ))}
            </ul>
          )}

          {card.advantages && card.advantages.length > 0 && (
            <ul className="decision-result-card__advantages">
              {card.advantages.map((text, i) => (
                <li key={`adv-${i}`}><ThumbsUp size={14} />{text}</li>
              ))}
            </ul>
          )}

          {card.tradeoffs && card.tradeoffs.length > 0 && (
            <ul className="decision-result-card__tradeoffs">
              {card.tradeoffs.map((text, i) => (
                <li key={`trd-${i}`}><ThumbsDown size={14} />{text}</li>
              ))}
            </ul>
          )}

          {card.unknowns && card.unknowns.length > 0 && (
            <ul className="decision-result-card__unknowns">
              {card.unknowns.map((text, i) => (
                <li key={`unk-${i}`}><HelpCircle size={14} />{text}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="decision-result-card__actions">
        <button
          type="button"
          className={`decision-shortlist-btn${inShortlist ? " is-active" : ""}`}
          onClick={onShortlist}
        >
          {inShortlist ? <Check size={16} /> : <Plus size={16} />}
          {inShortlist ? t("decision.inShortlist") : t("decision.toShortlist")}
        </button>
        {card.purchaseDestinations?.map((d, i) => (
          <a key={`${d.label}-${i}`} className="ask-secondary-button" href={d.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            {d.label}
          </a>
        ))}
        <button type="button" className="ask-primary-button" onClick={onChat}>
          <MessageCircle size={16} />
          Написать
        </button>
      </footer>
    </article>
  );
}
