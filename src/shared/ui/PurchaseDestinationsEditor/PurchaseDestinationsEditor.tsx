import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PurchaseDestinationDto } from "../../api/dto";

type Props = {
  value: PurchaseDestinationDto[];
  onChange: (value: PurchaseDestinationDto[]) => void;
};

export function PurchaseDestinationsEditor({ value, onChange }: Props) {
  const { t } = useTranslation();

  const update = (index: number, field: keyof PurchaseDestinationDto, fieldValue: string) => {
    onChange(value.map((destination, current) => current === index
      ? { ...destination, [field]: fieldValue }
      : destination));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="ask-form-stack">
      <span className="fcw-label">{t("business.purchaseDestinations.title")}</span>
      {value.map((destination, index) => (
        <div className="ask-form-grid" key={index}>
          <input
            className="fcw-input"
            maxLength={255}
            value={destination.label}
            onChange={event => update(index, "label", event.target.value)}
            placeholder={t("business.purchaseDestinations.label")}
          />
          <input
            className="fcw-input"
            type="url"
            maxLength={2048}
            value={destination.url}
            onChange={event => update(index, "url", event.target.value)}
            placeholder={t("business.purchaseDestinations.url")}
          />
          <div className="ask-inline-actions">
            <button type="button" className="ask-icon-button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t("business.purchaseDestinations.moveUp")}><ArrowUp size={16} /></button>
            <button type="button" className="ask-icon-button" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label={t("business.purchaseDestinations.moveDown")}><ArrowDown size={16} /></button>
            <button type="button" className="ask-icon-button" onClick={() => onChange(value.filter((_, current) => current !== index))} aria-label={t("business.purchaseDestinations.remove")}><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
      <button type="button" className="ask-secondary-button" onClick={() => onChange([...value, { label: "", url: "" }])}>
        <Plus size={16} />
        {t("business.purchaseDestinations.add")}
      </button>
    </div>
  );
}
