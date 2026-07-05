import { ShieldCheck } from "lucide-react";

interface BrandBadgeProps {
  name: string;
  color?: string;
  verified?: boolean;
  logoUrl?: string;
  size?: "sm" | "md";
}

export function BrandBadge({ name, color = "var(--fcw-color-primary)", verified, logoUrl, size = "md" }: BrandBadgeProps) {
  const isSm = size === "sm";
  return (
    <div
      className="fcw-flex fcw-items-center"
      style={{
        gap: isSm ? "0.375rem" : "0.5rem",
        padding: isSm ? "0.25rem 0.5rem" : "0.375rem 0.75rem",
        borderRadius: "var(--fcw-radius-full)",
        backgroundColor: "var(--fcw-color-surface-secondary)",
        border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{ width: isSm ? 16 : 20, height: isSm ? 16 : 20, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: isSm ? 16 : 20,
            height: isSm ? 16 : 20,
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
      )}
      <span
        className={isSm ? "fcw-body-s" : "fcw-body"}
        style={{ fontWeight: 600, color: "var(--fcw-color-text)", lineHeight: 1 }}
      >
        {name}
      </span>
      {verified && (
        <ShieldCheck size={isSm ? 12 : 14} style={{ color: "var(--fcw-color-accent)", flexShrink: 0 }} />
      )}
    </div>
  );
}
