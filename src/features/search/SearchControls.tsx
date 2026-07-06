import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal } from "lucide-react";

type Props = {
  query: string;
  city: string;
  scope: "all" | "product" | "service";
  onQueryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onScopeChange: (value: "all" | "product" | "service") => void;
  onSubmit: () => void;
};

export function SearchControls({ query, city, scope, onQueryChange, onCityChange, onScopeChange, onSubmit }: Props) {
  const { t } = useTranslation();

  const scopeOptions: Array<[string, string]> = [
    ["all", t("searchControls.all")],
    ["product", t("searchControls.products")],
    ["service", t("searchControls.services")],
  ];

  return (
    <section className="search-shell" aria-label={t("searchControls.brand")}>
      <div className="search-topline">
        <div>
          <p className="eyebrow">Smart Search</p>
          <h1>{t("searchControls.placeholder")}</h1>
        </div>
        <label className="city-select">
          <span>{t("citySelector.placeholder")}</span>
          <input value={city} onChange={(event) => onCityChange(event.target.value)} />
        </label>
      </div>

      <div className="search-input-row">
        <Search size={22} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder={t("searchBar.placeholder")}
        />
        <button className="primary-button" onClick={onSubmit}>
          {t("searchControls.find")}
        </button>
      </div>

      <div className="segmented" aria-label={t("searchControls.brand")}>
        {scopeOptions.map(([value, label]) => (
          <button key={value} className={scope === value ? "active" : ""} onClick={() => onScopeChange(value as "all" | "product" | "service")}>
            {label}
          </button>
        ))}
        <span className="filter-note">
          <SlidersHorizontal size={16} aria-hidden="true" />
          {t("searchControls.categoryHint")}
        </span>
      </div>
    </section>
  );
}
