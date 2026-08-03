import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  ExternalLink,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildRoute, ROUTES } from "../../app/routes";
import {
  searchAskV2,
  type SearchFilters,
} from "../../shared/api/askClient";
import type { SearchV2CardDto } from "../../shared/api/dto";
import { ResultCard, type ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { useChat } from "../../widgets/ChatPanel/ChatContext";
import {
  ACTIVE_SEARCH_ROUTE_CHANGED_EVENT,
  clearActiveSearchRoute,
  saveActiveSearchRoute,
} from "../../entities/search-session/model/activeSearchSession";
import {
  SearchFilterSort,
  type SearchCompanyOption,
  type SearchSortKey,
} from "../../widgets/SearchFilterSort/SearchFilterSort";

type SearchMode = "ITEM" | "SERVICE";

const PAGE_SIZE = 20;

function hasStoredUserLocation() {
  try {
    const raw = window.localStorage.getItem("ask.geo");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    return typeof parsed.lat === "number" && typeof parsed.lng === "number";
  } catch {
    return false;
  }
}

function requestUserLocation() {
  return new Promise<boolean>(resolve => {
    if (hasStoredUserLocation()) {
      resolve(true);
      return;
    }
    if (!navigator.geolocation) {
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        window.localStorage.setItem("ask.geo", JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }));
        resolve(true);
      },
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  });
}

function toMoney(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined) return undefined;
  const suffix = currency === "KZT" || !currency ? "₸" : currency;
  return `${new Intl.NumberFormat("ru-KZ").format(value)} ${suffix}`;
}

type SearchResultCard = ResultCardData & {
  images: NonNullable<ResultCardData["images"]>;
  priceValue?: number;
  distanceMeters?: number;
  latitude?: number;
  longitude?: number;
  hasActiveOffer: boolean;
};

function mapCard(card: SearchV2CardDto): SearchResultCard {
  return {
    id: card.resultId,
    resultType: card.resultType,
    title: card.title,
    summary: card.summary ?? undefined,
    category: card.categoryLabel ?? undefined,
    price: toMoney(card.price, card.currency),
    location: card.branchAddress ?? card.branchName ?? undefined,
    city: card.branchCity ?? undefined,
    distance: card.distanceMeters ? `${(card.distanceMeters / 1000).toFixed(1)} км` : undefined,
    imageUrl: card.images?.[0]?.url,
    images: card.images ?? [],
    purchaseDestinations: card.purchaseDestinations ?? [],
    brandLogoUrl: card.brandLogoUrl ?? card.businessProfile?.logoUrl ?? undefined,
    brandName: card.businessName,
    brandColor: card.brandColor ?? undefined,
    businessId: card.businessId,
    availability: card.availability ?? undefined,
    availabilityWarning: card.availabilityWarning ?? undefined,
    businessProfile: card.businessProfile,
    priceValue: card.price ?? undefined,
    distanceMeters: card.distanceMeters ?? undefined,
    latitude: card.latitude ?? undefined,
    longitude: card.longitude ?? undefined,
    hasActiveOffer: card.hasActiveOffer ?? false,
  };
}

