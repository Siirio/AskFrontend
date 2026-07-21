import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownNarrowWide, ArrowLeft, ChevronLeft, ChevronRight, Navigation, Plus, Sparkles } from "lucide-react";
import { SearchBar } from "../../shared/ui/SearchBar/SearchBar";
import { SegmentedControl, type SegmentedOption } from "../../shared/ui/SegmentedControl/SegmentedControl";
import { ResultCard, type ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { CompanyCard } from "../../widgets/CompanyCard/CompanyCard";
import { Loading } from "../../shared/ui/Loading/Loading";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { useMotion } from "../../app/providers/MotionProvider";
import { searchAskV2 } from "../../shared/api/askClient";
import type { SearchConstraintDto, SearchV2CardDto, SearchV2SectionDto } from "../../shared/api/dto";
import { buildRoute, ROUTES } from "../../app/routes";

type SearchMode = "products" | "services";
type SortKey = "intent_match" | "distance" | "price_asc";

type ResultSection = Omit<SearchV2SectionDto, "cards"> & { cards: ResultCardData[] };

const SEARCH_PAGE_SIZE = 20;

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const query = searchParams.get("query") || "";
  const mode = (searchParams.get("mode") || "products") as SearchMode;
  const city = searchParams.get("city") || t("citySelector.almaty");

  const [sections, setSections] = useState<ResultSection[]>(() => {
    try {
      const stored = sessionStorage.getItem("ask.lastResults");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.query === query && parsed.mode === mode && parsed.city === city) {
          return parsed.sections || [];
        }
      }
    } catch { /* ignore corrupt session storage */ }
    return [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("intent_match");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [constraints, setConstraints] = useState<SearchConstraintDto[]>([]);
  const [overlayCard, setOverlayCard] = useState<ResultCardData | null>(null);

  const sortOptions: SegmentedOption<SortKey>[] = [
    { key: "intent_match", label: t("results.sort.relevance"), icon: <Sparkles size={16} /> },
    { key: "distance", label: t("results.sort.distance"), icon: <Navigation size={16} /> },
    { key: "price_asc", label: t("results.sort.priceAsc"), icon: <ArrowDownNarrowWide size={16} /> },
  ];

  function mapCard(card: SearchV2CardDto): ResultCardData {
    const contactAction = card.contactActions?.[0];
    return {
      id: card.resultId,
      title: card.title || t("results.noTitle"),
      subtitle: undefined,
      price: card.price ? `${card.price.toLocaleString("ru-KZ")} ${t("currency.short")}` : undefined,
      location: card.branchName ?? undefined,
      imageUrl: card.brandLogoUrl ?? undefined,
      brandName: card.businessName ?? undefined,
      brandColor: card.brandColor ?? undefined,
      distance: card.distanceMeters ? `${(card.distanceMeters / 1000).toFixed(1)} ${t("results.km")}` : undefined,
      verified: false,
      matchScore: undefined,
      type: card.component,
      hasContactAction: Boolean(contactAction),
      contactActionId: contactAction?.contactActionId,
      contactActions: card.contactActions || [],
      businessId: card.businessId,
      availabilityWarning: card.availabilityWarning ?? undefined,
      matchReasons: card.matchReasons || [],
    };
  }

  function constraintLabel(constraint: SearchConstraintDto) {
    return t(`results.constraints.${constraint.key}`, { defaultValue: constraint.key });
  }

  function constraintValue(constraint: SearchConstraintDto) {
    if (constraint.key === "scope") {
      return t(`results.constraints.scope.${constraint.value.toLowerCase()}`, { defaultValue: constraint.value });
    }
    return constraint.value;
  }

  const scopeKey = mode === "products" ? "product" : "service";

  useEffect(() => {
    if (!query) return;
    setBusy(true);
    setError("");
    searchAskV2({ rawQuery: query, scope: scopeKey, city, sort, page, pageSize: SEARCH_PAGE_SIZE })
      .then(res => {
        const nextSections = res.sections.map(section => ({ ...section, cards: section.cards.map(mapCard) }));
        setSections(nextSections);
        setConstraints(res.interpretedConstraints || []);
        setTotal(res.total);
        setHasNext(res.hasNext);
        try {
          sessionStorage.setItem("ask.lastResults", JSON.stringify({ query, mode, city, sections: nextSections, sort, page }));
        } catch { /* ignore quota */ }
      })
      .catch(e => setError(e instanceof Error ? e.message : t("results.error.title")))
      .finally(() => setBusy(false));
  }, [query, scopeKey, city, sort, page]);

  const handleSearch = (newQuery: string) => {
    try { sessionStorage.removeItem("ask.lastResults"); } catch { /* ignore */ }
    navigate(buildRoute(ROUTES.results, {}, { query: newQuery, mode, city }));
  };

  const resultCount = sections.reduce((count, section) => count + section.cards.length, 0);
  const isEmpty = !busy && !error && resultCount === 0 && query;

  return (
    <main id="main-content">
      <section
        className="fcw-sticky fcw-z-sticky"
        style={{
          top: "56px",
          backdropFilter: "var(--fcw-blur-glass)",
          WebkitBackdropFilter: "var(--fcw-blur-glass)",
          backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 88%, transparent)",
          borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
        }}
      >
        <div className="fcw-container" style={{ paddingTop: "var(--fcw-space-sm)", paddingBottom: "var(--fcw-space-sm)" }}>
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", marginBottom: "0.625rem" }}>
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-icon"
              onClick={() => navigate(-1)}
              aria-label={t("results.back")}
              style={{ flexShrink: 0 }}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="fcw-flex-1" style={{ minWidth: 0 }}>
              <SearchBar key={`s-${query}`} onSearch={handleSearch} initialQuery={query} busy={busy} />
            </div>
            <button
              className="fcw-btn fcw-btn-primary fcw-btn-sm"
              onClick={() => { try { sessionStorage.removeItem("ask.lastResults"); } catch { /* ignore */ } navigate(ROUTES.home); }}
              style={{ gap: "0.5rem", flexShrink: 0 }}
            >
              <Plus size={16} />
              {t("results.newRequest")}
            </button>
          </div>

        </div>
      </section>

      <section className="fcw-section-sm">
        <div className="fcw-container">
          <div className="results-window">
            <div className="results-center">
              {busy && (
                <div style={{ padding: "4rem 0" }}>
                  <Loading size="lg" text={t("results.searching")} />
                </div>
              )}

              {error && (
                <EmptyState
                  title={t("results.error.title")}
                  description={error}
                  action={
                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => handleSearch(query)}>
                      {t("results.error.retry")}
                    </button>
                  }
                />
              )}

              {isEmpty && (
                <EmptyState
                  title={t("results.empty.title")}
                  description={t("results.empty.description")}
                />
              )}

              {!busy && !error && resultCount > 0 && (
            <motion.div
              className="fcw-flex-col"
              style={{ gap: "0.75rem" }}
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {constraints.length > 0 && (
                <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.375rem" }} aria-label={t("results.constraints.label")}>
                  {constraints.map(constraint => (
                    <span key={`${constraint.key}-${constraint.value}`} className="fcw-badge fcw-badge-neutral">
                      {constraintLabel(constraint)}: {constraintValue(constraint)}
                    </span>
                  ))}
                </div>
              )}
              {sections.map((section, sectionIndex) => (
                <section key={`${section.kind}-${section.type}`} className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                  <div>
                    <h2 className="fcw-heading-sm">
                      {section.kind === "EXACT" ? t("results.sections.exact") : t("results.sections.alternatives")}
                    </h2>
                    {section.kind === "ALTERNATIVE" && (
                      <p className="fcw-body-s fcw-text-secondary" style={{ marginTop: "0.25rem" }}>
                        {section.reason || t("results.sections.alternativeReason")}
                      </p>
                    )}
                  </div>
                  {section.cards.map((card, cardIndex) => (
                    <ResultCard
                      key={card.id}
                      data={card}
                      index={sectionIndex * SEARCH_PAGE_SIZE + cardIndex}
                      reduced={reduced}
                      onClick={() => setOverlayCard(card)}
                      onBrandClick={() => setOverlayCard(card)}
                      onChat={() => setOverlayCard(card)}
                    />
                  ))}
                </section>
              ))}
              <div className="fcw-flex fcw-items-center fcw-justify-between" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={page === 0} onClick={() => setPage(current => current - 1)}>
                  <ChevronLeft size={16} />
                  {t("results.pagination.previous")}
                </button>
                <span className="fcw-body-s fcw-text-secondary">
                  {t("results.pagination.summary", { page: page + 1, total })}
                </span>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={!hasNext} onClick={() => setPage(current => current + 1)}>
                  {t("results.pagination.next")}
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
              )}

            </div>

            <aside className="results-sort-rail" aria-label={t("results.sort.railLabel")}>
              <span className="fcw-label fcw-text-tertiary" style={{ marginBottom: "0.5rem", display: "block" }}>{t("results.sort.label")}</span>
              <SegmentedControl
                options={sortOptions}
                value={sort}
                onChange={nextSort => { setPage(0); setSort(nextSort); }}
                layoutId="resultsSortPill"
                ariaLabel={t("results.sort.ariaLabel")}
                vertical
                iconOnly
              />
            </aside>
          </div>
        </div>
      </section>

      <div className="fcw-hidden-desktop" style={{ height: "64px" }} aria-hidden="true" />

      <CompanyCard
        data={overlayCard}
        onClose={() => setOverlayCard(null)}
      />
    </main>
  );
}
