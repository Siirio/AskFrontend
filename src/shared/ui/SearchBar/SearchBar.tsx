import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotion } from "../../../app/providers/MotionProvider";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
  busy?: boolean;
  compact?: boolean;
}

export function SearchBar({ onSearch, initialQuery = "", placeholder, busy, compact }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const { reduced } = useMotion();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !busy) onSearch(query.trim());
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && query.trim() && !busy) {
      e.preventDefault();
      onSearch(query.trim());
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="fcw-relative fcw-w-full"
      animate={{
        scale: focused && !compact ? 1.01 : 1,
      }}
      transition={{ duration: reduced ? 0.01 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="fcw-relative fcw-flex fcw-items-center"
        style={{
          backgroundColor: "var(--fcw-color-surface-secondary)",
          border: `var(--fcw-border-width-thin) solid ${focused ? "var(--fcw-color-primary)" : "var(--fcw-color-border)"}`,
          borderRadius: "var(--fcw-radius-xl)",
          transition: "border-color var(--fcw-duration-fast) var(--fcw-ease-out)",
          padding: compact ? "0.5rem 0.75rem" : "0.75rem 1.25rem",
        }}
      >
        <Search
          size={compact ? 18 : 22}
          style={{ color: focused ? "var(--fcw-color-primary)" : "var(--fcw-color-text-tertiary)", transition: "color 0.2s ease", flexShrink: 0 }}
        />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("searchBar.placeholder")}
          className="fcw-flex-1"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--fcw-color-text)",
            fontSize: compact ? "var(--fcw-font-size-body)" : "var(--fcw-font-size-body-l)",
            fontFamily: "var(--fcw-font-body)",
            padding: "0 0.75rem",
            minWidth: 0,
          }}
          disabled={busy}
        />
        <AnimatePresence>
          {query.trim() && (
            <motion.button
              type="submit"
              className="fcw-btn fcw-btn-primary fcw-btn-sm"
              initial={{ opacity: 0, scale: 0.8, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              exit={{ opacity: 0, scale: 0.8, width: 0 }}
              disabled={busy}
              style={{ flexShrink: 0, gap: "0.375rem" }}
            >
              <Sparkles size={14} />
              {!compact && t("searchBar.button")}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.form>
  );
}
