import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";

export function BusinessCardBuilder() {
  const { t } = useTranslation();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 400,
      gap: "1rem",
      padding: "2rem",
      color: "var(--fcw-color-text-tertiary)",
    }}>
      <Construction size={48} style={{ opacity: 0.3 }} />
      <span className="fcw-body-l fcw-weight-medium">{t("business.inDevelopment")}</span>
    </div>
  );
}
