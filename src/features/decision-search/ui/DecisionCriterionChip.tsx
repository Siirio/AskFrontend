import { X } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onRemove?: () => void;
};

export function DecisionCriterionChip({ label, value, onRemove }: Props) {
  return (
    <span className="decision-criterion-chip">
      <span className="decision-criterion-chip__label">{label}</span>
      <span className="decision-criterion-chip__value">{value}</span>
      {onRemove && (
        <button type="button" className="decision-criterion-chip__remove" onClick={onRemove} aria-label={`Удалить ${label}`}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}
