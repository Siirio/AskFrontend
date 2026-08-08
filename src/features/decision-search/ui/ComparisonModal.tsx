import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { Modal } from "../../../shared/ui/Modal/Modal";
import { ComparisonGrid } from "./ComparisonGrid";
import { compareSearchResults } from "../../../shared/api/askClient";
import type { CompareResponseDto, DecisionContextDto, SearchV2CardDto } from "../../../shared/api/dto";

type Props = {
  open: boolean;
  onClose: () => void;
  shortlistIds: string[];
  mode: "ITEM" | "SERVICE";
  decisionContext?: DecisionContextDto | null;
  allCards: SearchV2CardDto[];
  onChat: (businessId: string) => void;
};

export function ComparisonModal({ open, onClose, shortlistIds, mode, decisionContext, allCards, onChat }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<CompareResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  useEffect(() => {
    if (!open || shortlistIds.length < 2) return;
    setLoading(true);
    compareSearchResults({
      mode,
      resultIds: shortlistIds,
      decisionContext: decisionContext ?? undefined,
    })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, shortlistIds, mode, decisionContext]);

  const handleRemove = (resultId: string) => {
    if (!data) return;
    setData({
      ...data,
      items: data.items.filter(i => i.resultId !== resultId),
      groups: data.groups.map(g => ({
        ...g,
        rows: g.rows.map(r => ({
          ...r,
          values: r.values.filter(v => v.resultId !== resultId),
        })),
      })),
    });
  };

  const cardForResult = (resultId: string) => allCards.find(c => c.resultId === resultId);

  return (
    <Modal open={open} onClose={onClose} title={t("comparison.title")} size="lg">
      <div className="comparison-modal">
        <div className="comparison-modal__toolbar">
          <p className="comparison-modal__subtitle">{t("comparison.subtitle")}</p>
          <label className="comparison-modal__toggle">
            <input
              type="checkbox"
              checked={onlyDifferences}
              onChange={e => setOnlyDifferences(e.target.checked)}
            />
            {t("comparison.onlyDifferences")}
          </label>
        </div>

        {loading && (
          <div className="comparison-modal__loading">
            <div className="comparison-modal__skeleton" />
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <ComparisonGrid
            items={data.items}
            groups={data.groups}
            onlyDifferences={onlyDifferences}
            onRemove={handleRemove}
          />
        )}

        {!loading && (!data || data.items.length === 0) && (
          <p className="comparison-modal__empty">{t("comparison.noData")}</p>
        )}

        <div className="comparison-modal__bottom-actions">
          {data?.items.slice(0, 3).map(item => {
            const card = cardForResult(item.resultId);
            return card ? (
              <button
                key={item.resultId}
                type="button"
                className="ask-primary-button"
                onClick={() => onChat(card.businessId)}
              >
                <MessageCircle size={16} />
                Написать {card.businessName}
              </button>
            ) : null;
          })}
          <button type="button" className="ask-secondary-button" onClick={onClose}>
            {t("modal.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
