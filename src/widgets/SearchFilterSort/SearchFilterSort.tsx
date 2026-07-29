import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BadgePercent,
  Banknote,
  Building2,
  Check,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SearchLocalFilters } from "../../shared/api/askClient";
import { CitySelector } from "../../shared/ui/CitySelector/CitySelector";
import { SearchAreaPicker } from "./SearchAreaPicker";

export type SearchSortKey = "relevance" | "distance" | "price_asc" | "price_desc" | "unique_offers";
type LocationMode = "none" | "radius" | "city" | "map";

export type SearchCompanyOption = {
  businessId: string;
  businessName: string;
  resultCount: number;
};

type SearchFilterSortProps = {
  open: boolean;
  sort: SearchSortKey;
  filters: SearchLocalFilters;
  companies: SearchCompanyOption[];
  locationError: string;
  onClose: () => void;
  onSortChange: (sort: SearchSortKey) => void;
  onFiltersChange: (filters: SearchLocalFilters) => void;
  onApply: () => void;
  onReset: () => void;
};

function locationMode(filters: SearchLocalFilters): LocationMode {
  if (filters.mapBounds) return "map";
  if (filters.radiusMeters) return "radius";
  if (filters.city) return "city";
  return "none";
}

export function SearchFilterSort({
  open,
  sort,
  filters,
  companies,
  locationError,
  onClose,
  onSortChange,
  onFiltersChange,
  onApply,
  onReset,
}: SearchFilterSortProps) {
  const { t } = useTranslation();
  const [companyQuery, setCompanyQuery] = useState("");
  const [activeLocationMode, setActiveLocationMode] = useState<LocationMode>(() => locationMode(filters));

  useEffect(() => {
    setActiveLocationMode(locationMode(filters));
  }, [filters.city, filters.mapBounds, filters.radiusMeters]);

  const visibleCompanies = useMemo(() => {
    const query = companyQuery.trim().toLocaleLowerCase();
    if (!query) return companies;
    return companies.filter(company => company.businessName?.toLocaleLowerCase().includes(query));
  }, [companies, companyQuery]);

  const selectLocationMode = (mode: LocationMode) => {
    setActiveLocationMode(mode);
    onFiltersChange({
      ...filters,
      city: mode === "city" ? filters.city : undefined,
      radiusMeters: mode === "radius" ? filters.radiusMeters ?? 100000 : undefined,
      mapBounds: mode === "map" ? filters.mapBounds : undefined,
    });
  };

  const toggleCompany = (businessId: string) => {
    const selected = new Set(filters.businessIds ?? []);
    if (selected.has(businessId)) selected.delete(businessId);
    else selected.add(businessId);
    onFiltersChange({ ...filters, businessIds: selected.size ? [...selected] : undefined });
  };

  const costLabel = sort === "price_desc"
    ? t("results.sort.costHigh")
    : t("results.sort.costLow");

  const sortOptions = [
    { key: "relevance" as const, icon: Sparkles, label: t("results.sort.relevance"), detail: t("results.sort.relevanceHint") },
    { key: "distance" as const, icon: Navigation, label: t("results.sort.distance"), detail: t("results.sort.distanceHint") },
    { key: "cost" as const, icon: Banknote, label: t("results.sort.cost"), detail: costLabel },
    { key: "unique_offers" as const, icon: BadgePercent, label: t("results.sort.uniqueOffers"), detail: t("results.sort.uniqueOffersHint") },
  ];

  return (
    <aside className={`ask-results-filters ask-surface search-filter-sort${open ? " is-open" : ""}`}>
      <header className="search-filter-sort__header">
        <div>
          <SlidersHorizontal size={18} />
          <div>
            <h2>{t("results.filters.title")}</h2>
            <p>{t("results.filters.subtitle")}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={t("results.filters.close")}><X size={18} /></button>
      </header>

      <section className="search-filter-sort__section">
        <h3><ArrowDownUp size={16} />{t("results.sort.title")}</h3>
        <div className="search-sort-options">
          {sortOptions.map(option => {
            const active = option.key === "cost"
              ? sort === "price_asc" || sort === "price_desc"
              : sort === option.key;
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => onSortChange(
                  option.key === "cost"
                    ? sort === "price_asc" ? "price_desc" : "price_asc"
                    : option.key,
                )}
              >
                <Icon size={17} />
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                {active && <Check size={16} />}
              </button>
            );
          })}
        </div>
        {locationError && <p className="search-filter-sort__error">{locationError}</p>}
      </section>

      <section className="search-filter-sort__section">
        <h3><Banknote size={16} />{t("results.filters.price")}</h3>
        <div className="search-price-range">
          <label>
            <span>{t("results.filters.priceFrom")}</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.minPrice ?? ""}
              onChange={event => onFiltersChange({
                ...filters,
                minPrice: event.target.value ? Number(event.target.value) : undefined,
              })}
              placeholder="0"
            />
          </label>
          <span>—</span>
          <label>
            <span>{t("results.filters.priceTo")}</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.maxPrice ?? ""}
              onChange={event => onFiltersChange({
                ...filters,
                maxPrice: event.target.value ? Number(event.target.value) : undefined,
              })}
              placeholder="∞"
            />
          </label>
        </div>
      </section>

      <section className="search-filter-sort__section">
        <h3><Building2 size={16} />{t("results.filters.companies")}</h3>
        <label className="search-company-search">
          <Search size={15} />
          <input
            value={companyQuery}
            onChange={event => setCompanyQuery(event.target.value)}
            placeholder={t("results.filters.companySearch")}
          />
        </label>
        <div className="search-company-options">
          {visibleCompanies.length === 0 && <p>{t("results.filters.noCompanies")}</p>}
          {visibleCompanies.map(company => {
            const checked = filters.businessIds?.includes(company.businessId) ?? false;
            return (
              <label key={company.businessId}>
                <input type="checkbox" checked={checked} onChange={() => toggleCompany(company.businessId)} />
                <span><strong>{company.businessName}</strong><small>{company.resultCount}</small></span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="search-filter-sort__section">
        <h3><MapPin size={16} />{t("results.filters.location")}</h3>
        <div className="search-location-modes">
          <button type="button" className={activeLocationMode === "radius" ? "is-active" : ""} onClick={() => selectLocationMode("radius")}>
            <LocateFixed size={16} />{t("results.filters.withinRadius")}
          </button>
          <button type="button" className={activeLocationMode === "city" ? "is-active" : ""} onClick={() => selectLocationMode("city")}>
            <MapPin size={16} />{t("results.filters.byCity")}
          </button>
          <button type="button" className={activeLocationMode === "map" ? "is-active" : ""} onClick={() => selectLocationMode("map")}>
            <Map size={16} />{t("results.filters.mapArea")}
          </button>
        </div>

        {activeLocationMode === "radius" && (
          <div className="search-radius-control">
            <div><span>{t("results.filters.radius")}</span><strong>{Math.round((filters.radiusMeters ?? 100000) / 1000)} {t("results.filters.km")}</strong></div>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={filters.radiusMeters ?? 100000}
              onChange={event => onFiltersChange({ ...filters, radiusMeters: Number(event.target.value) })}
            />
          </div>
        )}

        {activeLocationMode === "city" && (
          <CitySelector
            value={filters.city || t("results.filters.selectCity")}
            onChange={city => onFiltersChange({ ...filters, city })}
            buttonClassName="search-city-trigger"
          />
        )}

        {activeLocationMode === "map" && (
          <div className="search-map-area">
            <SearchAreaPicker
              value={filters.mapBounds}
              onChange={mapBounds => onFiltersChange({ ...filters, mapBounds })}
            />
            <p>{t("results.filters.mapHint")}</p>
          </div>
        )}
      </section>

      <footer className="search-filter-sort__actions">
        <button type="button" className="search-filter-reset" onClick={onReset}><RotateCcw size={16} />{t("results.filters.reset")}</button>
        <button type="button" className="ask-primary-button" onClick={onApply}>{t("results.filters.apply")}</button>
      </footer>
    </aside>
  );
}
