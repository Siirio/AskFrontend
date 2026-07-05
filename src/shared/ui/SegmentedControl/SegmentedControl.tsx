import { type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotion } from "../../../app/providers/MotionProvider";

export type SegmentedOption<T extends string> = {
  key: T;
  label: string;
  icon?: ReactNode;
  title?: string;
};

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  ariaLabel: string;
  size?: "sm" | "md";
  iconOnly?: boolean;
  vertical?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  ariaLabel,
  size = "sm",
  iconOnly = false,
  vertical = false,
  className = "",
  style,
}: Props<T>) {
  const { reduced } = useMotion();

  return (
    <div
      className={`fcw-glassmorph-segmented ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        flexDirection: vertical ? "column" : "row",
        gap: 0,
        overflow: "visible",
        ...style,
      }}
    >
      {options.map(option => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={iconOnly ? option.label : undefined}
            title={option.title ?? option.label}
            className={`fcw-btn ${size === "sm" ? "fcw-btn-sm" : ""}`.trim()}
            onClick={() => onChange(option.key)}
            style={{
              position: "relative",
              background: "transparent",
              color: active ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
              fontWeight: active ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
              border: "none",
              boxShadow: "none",
              gap: "0.375rem",
              minWidth: iconOnly ? 40 : undefined,
              minHeight: iconOnly ? 40 : undefined,
              padding: iconOnly ? "0.5rem" : undefined,
              whiteSpace: "nowrap",
              transition: "color 240ms var(--fcw-ease-out), font-weight 240ms var(--fcw-ease-out)",
              zIndex: 1,
            }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="fcw-moving-selection-indicator"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  zIndex: 0,
                }}
                transition={
                  reduced
                    ? { duration: 0.01 }
                    : { type: "spring", stiffness: 360, damping: 32, mass: 0.9 }
                }
              />
            )}
            {option.icon && <span style={{ position: "relative", zIndex: 1, display: "inline-flex" }}>{option.icon}</span>}
            {!iconOnly && <span style={{ position: "relative", zIndex: 1 }}>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
