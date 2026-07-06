import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap: Record<string, number> = { sm: 16, md: 24, lg: 36 };

export function Loading({ size = "md", text }: LoadingProps) {
  return (
    <div className="fcw-flex-center fcw-flex-col fcw-gap-sm">
      <Loader2
        size={sizeMap[size]}
        className="fcw-animate-spin"
        style={{ color: "var(--fcw-color-primary)" }}
        aria-hidden="true"
      />
      {text && <span className="fcw-body-s fcw-text-secondary">{text}</span>}
    </div>
  );
}

export function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className="fcw-flex-center" style={{ minHeight: "60vh" }}>
      <Loading size="lg" text={t("loading.default")} />
    </div>
  );
}

export function Skeleton({ width, height = "1rem" }: { width?: string; height?: string }) {
  return (
    <div
      className="fcw-animate-shimmer"
      style={{
        width: width || "100%",
        height,
        borderRadius: "var(--fcw-radius-sm)",
        backgroundColor: "var(--fcw-color-surface-secondary)",
      }}
      aria-hidden="true"
    />
  );
}
