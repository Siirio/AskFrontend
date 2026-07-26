import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { autocompleteCategories, createCategory, type CategorySuggestion, type CategoryType } from "../../api/askClient";

type Props = {
  value: string;
  categoryId: string | null;
  onChange: (categoryLabel: string, categoryId: string | null) => void;
  onInputChange?: (value: string) => void;
  type: CategoryType;
  allowFreeText?: boolean;
  placeholder?: string;
};

export function CategoryAutocomplete({ value, categoryId, onChange, onInputChange, type, allowFreeText = true, placeholder }: Props) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [standard, setStandard] = useState<CategorySuggestion[]>([]);
  const [custom, setCustom] = useState<CategorySuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = await autocompleteCategories(q.trim(), type);
      setStandard(result.suggestions.filter(item => item.source === "SYSTEM"));
      setCustom(result.suggestions.filter(item => item.source === "USER"));
    } catch {
      setStandard([]);
      setCustom([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onInputChange?.(v);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 200);
    if (!isOpen) setIsOpen(true);
  };

  const selectSuggestion = (suggestion: CategorySuggestion) => {
    setInputValue(suggestion.label);
    onChange(suggestion.label, suggestion.categoryId);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const commitFreeText = () => {
    if (!allowFreeText) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChange(trimmed, null);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const createCustom = async () => {
    const name = inputValue.trim();
    if (!allowFreeText || !name || loading) return;
    setLoading(true);
    try {
      const category = await createCategory(name, type);
      setInputValue(category.name);
      onChange(category.name, category.id);
      setIsOpen(false);
      setActiveIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const all = [...standard, ...custom];

    if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && all.length > 0 && activeIndex >= 0) {
        selectSuggestion(all[activeIndex]);
      } else if (allowFreeText) {
        void createCustom();
      }
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || all.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, all.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    }
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    if (allowFreeText && trimmed && trimmed !== value) {
      onChange(trimmed, null);
    }
    setIsOpen(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSuggestions = [...standard, ...custom];
  const canCreateCustom = allowFreeText
    && inputValue.trim().length > 0
    && !allSuggestions.some(item => item.label.toLocaleLowerCase() === inputValue.trim().toLocaleLowerCase());
  const showDropdown = isOpen && (allSuggestions.length > 0 || canCreateCustom);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="fcw-input"
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => { fetchSuggestions(inputValue); setIsOpen(true); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t("category.autocomplete.placeholder")}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {loading && (
        <div style={{ position: "absolute", right: 10, top: 10, fontSize: 12, color: "var(--fcw-muted)" }}>
          ...
        </div>
      )}
      {showDropdown && (
        <div
          className="category-autocomplete-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--fcw-color-surface)",
            border: "1px solid var(--fcw-color-border)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 240,
            overflowY: "auto",
            marginTop: 4,
          }}
        >
          {standard.length > 0 && (
            <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--fcw-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              {t("category.autocomplete.standardGroup")}
            </div>
          )}
          {standard.map((s, i) => (
            <button
              key={s.categoryId ?? `std-${i}`}
              className={activeIndex === i ? "category-autocomplete-item active" : "category-autocomplete-item"}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                background: activeIndex === i ? "var(--fcw-color-surface-secondary)" : "var(--fcw-color-surface)",
                border: "none", cursor: "pointer", fontSize: 14,
              }}
              onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {s.label}
            </button>
          ))}
          {custom.length > 0 && (
            <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--fcw-muted)", textTransform: "uppercase", fontWeight: 600, marginTop: standard.length > 0 ? 4 : 0 }}>
              {t("category.autocomplete.yourGroup")}
            </div>
          )}
          {custom.map((s, i) => {
            const idx = standard.length + i;
            return (
              <button
                key={`custom-${i}`}
                className={activeIndex === idx ? "category-autocomplete-item active" : "category-autocomplete-item"}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                  background: activeIndex === idx ? "var(--fcw-color-surface-secondary)" : "var(--fcw-color-surface)",
                  border: "none", cursor: "pointer", fontSize: 14,
                }}
                onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {s.label}
              </button>
            );
          })}
          {canCreateCustom && (
            <button
              type="button"
              className="category-autocomplete-item"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                background: "color-mix(in srgb, var(--fcw-color-primary) 8%, var(--fcw-color-surface))",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                color: "var(--fcw-color-primary)",
              }}
              onMouseDown={event => {
                event.preventDefault();
                void createCustom();
              }}
            >
              {t("category.autocomplete.createCustom", { value: inputValue.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
