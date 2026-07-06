import { useTranslation } from "react-i18next";
import type { Confidence } from "../../entities/search-result/model";

export function ConfidenceBadge({ value }: { value: Confidence }) {
  const { t } = useTranslation();
  const labels: Record<Confidence, string> = {
    high: t("confidence.high"),
    medium: t("confidence.needsConfirmation"),
    low: t("confidence.low"),
  };
  return <span className={`confidence confidence-${value}`}>{labels[value]}</span>;
}
