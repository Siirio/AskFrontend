import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronDown, Loader2 } from "lucide-react";
import { listCities } from "../../api/askClient";
import { useMotion } from "../../../app/providers/MotionProvider";

interface CitySelectorProps {
  value: string;
  onChange: (city: string) => void;
  compact?: boolean;
  buttonClassName?: string;
}

export function CitySelector({ value, onChange, compact, buttonClassName }: CitySelectorProps) {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBusy(true);
    listCities()
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setBusy(false));
  }, [t]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback((name: string) => {
    onChange(name);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className={buttonClassName || "fcw-flex fcw-items-center fcw-glassmorph"}
        style={buttonClassName ? undefined : {
          gap: "0.375rem",
          padding: compact ? "0.375rem 0.625rem" : "0.75rem 1rem",
          borderRadius: compact ? "var(--fcw-radius-full)" : "var(--fcw-radius-xl)",
          fontSize: compact ? "var(--fcw-font-size-body-s)" : "var(--fcw-font-size-body)",
          color: "var(--fcw-color-text-secondary)",
          background: "color-mix(in srgb, var(--fcw-color-surface-secondary) 70%, transparent)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          border: "none",
          fontFamily: "inherit",
        }}
        onClick={() => setOpen(v => !v)}
      >
        {busy ? (
          <Loader2 size={compact ? 12 : 16} className="fcw-animate-spin" style={{ color: "var(--fcw-color-primary)" }} />
        ) : (
          <MapPin size={compact ? 12 : 16} style={{ color: "var(--fcw-color-primary)" }} />
        )}
        <span style={{ fontWeight: "var(--fcw-font-weight-medium)" }}>{value}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "inline-flex" }}
        >
          <ChevronDown size={compact ? 10 : 14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? {} : { opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 0.375rem)",
              right: 0,
              minWidth: "180px",
              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              borderRadius: "var(--fcw-radius-lg)",
              boxShadow: "var(--fcw-shadow-lg)",
              backdropFilter: "var(--fcw-blur-glass)",
              WebkitBackdropFilter: "var(--fcw-blur-glass)",
              backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 92%, transparent)",
              zIndex: 50,
              overflow: "hidden",
              padding: "0.25rem",
            }}
          >
            <div
              className="fcw-scrollbar-thin"
              style={{
                maxHeight: "132px",
                overflowY: "auto",
                paddingRight: "0.125rem",
                maskImage: cities.length > 3 ? "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)" : undefined,
                WebkitMaskImage: cities.length > 3 ? "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)" : undefined,
              }}
            >
              {cities.map(city => (
                <button
                  key={city.id}
                  type="button"
                  className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: "0.5rem",
                    borderRadius: "var(--fcw-radius-md)",
                    padding: "0.5rem 0.75rem",
                    color: city.name === value ? "var(--fcw-color-primary)" : "var(--fcw-color-text)",
                    fontWeight: city.name === value ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                    backgroundColor: city.name === value ? "color-mix(in srgb, var(--fcw-color-primary) 8%, transparent)" : "transparent",
                    border: "none",
                    fontFamily: "inherit",
                    fontSize: "var(--fcw-font-size-body-s)",
                  }}
                  onClick={() => select(city.name)}
                >
                  <MapPin size={12} style={{ color: city.name === value ? "var(--fcw-color-primary)" : "var(--fcw-color-text-tertiary)", flexShrink: 0 }} />
                  {city.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
