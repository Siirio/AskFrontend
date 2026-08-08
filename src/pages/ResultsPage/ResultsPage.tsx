import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildRoute, ROUTES } from "../../app/routes";
import {
  searchAskV2,
  getSearchClarification,
  type SearchFilters,
} from "../../shared/api/askClient";
import type {
  SearchV2CardDto,
  SearchV2SectionDto,
  DecisionContextDto,
  ClarificationResponseDto,
  DecisionCriterionDto,
} from "../../shared/api/dto";
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
import { DecisionCriteriaRail } from "../../features/decision-search/ui/DecisionCriteriaRail";
import { DecisionResultCard } from "../../features/decision-search/ui/DecisionResultCard";
import { DecisionCompactCard } from "../../features/decision-search/ui/DecisionCompactCard";
import { TradeoffPanel } from "../../features/decision-search/ui/TradeoffPanel";
import { SearchClarificationModal } from "../../features/decision-search/ui/SearchClarificationModal";
import { ComparisonModal } from "../../features/decision-search/ui/ComparisonModal";
import {
  loadShortlist,
  saveShortlist,
  clearShortlist,
  addToShortlist,
  removeFromShortlist,
} from "../../features/decision-search/model/shortlist";

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

function searchSignature(query: string, mode: string, city: string): string {
  return `${mode}|${query}|${city}`;
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
  const [sections, setSections] = useState<SearchV2SectionDto[]>([]);
  const [companies, setCompanies] = useState<SearchCompanyOption[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [decisionContext, setDecisionContext] = useState<DecisionContextDto | null>(null);
  const [clarification, setClarification] = useState<ClarificationResponseDto | null>(null);
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const clarificationShownRef = useRef(false);
  const currentSearchSig = useRef("");

  const [shortlistIds, setShortlistIds] = useState<string[]>(() =>
    loadShortlist(initialQuery, initialMode, initialCity),
  );
  const [customCondition, setCustomCondition] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [shortlistLimitToast, setShortlistLimitToast] = useState(false);

  useEffect(() => {
    if (shortlistLimitToast) {
      const timer = setTimeout(() => setShortlistLimitToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [shortlistLimitToast]);

  const allCards = useMemo(
    () => sections.flatMap(s => s.cards),
    [sections],
  );

  const shortlistCards = useMemo(
    () => allCards.filter(c => shortlistIds.includes(c.resultId)),
    [allCards, shortlistIds],
  );

  const exactSections = sections.filter(s => s.kind === "EXACT");
  const alternativeSections = sections.filter(s => s.kind !== "EXACT");

  const hardConstraints = decisionContext?.hardConstraints ?? [];
  const preferences = decisionContext?.preferences ?? [];

  const relaxations = useMemo(() => {
    const relaxedKeys = new Set(
      sections.flatMap(s => s.relaxedConstraints ?? []),
    );
    return hardConstraints.filter(c => relaxedKeys.has(c.key));
  }, [sections, hardConstraints]);

  useEffect(() => {
    saveActiveSearchRoute(`${location.pathname}${location.search}`, window.sessionStorage);
    window.dispatchEvent(new Event(ACTIVE_SEARCH_ROUTE_CHANGED_EVENT));
  }, [location.pathname, location.search]);

  useEffect(() => {
    saveShortlist(initialQuery, initialMode, initialCity, shortlistIds);
  }, [shortlistIds, initialQuery, initialMode, initialCity]);

  useEffect(() => {
    if (!initialQuery.trim()) return;
    let active = true;
    setBusy(true);
    setError("");

    const sig = searchSignature(initialQuery, initialMode, filters.city ?? "");
    const isNewSearch = sig !== currentSearchSig.current;

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
      decisionContext: decisionContext ?? undefined,
    })
      .then(response => {
        if (!active) return;
        setCompanies((response.companyFacets ?? []).map(facet => ({
          businessId: facet.businessId,
          businessName: facet.businessName,
          resultCount: facet.resultCount,
        })));
        if (page === 0) {
          setSections(response.sections);
        } else {
          setSections(prev => {
            const existingIds = new Set(prev.flatMap(s => s.cards).map(c => c.resultId));
            return response.sections.map(s => ({
              ...s,
              cards: s.cards.filter(c => !existingIds.has(c.resultId)),
            })).filter(s => s.cards.length > 0);
          });
        }
        setHasNext(response.hasNext);
        if (response.decisionContext) {
          setDecisionContext(response.decisionContext);
        }
      })
      .catch(reason => {
        if (!active) return;
        if (page === 0) {
          setSections([]);
          setCompanies([]);
        }
        setError(reason instanceof Error ? reason.message : t("results.error.title"));
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    if (isNewSearch && page === 0) {
      currentSearchSig.current = sig;
      clarificationShownRef.current = false;
      setShortlistIds(loadShortlist(initialQuery, initialMode, filters.city ?? ""));

      getSearchClarification({
        rawQuery: initialQuery,
        mode,
        city: filters.city,
      })
        .then(resp => {
          if (!active) return;
          setClarification(resp);
          if (resp.clarificationRequired && !clarificationShownRef.current) {
            setClarificationOpen(true);
            clarificationShownRef.current = true;
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [filters, initialQuery, mode, page, sort, decisionContext, t]);

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
    setDecisionContext(null);
    setCustomCondition("");
    clearShortlist(initialQuery, initialMode, initialCity);
    setShortlistIds([]);
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

  const handleShortlist = useCallback((resultId: string) => {
    setShortlistIds(prev => {
      const existing = prev.includes(resultId);
      if (existing) return removeFromShortlist(prev, resultId);
      const result = addToShortlist(prev, resultId);
      if (result.blocked) {
        setShortlistLimitToast(true);
        return prev;
      }
      return result.ids;
    });
  }, []);

  const handleShortlistRemove = useCallback((resultId: string) => {
    setShortlistIds(prev => removeFromShortlist(prev, resultId));
  }, []);

  const handleClarificationSubmit = useCallback((context: DecisionContextDto) => {
    setClarificationOpen(false);
    setDecisionContext(context);
    setPage(0);
  }, []);

  const handleClarificationSkip = useCallback(() => {
    setClarificationOpen(false);
  }, []);

  const handleRecalculate = useCallback(() => {
    if (!customCondition.trim()) return;
    setRecalculating(true);
    const updatedContext: DecisionContextDto = {
      ...(decisionContext ?? { hardConstraints: [], preferences: [], useCases: [], exclusions: [] }),
      customText: customCondition.trim(),
    };
    setDecisionContext(updatedContext);
    setPage(0);
    setRecalculating(false);
  }, [customCondition, decisionContext]);

  const handleRelax = useCallback((criterion: DecisionCriterionDto) => {
    const updatedContext: DecisionContextDto = {
      ...(decisionContext ?? { hardConstraints: [], preferences: [], useCases: [], exclusions: [] }),
      hardConstraints: (decisionContext?.hardConstraints ?? []).filter(c => c.key !== criterion.key),
    };
    setDecisionContext(updatedContext);
    setPage(0);
  }, [decisionContext]);

  const handleChangeCriteria = useCallback(() => {
    setClarificationOpen(true);
  }, []);

  const handleChat = useCallback((card: SearchV2CardDto) => {
    openChat({
      id: card.resultId,
      resultType: card.resultType,
      title: card.title,
      businessId: card.businessId,
      brandName: card.businessName,
      brandColor: card.brandColor ?? undefined,
      brandLogoUrl: card.brandLogoUrl ?? card.businessProfile?.logoUrl ?? undefined,
      businessProfile: card.businessProfile,
      images: card.images ?? [],
      purchaseDestinations: card.purchaseDestinations ?? [],
      price: undefined,
      priceValue: card.price ?? undefined,
      distanceMeters: card.distanceMeters ?? undefined,
      latitude: card.latitude ?? undefined,
      longitude: card.longitude ?? undefined,
      hasActiveOffer: card.hasActiveOffer ?? false,
    });
  }, [openChat]);

  const handleBusiness = useCallback((card: SearchV2CardDto) => {
    if (card.businessId) {
      navigate(buildRoute(ROUTES.storefront, { businessId: card.businessId }));
    }
  }, [navigate]);

  const hasExactMatch = exactSections.length > 0 && exactSections.some(s => s.cards.length > 0);

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

        <div className="ask-decision-workspace">
          <DecisionCriteriaRail
            hardConstraints={hardConstraints}
            preferences={preferences}
            relaxations={relaxations}
            onRelax={handleRelax}
            onChangeCriteria={handleChangeCriteria}
          />

          <section className="ask-decision-sections">
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

            {busy && page === 0 && (
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

            {!busy && !error && allCards.length === 0 && (
              <div className="ask-empty">
                <div>
                  <Search size={38} />
                  <h2>{t("results.empty.title")}</h2>
                  <p>{t("results.empty.description")}</p>
                </div>
              </div>
            )}

            {!busy && !error && allCards.length > 0 && (
              <>
                {exactSections.map(section => (
                  <div key={section.type} className="ask-decision-section">
                    <h2 className="ask-decision-section__title">
                      {section.title || t("decision.recommended")}
                    </h2>
                    {section.cards.map(card => (
                      <DecisionResultCard
                        key={card.resultId}
                        card={card}
                        recommended={section.kind === "EXACT"}
                        inShortlist={shortlistIds.includes(card.resultId)}
                        onShortlist={() => handleShortlist(card.resultId)}
                        onChat={() => handleChat(card)}
                        onBusiness={() => handleBusiness(card)}
                      />
                    ))}
                  </div>
                ))}

                {!hasExactMatch && allCards.length > 0 && (
                  <p className="ask-decision-no-match">{t("decision.noExactMatch")}</p>
                )}

                {alternativeSections.map(section => (
                  <div key={section.type} className="ask-decision-section">
                    <h2 className="ask-decision-section__title">
                      {section.title || t("decision.alternatives")}
                    </h2>
                    {section.cards.map(card => (
                      <DecisionCompactCard
                        key={card.resultId}
                        card={card}
                        inShortlist={shortlistIds.includes(card.resultId)}
                        onShortlist={() => handleShortlist(card.resultId)}
                      />
                    ))}
                  </div>
                ))}
              </>
            )}

            {!error && allCards.length > 0 && hasNext && <div ref={loadMoreRef} aria-hidden="true" />}
          </section>

          <TradeoffPanel
            shortlistCards={shortlistCards}
            onRemove={handleShortlistRemove}
            customText={customCondition}
            onCustomTextChange={setCustomCondition}
            onRecalculate={handleRecalculate}
            recalculating={recalculating}
            onCompare={() => setComparisonOpen(true)}
            compareDisabled={shortlistIds.length < 2}
          />
        </div>
      </div>

      {shortlistLimitToast && (
        <div className="ask-toast">{t("decision.shortlistLimit")}</div>
      )}

      {clarification && (
        <SearchClarificationModal
          open={clarificationOpen}
          onClose={() => setClarificationOpen(false)}
          fields={clarification.fields}
          prefilledContext={clarification.prefilledDecisionContext}
          mode={mode}
          onSubmit={handleClarificationSubmit}
          onSkip={handleClarificationSkip}
        />
      )}

      <ComparisonModal
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        shortlistIds={shortlistIds}
        mode={mode}
        decisionContext={decisionContext}
        allCards={allCards}
        onChat={(businessId) => {
          const card = allCards.find(c => c.businessId === businessId);
          if (card) handleChat(card);
        }}
      />
    </main>
  );
}
