import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useMotion } from "../../../app/providers/MotionProvider";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SelectProps<T = string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  align?: "left" | "right";
  className?: string;
  style?: React.CSSProperties;
  renderTrigger?: (selected: SelectOption<T> | undefined) => ReactNode;
}

export function Select<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  size = "md",
  align = "left",
  className = "",
  style,
  renderTrigger,
}: SelectProps<T>) {
  const { reduced } = useMotion();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const select = useCallback((val: T) => {
    onChange(val);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); setActiveIndex(0); return; }
      setActiveIndex(i => Math.min(i + 1, options.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); setActiveIndex(options.length - 1); return; }
      setActiveIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && open && activeIndex >= 0) {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) select(opt.value);
    }
    if (e.key === "Escape") { setOpen(false); }
  };

  const isSm = size === "sm";

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", display: "inline-block", ...style }}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="fcw-select-trigger"
        disabled={disabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: isSm ? "0.25rem 0.625rem" : "0.5rem 0.75rem",
          fontSize: isSm ? "var(--fcw-font-size-body-s)" : "var(--fcw-font-size-body)",
          borderRadius: "var(--fcw-radius-md)",
          color: selected ? "var(--fcw-color-text)" : "var(--fcw-color-text-tertiary)",
          backgroundColor: "var(--fcw-color-surface)",
          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontFamily: "inherit",
          minHeight: isSm ? 32 : 40,
          whiteSpace: "nowrap",
        }}
        onClick={() => !disabled && setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {renderTrigger
          ? renderTrigger(selected)
          : (
            <>
              {selected?.icon}
              <span style={{ flex: 1, textAlign: "left" }}>{selected?.label || placeholder}</span>
            </>
          )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "inline-flex", flexShrink: 0 }}
        >
          <ChevronDown size={isSm ? 12 : 14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? {} : { opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 0.375rem)",
              [align === "right" ? "right" : "left"]: 0,
              minWidth: "100%",
              zIndex: 50,
              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              borderRadius: "var(--fcw-radius-lg)",
              boxShadow: "var(--fcw-shadow-lg)",
              backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 96%, transparent)",
              backdropFilter: "var(--fcw-blur-glass)",
              WebkitBackdropFilter: "var(--fcw-blur-glass)",
              overflow: "hidden",
              padding: "0.25rem",
            }}
          >
            <div
              ref={listRef}
              role="listbox"
              className="fcw-scrollbar-thin"
              style={{ maxHeight: "240px", overflowY: "auto" }}
            >
              {options.map((opt, i) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  disabled={opt.disabled}
                  className="fcw-select-item"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    borderRadius: "var(--fcw-radius-md)",
                    padding: isSm ? "0.375rem 0.625rem" : "0.5rem 0.75rem",
                    fontSize: isSm ? "var(--fcw-font-size-body-s)" : "var(--fcw-font-size-body)",
                    color: opt.value === value
                      ? "var(--fcw-color-primary)"
                      : opt.disabled ? "var(--fcw-color-text-tertiary)" : "var(--fcw-color-text)",
                    fontWeight: opt.value === value
                      ? "var(--fcw-font-weight-semibold)"
                      : "var(--fcw-font-weight-regular)",
                    backgroundColor: i === activeIndex
                      ? "var(--fcw-color-surface-secondary)"
                      : opt.value === value
                        ? "color-mix(in srgb, var(--fcw-color-primary) 8%, transparent)"
                        : "transparent",
                    border: "none",
                    fontFamily: "inherit",
                    textAlign: "left",
                    cursor: opt.disabled ? "not-allowed" : "pointer",
                    opacity: opt.disabled ? 0.5 : 1,
                    transition: "background-color 0.1s ease",
                  }}
                  onClick={() => !opt.disabled && select(opt.value)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {opt.icon && (
                    <span style={{ flexShrink: 0, color: opt.value === value ? "var(--fcw-color-primary)" : "var(--fcw-color-text-tertiary)" }}>
                      {opt.icon}
                    </span>
                  )}
                  {opt.label}
                </button>
              ))}
              {options.length === 0 && (
                <div style={{ padding: "0.75rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)", fontSize: "var(--fcw-font-size-body-s)" }}>
                  No options
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
