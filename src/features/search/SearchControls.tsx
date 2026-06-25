import { Search, SlidersHorizontal } from "lucide-react";
import { appCopy } from "../../shared/config/copy";

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
  return (
    <section className="search-shell" aria-label="Поиск Ask">
      <div className="search-topline">
        <div>
          <p className="eyebrow">Smart Search</p>
          <h1>Найдите товар, услугу или поставщика</h1>
        </div>
        <label className="city-select">
          <span>{appCopy.cityPlaceholder}</span>
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
          placeholder={appCopy.searchPlaceholder}
        />
        <button className="primary-button" onClick={onSubmit}>
          Найти
        </button>
      </div>

      <div className="segmented" aria-label="Тип поиска">
        {[
          ["all", "Все"],
          ["product", "Товары"],
          ["service", "Услуги"],
        ].map(([value, label]) => (
          <button key={value} className={scope === value ? "active" : ""} onClick={() => onScopeChange(value as "all" | "product" | "service")}>
            {label}
          </button>
        ))}
        <span className="filter-note">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Категория как фильтр, не вместо запроса
        </span>
      </div>
    </section>
  );
}
