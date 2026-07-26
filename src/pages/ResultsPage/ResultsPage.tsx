import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Globe,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import {
  searchAskV2,
  startChatConversation,
  type SearchExplicitFilters,
} from "../../shared/api/askClient";
import type { SearchV2CardDto } from "../../shared/api/dto";
import { ResultCard, type ResultCardData } from "../../shared/ui/ResultCard/ResultCard";

type SearchMode = "ITEM" | "SERVICE";
type SortKey = "relevance" | "distance" | "price_asc";

const PAGE_SIZE = 20;

function toMoney(value: number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined) return undefined;
  const suffix = currency === "KZT" || !currency ? "₸" : currency;
  return `${new Intl.NumberFormat("ru-KZ").format(value)} ${suffix}`;
}

function mapCard(card: SearchV2CardDto): ResultCardData {
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
    imageUrl: card.brandLogoUrl ?? card.businessProfile?.logoUrl ?? undefined,
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
  };
}

export function ResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("query") ?? "";
  const initialMode: SearchMode = searchParams.get("mode") === "SERVICE" ? "SERVICE" : "ITEM";
  const initialCity = searchParams.get("city") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [mode] = useState<SearchMode>(initialMode);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchExplicitFilters>({
    city: initialCity || undefined,
    country: "KZ",
  });
  const [draftFilters, setDraftFilters] = useState<SearchExplicitFilters>({
    city: initialCity || undefined,
    country: "KZ",
  });
  const [cards, setCards] = useState<ResultCardData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = cards.find(card => card.id === selectedId) ?? cards[0] ?? null;

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
      explicitFilters: filters,
    })
      .then(response => {
        if (!active) return;
        const nextCards = response.sections.flatMap(section => section.cards.map(mapCard));
        setCards(nextCards);
        setTotal(response.total);
        setHasNext(response.hasNext);
        setSelectedId(current => nextCards.some(card => card.id === current) ? current : nextCards[0]?.id ?? null);
      })
      .catch(reason => {
        if (!active) return;
        setCards([]);
        setError(reason instanceof Error ? reason.message : t("results.error.title"));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initialQuery, mode, sort, page, filters, t]);

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([, value]) => value !== undefined && value !== "" && value !== false).length - 1,
    [filters],
  );

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const rawQuery = query.trim();
    if (!rawQuery) return;
    navigate(buildRoute(ROUTES.results, {}, {
      query: rawQuery,
      mode,
      city: filters.city ?? "",
    }));
  };

  const openChat = async (card: ResultCardData) => {
    if (!state.authenticated) {
      navigate(ROUTES.auth);
      return;
    }
    if (!card.businessId) return;
    try {
      const conversation = await startChatConversation(card.businessId, card.title);
      navigate(buildRoute(ROUTES.chats, {}, { conversation: conversation.conversationId }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("results.error.title"));
    }
  };

  const applyFilters = () => {
    setPage(0);
    setFilters(draftFilters);
    setFiltersOpen(false);
  };

  return (
    <main id="main-content" className="ask-results-page">
      <form className="ask-results-search" onSubmit={submitSearch}>
        <button type="button" className="ask-icon-button" onClick={() => navigate(ROUTES.home)} aria-label={t("results.back")}>
          <ArrowLeft size={20} />
        </button>
        <label>
          <Search size={22} />
          <input value={query} onChange={event => setQuery(event.target.value)} aria-label={t("home.search.ariaLabel")} />
          <button type="button" onClick={() => setFiltersOpen(value => !value)} aria-label="Фильтры">
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </label>
        <button type="submit" className="ask-primary-button">{t("searchBar.button")}</button>
      </form>

      <div className="ask-results-layout">
        <aside className={`ask-results-filters ask-surface${filtersOpen ? " is-open" : ""}`}>
          <div className="ask-results-filters__header">
            <h2>Фильтры</h2>
            <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Закрыть"><X size={18} /></button>
          </div>

          <label className="ask-filter-field">
            <span>Категория</span>
            <input
              className="ask-field"
              value={draftFilters.category ?? ""}
              onChange={event => setDraftFilters(current => ({ ...current, category: event.target.value || undefined }))}
              placeholder={mode === "ITEM" ? "Например, рюкзаки" : "Например, ремонт"}
            />
          </label>

          <label className="ask-filter-field">
            <span>Город</span>
            <span className="ask-filter-field__icon">
              <MapPin size={16} />
              <input
                className="ask-field"
                value={draftFilters.city ?? ""}
                onChange={event => setDraftFilters(current => ({ ...current, city: event.target.value || undefined }))}
                placeholder="Алматы"
              />
            </span>
          </label>

          <label className="ask-filter-field">
            <span>Страна</span>
            <span className="ask-filter-field__icon">
              <Globe size={16} />
              <input className="ask-field" value="Казахстан" disabled />
            </span>
          </label>

          <fieldset className="ask-filter-price">
            <legend>Цена, ₸</legend>
            <input
              className="ask-field"
              type="number"
              min="0"
              value={draftFilters.minPrice ?? ""}
              onChange={event => setDraftFilters(current => ({
                ...current,
                minPrice: event.target.value ? Number(event.target.value) : undefined,
              }))}
              placeholder="от"
            />
            <span>—</span>
            <input
              className="ask-field"
              type="number"
              min="0"
              value={draftFilters.maxPrice ?? ""}
              onChange={event => setDraftFilters(current => ({
                ...current,
                maxPrice: event.target.value ? Number(event.target.value) : undefined,
              }))}
              placeholder="до"
            />
          </fieldset>

          <label className="ask-filter-toggle">
            <span>
              <strong>Открыто сейчас</strong>
              <small>Только с подтверждённым расписанием</small>
            </span>
            <input
              type="checkbox"
              checked={draftFilters.openNow ?? false}
              onChange={event => setDraftFilters(current => ({ ...current, openNow: event.target.checked || undefined }))}
            />
          </label>

          <label className="ask-filter-field">
            <span>Радиус поиска</span>
            <select
              className="ask-field"
              value={draftFilters.radiusMeters ?? ""}
              onChange={event => setDraftFilters(current => ({
                ...current,
                radiusMeters: event.target.value ? Number(event.target.value) : undefined,
              }))}
            >
              <option value="">Без ограничения</option>
              <option value="3000">3 км</option>
              <option value="10000">10 км</option>
              <option value="30000">30 км</option>
            </select>
          </label>

          <button type="button" className="ask-primary-button ask-results-filters__apply" onClick={applyFilters}>
            <Filter size={17} />
            Показать результаты
          </button>
        </aside>

        <section className="ask-results-list ask-surface">
          <header className="ask-results-list__header">
            <strong>Найдено: {total}</strong>
            <label>
              <span>Сортировка:</span>
              <select value={sort} onChange={event => { setPage(0); setSort(event.target.value as SortKey); }}>
                <option value="relevance">По релевантности</option>
                <option value="distance">По расстоянию</option>
                <option value="price_asc">Сначала дешевле</option>
              </select>
            </label>
          </header>

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
              onClick={() => {
                if (card.businessId) {
                  navigate(buildRoute(ROUTES.storefront, { businessId: card.businessId }));
                  return;
                }
                setSelectedId(card.id);
              }}
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
              <div
                className="ask-result-detail__cover"
                style={{
                  backgroundColor: selected.brandColor || undefined,
                  backgroundImage: selected.businessProfile?.coverUrl ? `url(${selected.businessProfile.coverUrl})` : undefined,
                }}
              >
                {!selected.businessProfile?.coverUrl && <Store size={44} />}
              </div>
              <div className="ask-result-detail__content">
                <span className="ask-result-detail__brand">{selected.brandName}</span>
                <h2>{selected.title}</h2>
                {selected.price && <strong className="ask-result-detail__price">{selected.price}</strong>}
                {selected.summary && <p>{selected.summary}</p>}

                {selected.matchReasons.length > 0 && (
                  <section>
                    <h3>Почему подходит</h3>
                    <div className="ask-result-detail__tags">
                      {selected.matchReasons.map(reason => <span key={reason}>{reason}</span>)}
                    </div>
                  </section>
                )}

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
                <button type="button" className="ask-secondary-button" onClick={() => navigate(buildRoute(ROUTES.storefront, { businessId: selected.businessId ?? "" }))}>
                  Открыть профиль
                </button>
                <button type="button" className="ask-primary-button" onClick={() => openChat(selected)}>
                  <MessageCircle size={17} />
                  Написать
                </button>
              </footer>
            </>
          ) : (
            <div className="ask-empty"><p>Выберите результат</p></div>
          )}
        </aside>
      </div>
    </main>
  );
}