export function ResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { openChat } = useChat();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";
  const initialMode: SearchMode = searchParams.get("mode") === "SERVICE" ? "SERVICE" : "ITEM";
  const initialCity = searchParams.get("city") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [mode] = useState<SearchMode>(initialMode);
  const [sort, setSort] = useState<SearchSortKey>("relevance");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    city: initialCity || undefined,
  });
  const [draftFilters, setDraftFilters] = useState<SearchFilters>({
    city: initialCity || undefined,
  });
  const [sourceCards, setSourceCards] = useState<SearchResultCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const companies = useMemo<SearchCompanyOption[]>(() => {
    const values = new Map<string, SearchCompanyOption>();
    sourceCards.forEach(card => {
      if (!card.businessId) return;
      const existing = values.get(card.businessId);
      if (existing) {
        existing.resultCount += 1;
        return;
      }
      values.set(card.businessId, {
        businessId: card.businessId,
        businessName: card.brandName || card.title,
        resultCount: 1,
      });
    });
    return [...values.values()];
  }, [sourceCards]);

  const cards = sourceCards;

  const selected = cards.find(card => card.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedId]);

  useEffect(() => {
    saveActiveSearchRoute(`${location.pathname}${location.search}`, window.sessionStorage);
    window.dispatchEvent(new Event(ACTIVE_SEARCH_ROUTE_CHANGED_EVENT));
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!initialQuery.trim()) return;
    let active = true;
    setBusy(true);
    setError("");
    searchAskV2({
      rawQuery: initialQuery,
      mode,
      sort,
      page,
      pageSize: PAGE_SIZE,
      explicitFilters: {
        city: filters.city,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        radiusMeters: filters.radiusMeters,
        businessIds: filters.businessIds,
        mapArea: filters.mapBounds,
      },
    })
      .then(response => {
        if (!active) return;
        const nextCards = response.sections.flatMap(section => section.cards.map(mapCard));
        setSourceCards(current => {
          if (page === 0) return nextCards;
          const known = new Set(current.map(card => card.id));
          return [...current, ...nextCards.filter(card => !known.has(card.id))];
        });
        setHasNext(response.hasNext);
        if (page === 0) {
          setSelectedId(current => nextCards.some(card => card.id === current) ? current : null);
        }
      })
      .catch(reason => {
        if (!active) return;
        if (page === 0) setSourceCards([]);
        setError(reason instanceof Error ? reason.message : t("results.error.title"));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [filters, initialQuery, mode, page, sort, t]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNext) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !busy) setPage(current => current + 1);
    }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [busy, hasNext]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
    if (filters.businessIds?.length) count += filters.businessIds.length;
    if (filters.city || filters.radiusMeters || filters.mapBounds) count += 1;
    return count;
  }, [filters]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const rawQuery = query.trim();
    if (!rawQuery) return;
    setPage(0);
    const route = buildRoute(ROUTES.results, {}, {
      query: rawQuery,
      mode,
      city: filters.city ?? "",
    });
    saveActiveSearchRoute(route, window.sessionStorage);
    navigate(route);
  };

  const startNewSearch = () => {
    clearActiveSearchRoute(window.sessionStorage);
    window.dispatchEvent(new Event(ACTIVE_SEARCH_ROUTE_CHANGED_EVENT));
  };

  const applyFilters = async () => {
    if (draftFilters.minPrice !== undefined && draftFilters.maxPrice !== undefined
        && draftFilters.minPrice > draftFilters.maxPrice) {
      setLocationError(t("results.filters.priceError"));
      return;
    }
    if (draftFilters.radiusMeters && !await requestUserLocation()) {
      setLocationError(t("results.filters.locationRequired"));
      return;
    }
    setLocationError("");
    setPage(0);
    setFilters(draftFilters);
    setFiltersOpen(false);
  };

  const changeSort = async (nextSort: SearchSortKey) => {
    if (nextSort === "distance" && !await requestUserLocation()) {
      setLocationError(t("results.filters.locationRequired"));
      setFiltersOpen(true);
      return;
    }
    setLocationError("");
    setPage(0);
    setSort(nextSort);
  };

  const resetFilters = () => {
    const reset = {} satisfies SearchFilters;
    setDraftFilters(reset);
    setFilters(reset);
    setLocationError("");
    setPage(0);
  };

  const removeFilter = (key: "price" | "location" | string) => {
    if (key === "price") {
      const next = { ...filters, minPrice: undefined, maxPrice: undefined };
      setFilters(next);
      setDraftFilters(next);
    } else if (key === "location") {
      const next = { ...filters, city: undefined, radiusMeters: undefined, mapBounds: undefined };
      setFilters(next);
      setDraftFilters(next);
    } else {
      const businessIds = filters.businessIds?.filter(id => id !== key);
      const next = { ...filters, businessIds: businessIds?.length ? businessIds : undefined };
      setFilters(next);
      setDraftFilters(next);
    }
    setPage(0);
  };

  return (
    <main id="main-content" className="ask-results-page">
      <form className="ask-results-search" onSubmit={submitSearch}>
        <button type="button" className="ask-icon-button" onClick={() => navigate(ROUTES.home)} aria-label={t("results.back")}>
          <ArrowLeft size={20} />
        </button>
        <label>
          <Search size={22} />
          <input
            value={query}
            onFocus={startNewSearch}
            onChange={event => setQuery(event.target.value)}
            aria-label={t("home.search.ariaLabel")}
          />
          <button type="button" onClick={() => setFiltersOpen(value => !value)} aria-label="Фильтры">
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </label>
        <button type="submit" className="ask-primary-button">{t("searchBar.button")}</button>
      </form>

      <div className={`ask-results-layout${filtersOpen ? " filters-open" : ""}`}>
        <SearchFilterSort
          open={filtersOpen}
          sort={sort}
          filters={draftFilters}
          companies={companies}
          locationError={locationError}
          onClose={() => setFiltersOpen(false)}
          onSortChange={nextSort => void changeSort(nextSort)}
          onFiltersChange={setDraftFilters}
          onApply={() => void applyFilters()}
          onReset={resetFilters}
        />

        <section className="ask-results-list ask-surface">
          <header className="ask-results-list__header">
            <strong>{t("results.found", { count: cards.length })}</strong>
            <button type="button" className="search-filter-mobile-trigger" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={16} />
              {t("results.filters.title")}
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
          </header>

          {activeFilterCount > 0 && (
            <div className="search-applied-filters" aria-label={t("results.filters.applied")}>
              {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <button type="button" onClick={() => removeFilter("price")}>
                  {filters.minPrice ?? 0}–{filters.maxPrice ?? "∞"} ₸<X size={13} />
                </button>
              )}
              {(filters.city || filters.radiusMeters || filters.mapBounds) && (
                <button type="button" onClick={() => removeFilter("location")}>
                  {filters.city
                    || (filters.radiusMeters ? `${Math.round(filters.radiusMeters / 1000)} ${t("results.filters.km")}` : t("results.filters.mapArea"))}
                  <X size={13} />
                </button>
              )}
              {filters.businessIds?.map(businessId => (
                <button type="button" key={businessId} onClick={() => removeFilter(businessId)}>
                  {companies.find(company => company.businessId === businessId)?.businessName ?? t("results.filters.company")}
                  <X size={13} />
                </button>
              ))}
            </div>
          )}

          {busy && (
            <div className="ask-results-skeletons" aria-label={t("results.searching")}>
              {Array.from({ length: 4 }).map((_, index) => <span key={index} />)}
            </div>
          )}

          {!busy && error && (
            <div className="ask-empty">
              <div>
                <Filter size={36} />
                <h2>{t("results.error.title")}</h2>
                <p>{error}</p>
                <button type="button" className="ask-primary-button" onClick={() => setFilters(current => ({ ...current }))}>
                  {t("results.error.retry")}
                </button>
              </div>
            </div>
          )}

          {!busy && !error && cards.length === 0 && (
            <div className="ask-empty">
              <div>
                <Search size={38} />
                <h2>{t("results.empty.title")}</h2>
                <p>{t("results.empty.description")}</p>
              </div>
            </div>
          )}

          {!busy && !error && cards.map(card => (
            <ResultCard
              key={card.id}
              data={card}
              selected={selected?.id === card.id}
              onSelect={() => setSelectedId(card.id)}
              onPreview={() => setSelectedId(card.id)}
              onBusiness={() => card.businessId && navigate(buildRoute(ROUTES.storefront, { businessId: card.businessId }))}
              onChat={() => openChat(card)}
            />
          ))}

          {!error && cards.length > 0 && hasNext && <div ref={loadMoreRef} aria-hidden="true" />}
        </section>

        <aside className={`ask-result-detail ask-surface${selected ? " is-open" : ""}`}>
          {selected ? (
            <>
              <button type="button" className="ask-result-detail__close" onClick={() => setSelectedId(null)} aria-label="Закрыть">
                <X size={18} />
              </button>
              <div className="ask-result-detail__gallery">
                <div
                  className="ask-result-detail__cover"
                  style={{
                    backgroundImage: selected.images[selectedImageIndex]?.url ? `url(${selected.images[selectedImageIndex].url})` : undefined,
                  }}
                >
                  {!selected.images[selectedImageIndex]?.url && <Store size={44} />}
                </div>
                {selected.images.length > 1 && (
                  <div className="ask-result-detail__thumbs">
                    {selected.images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        className={selectedImageIndex === index ? "is-active" : ""}
                        style={{ backgroundImage: `url(${image.url})` }}
                        onClick={() => setSelectedImageIndex(index)}
                        aria-label={`Показать изображение ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="ask-result-detail__content">
                <div className="ask-result-detail__business">
                  <button
                    type="button"
                    onClick={() => selected.businessId && navigate(buildRoute(ROUTES.storefront, { businessId: selected.businessId }))}
                    aria-label={`Открыть профиль ${selected.brandName}`}
                    style={{
                      backgroundColor: selected.brandColor || undefined,
                      backgroundImage: selected.brandLogoUrl ? `url(${selected.brandLogoUrl})` : undefined,
                    }}
                  >
                    {!selected.brandLogoUrl && <Store size={15} />}
                  </button>
                  <span>{selected.brandName}</span>
                </div>
                <h2>{selected.title}</h2>
                {selected.price && <strong className="ask-result-detail__price">{selected.price}</strong>}
                {selected.summary && <p>{selected.summary}</p>}

                {(selected.location || selected.city) && (
                  <div className="ask-result-detail__fact">
                    <MapPin size={18} />
                    <span>{[selected.location, selected.city].filter(Boolean).join(", ")}</span>
                  </div>
                )}

                {selected.businessProfile?.description && (
                  <section>
                    <h3>О бизнесе</h3>
                    <p>{selected.businessProfile.description}</p>
                  </section>
                )}
              </div>
              <footer className="ask-result-detail__actions">
                {selected.purchaseDestinations?.map((destination, index) => (
                  <a key={`${destination.label}-${destination.url}-${index}`} className="ask-secondary-button" href={destination.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={17} />
                    {destination.label}
                  </a>
                ))}
                <button type="button" className="ask-primary-button" onClick={() => openChat(selected)}>
                  <MessageCircle size={17} />
                  Написать
                </button>
              </footer>
            </>
          ) : (
            <div className="ask-result-detail__empty">
              <Store size={28} />
              <span>Наведите на товар или услугу, чтобы посмотреть детали</span>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
