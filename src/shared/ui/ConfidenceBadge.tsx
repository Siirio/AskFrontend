import type { Confidence } from "../../entities/search-result/model";

const labels: Record<Confidence, string> = {
  high: "Высокая уверенность",
  medium: "Нужно подтвердить",
  low: "Недостаточно данных",
};

export function ConfidenceBadge({ value }: { value: Confidence }) {
  return <span className={`confidence confidence-${value}`}>{labels[value]}</span>;
}
