import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownNarrowWide, ArrowLeft, Briefcase, CircleDollarSign, MapPin, MessageCircle, Navigation, Package, Plus, Sparkles, Store, Tags } from "lucide-react";
import { SearchBar } from "../../shared/ui/SearchBar/SearchBar";
import { SegmentedControl, type SegmentedOption } from "../../shared/ui/SegmentedControl/SegmentedControl";
import { ResultCard, type ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { CompanyCard } from "../../widgets/CompanyCard/CompanyCard";
import { Loading } from "../../shared/ui/Loading/Loading";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { useMotion } from "../../app/providers/MotionProvider";
import { searchAskV2 } from "../../shared/api/askClient";
import type { SearchV2CardDto } from "../../shared/api/dto";
import { buildRoute, ROUTES } from "../../app/routes";

type SearchMode = "products" | "services";
type ResultsTab = "found" | "matching" | "chats";
type SortKey = "intent_match" | "distance" | "active_events" | "price_asc" | "price_desc";

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const query = searchParams.get("query") || "";
  const mode = (searchParams.get("mode") || "products") as SearchMode;
  const city = searchParams.get("city") || t("citySelector.almaty");

  const [results, setResults] = useState<ResultCardData[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ResultsTab>("found");
  const [sort, setSort] = useState<SortKey>("intent_match");
  const [overlayCard, setOverlayCard] = useState<ResultCardData | null>(null);

  const sortOptions: SegmentedOption<SortKey>[] = [
    { key: "intent_match", label: t("results.sort.relevance"), icon: <Sparkles size={16} /> },
    { key: "distance", label: t("results.sort.distance"), icon: <Navigation size={16} /> },
    { key: "active_events", label: t("results.sort.activeEvents"), icon: <Tags size={16} /> },
    { key: "price_asc", label: t("results.sort.priceAsc"), icon: <ArrowDownNarrowWide size={16} /> },
    { key: "price_desc", label: t("results.sort.priceDesc"), icon: <CircleDollarSign size={16} /> },
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
      intentReasons: card.matchReasons,
      matchScore: undefined,
      type: card.component,
      hasContactAction: Boolean(contactAction),
      contactActionId: contactAction?.contactActionId,
      businessId: card.businessId,
    };
  }

  const scopeKey = mode === "products" ? "product" : "service";

  useEffect(() => {
    if (!query) return;
    setBusy(true);
    setError("");
    searchAskV2({ rawQuery: query, scope: scopeKey, city, sort })
      .then(res => {
        const cards = res.sections.flatMap(s => s.cards.map(mapCard));
        setResults(cards);
      })
      .catch(e => setError(e instanceof Error ? e.message : t("results.error.title")))
      .finally(() => setBusy(false));
  }, [query, scopeKey, city, sort]);

  const handleSearch = (newQuery: string) => {
    navigate(buildRoute(ROUTES.results, {}, { query: newQuery, mode, city }));
  };

  const matchingLabel = mode === "products" ? t("results.tab.matching") : t("results.tab.matchingServices");

  const tabs: SegmentedOption<ResultsTab>[] = [
    { key: "found", label: t("results.tab.found"), icon: mode === "products" ? <Package size={15} /> : <Briefcase size={15} /> },
    { key: "matching", label: matchingLabel, icon: <Store size={15} /> },
    { key: "chats", label: t("results.tab.chats"), icon: <MessageCircle size={15} /> },
  ];

  const isEmpty = !busy && !error && results.length === 0 && query;

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
              onClick={() => navigate(ROUTES.home)}
              style={{ gap: "0.5rem", flexShrink: 0 }}
            >
              <Plus size={16} />
              {t("results.newRequest")}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SegmentedControl
              options={tabs}
              value={activeTab}
              onChange={setActiveTab}
              layoutId="resultsTabPill"
              ariaLabel={t("results.sections")}
            />
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

              {!busy && !error && results.length > 0 && activeTab === "found" && (
            <motion.div
              className="fcw-flex-col"
              style={{ gap: "0.75rem" }}
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {results.map((card, i) => (
                <ResultCard
                  key={card.id}
                  data={card}
                  index={i}
                  reduced={reduced}
                  onClick={() => setOverlayCard(card)}
                  onChat={() => setOverlayCard(card)}
                />
              ))}
            </motion.div>
              )}

              {!busy && !error && activeTab === "matching" && (
            <motion.div
              className="fcw-flex-col"
              style={{ gap: "1rem" }}
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>
                  {t("results.matching.sent", { stores: Math.min(results.length, 7), entity: mode === "products" ? t("results.tab.matching") : t("results.tab.matchingServices") })} · {t("results.matching.responded", { count: Math.min(results.length, 4) })}
                </p>
              </div>
              {results.slice(0, 6).map((card, i) => (
                <motion.div
                  key={card.id}
                  className="fcw-card fcw-p-md"
                  initial={reduced ? {} : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduced ? 0 : i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/storefront/${card.id}`)}
                >
                  <div className="fcw-flex" style={{ gap: "0.75rem" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "var(--fcw-radius-md)",
                        backgroundColor: card.brandColor || "var(--fcw-color-surface-tertiary)",
                        backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        flexShrink: 0,
                      }}
                    />
                    <div className="fcw-flex-col fcw-flex-1" style={{ gap: "0.25rem" }}>
                      <div className="fcw-flex-between">
                        <span className="fcw-body fcw-weight-semibold">{card.brandName || card.title}</span>
                        <span className="fcw-label" style={{ color: "var(--fcw-color-accent)" }}>{t("results.matching.respondedLabel")}</span>
                      </div>
                      {card.location && (
                        <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                          <MapPin size={11} />
                          {card.location}
                        </span>
                      )}
                      <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.375rem", marginTop: "0.25rem" }}>
                        {card.intentReasons?.slice(0, 3).map((tag, j) => (
                          <span
                            key={j}
                            className="fcw-body-s"
                            style={{
                              padding: "0.125rem 0.5rem",
                              backgroundColor: "var(--fcw-color-surface-tertiary)",
                              borderRadius: "var(--fcw-radius-full)",
                              color: "var(--fcw-color-text-secondary)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        <span
                          className="fcw-body-s"
                          style={{
                            padding: "0.125rem 0.5rem",
                            backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                            borderRadius: "var(--fcw-radius-full)",
                            color: "var(--fcw-color-accent)",
                          }}
                        >
                          {t("results.matching.pickupToday")}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
              )}

              {!busy && !error && activeTab === "chats" && (
            <motion.div
              className="fcw-flex-col"
              style={{ gap: "0.75rem" }}
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {results.filter(c => c.hasContactAction).length === 0 ? (
                <EmptyState
                  title={t("results.tab.chats")}
                  description={t("results.chats.empty")}
                />
              ) : (
                results.filter(c => c.hasContactAction).map(card => (
                  <div
                    key={card.id}
                    className="fcw-card fcw-p-md fcw-card-clickable"
                    style={{ cursor: "pointer" }}
                    onClick={() => setOverlayCard(card)}
                  >
                    <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "var(--fcw-radius-md)",
                        backgroundColor: card.brandColor || "var(--fcw-color-surface-tertiary)",
                        backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : undefined,
                        backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0,
                      }} />
                      <div className="fcw-flex-col fcw-flex-1" style={{ gap: "0.125rem", minWidth: 0 }}>
                        <span className="fcw-body fcw-weight-medium">{card.brandName || card.title}</span>
                        <span className="fcw-body-xs fcw-text-tertiary">{t("results.chats.clickHint")}</span>
                      </div>
                      <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={e => { e.stopPropagation(); setOverlayCard(card); }}>
                        <MessageCircle size={14} /> {t("results.chats.write")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
              )}
            </div>

            <aside className="results-sort-rail" aria-label={t("results.sort.railLabel")}>
              <span className="fcw-label fcw-text-tertiary" style={{ marginBottom: "0.5rem", display: "block" }}>{t("results.sort.label")}</span>
              <SegmentedControl
                options={sortOptions}
                value={sort}
                onChange={setSort}
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
