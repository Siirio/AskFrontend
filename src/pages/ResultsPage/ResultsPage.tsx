import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
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
  type SearchLocalFilters,
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

function getStoredUserLocation() {
  try {
    const raw = window.localStorage.getItem("ask.geo");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return undefined;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return undefined;
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

function distanceBetween(
  origin: { lat: number; lng: number },
  destination: { latitude: number; longitude: number },
) {
  const earthRadius = 6371000;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(destination.latitude - origin.lat);
  const longitudeDelta = radians(destination.longitude - origin.lng);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

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
    brandLogoUrl: card.brandLogoUrl ?? card.businessProfile?.logoUrl ?? undefined,
    brandName: card.businessName,
    brandColor: card.brandColor ?? undefined,
    businessId: card.businessId,
    availability: card.availability ?? undefined,
    availabilityWarning: card.availabilityWarning ?? undefined,
    matchReasons: card.matchReasons ?? [],
    badges: card.badges ?? [],
    openingLabel: card.openingSummary?.label ?? undefined,
    openingState: card.openingSummary?.state,
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
  const [filters, setFilters] = useState<SearchLocalFilters>({
    city: initialCity || undefined,
  });
  const [draftFilters, setDraftFilters] = useState<SearchLocalFilters>({
    city: initialCity || undefined,
  });
  const [sourceCards, setSourceCards] = useState<SearchResultCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");

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

  const cards = useMemo(() => {
    const userLocation = getStoredUserLocation();
    const withDistance = sourceCards.map((card, index) => ({
      card: card.latitude !== undefined && card.longitude !== undefined && userLocation
        ? {
            ...card,
            distanceMeters: distanceBetween(userLocation, {
              latitude: card.latitude,
              longitude: card.longitude,
            }),
          }
        : card,
      index,
    }));
    const filtered = withDistance.filter(({ card }) => {
      if (filters.minPrice !== undefined && (card.priceValue === undefined || card.priceValue < filters.minPrice)) return false;
      if (filters.maxPrice !== undefined && (card.priceValue === undefined || card.priceValue > filters.maxPrice)) return false;
      if (filters.businessIds?.length && (!card.businessId || !filters.businessIds.includes(card.businessId))) return false;
      if (filters.city && card.city?.toLocaleLowerCase() !== filters.city.toLocaleLowerCase()) return false;
      if (filters.radiusMeters && (card.distanceMeters === undefined || card.distanceMeters > filters.radiusMeters)) return false;
      if (filters.mapBounds) {
        if (card.latitude === undefined || card.longitude === undefined) return false;
        if (card.latitude > filters.mapBounds.north || card.latitude < filters.mapBounds.south
            || card.longitude > filters.mapBounds.east || card.longitude < filters.mapBounds.west) return false;
      }
      return true;
    });
    const numberValue = (value: number | undefined, descending = false) => {
      if (value === undefined) return Number.POSITIVE_INFINITY;
      return descending ? -value : value;
    };
    return filtered
      .sort((left, right) => {
        if (sort === "distance") {
          return numberValue(left.card.distanceMeters) - numberValue(right.card.distanceMeters) || left.index - right.index;
        }
        if (sort === "price_asc") {
          return numberValue(left.card.priceValue) - numberValue(right.card.priceValue) || left.index - right.index;
        }
        if (sort === "price_desc") {
          return numberValue(left.card.priceValue, true) - numberValue(right.card.priceValue, true) || left.index - right.index;
        }
        if (sort === "unique_offers") {
          return Number(right.card.hasActiveOffer) - Number(left.card.hasActiveOffer) || left.index - right.index;
        }
        return left.index - right.index;
      })
      .map(({ card }) => ({
        ...card,
        distance: card.distanceMeters !== undefined ? `${(card.distanceMeters / 1000).toFixed(1)} км` : card.distance,
      }));
  }, [filters, sort, sourceCards]);

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
      sort: "relevance",
      page,
      pageSize: PAGE_SIZE,
    })
      .then(response => {
        if (!active) return;
        const nextCards = response.sections.flatMap(section => section.cards.map(mapCard));
        setSourceCards(nextCards);
        setHasNext(response.hasNext);
        setSelectedId(current => nextCards.some(card => card.id === current) ? current : null);
      })
      .catch(reason => {
        if (!active) return;
        setSourceCards([]);
        setError(reason instanceof Error ? reason.message : t("results.error.title"));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initialQuery, mode, page, t]);

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
    const reset = {} satisfies SearchLocalFilters;
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

          {!busy && !error && cards.length > 0 && (
            <footer className="ask-results-pagination">
              <button type="button" disabled={page === 0} onClick={() => setPage(current => current - 1)}>
                <ChevronLeft size={17} />
                Назад
              </button>
              <span>{page + 1}</span>
              <button type="button" disabled={!hasNext} onClick={() => setPage(current => current + 1)}>
                Далее
                <ChevronRight size={17} />
              </button>
            </footer>
          )}
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

                {selected.openingLabel && (
                  <div className="ask-result-detail__fact">
                    <Clock3 size={18} />
                    <span>{selected.openingLabel}</span>
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
