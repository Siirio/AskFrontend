import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Package, Briefcase, MessageCircle, Store, SlidersHorizontal, MapPin } from "lucide-react";
import { SearchBar } from "../../shared/ui/SearchBar/SearchBar";
import { CitySelector } from "../../shared/ui/CitySelector/CitySelector";
import { ResultCard, type ResultCardData } from "../../shared/ui/ResultCard/ResultCard";
import { Loading } from "../../shared/ui/Loading/Loading";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { useMotion } from "../../app/providers/MotionProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { searchAskV2 } from "../../shared/api/askClient";
import type { SearchV2CardDto } from "../../shared/api/dto";
import { buildRoute, ROUTES } from "../../app/routes";

type SearchMode = "products" | "services";
type ResultsTab = "found" | "matching" | "chats";

function mapCard(card: SearchV2CardDto): ResultCardData {
  return {
    id: card.resultId,
    title: card.title || "Без названия",
    subtitle: undefined,
    price: card.price ? `${card.price.toLocaleString("ru-KZ")} ₸` : undefined,
    location: card.branchName ?? undefined,
    imageUrl: card.brandLogoUrl ?? undefined,
    brandName: card.businessName ?? undefined,
    brandColor: card.brandColor ?? undefined,
    verified: false,
    intentReasons: card.matchReasons,
    matchScore: undefined,
    type: card.component,
  };
}

export function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reduced } = useMotion();
  const { state } = useAuth();

  const query = searchParams.get("query") || "";
  const mode = (searchParams.get("mode") || "products") as SearchMode;
  const city = searchParams.get("city") || "Алматы";

  const [results, setResults] = useState<ResultCardData[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ResultsTab>("found");

  const scopeKey = mode === "products" ? "product" : "service";

  useEffect(() => {
    if (!query) return;
    setBusy(true);
    setError("");
    searchAskV2({ rawQuery: query, scope: scopeKey, city })
      .then(res => {
        const cards = res.sections.flatMap(s => s.cards.map(mapCard));
        setResults(cards);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Ошибка поиска"))
      .finally(() => setBusy(false));
  }, [query, scopeKey, city]);

  const handleSearch = (newQuery: string) => {
    navigate(buildRoute(ROUTES.results, {}, { query: newQuery, mode, city }));
  };

  const handleCityChange = (newCity: string) => {
    setSearchParams({ query, mode, city: newCity });
  };

  const matchingLabel = mode === "products" ? "Подходящие магазины" : "Подходящие исполнители";

  const tabs: { key: ResultsTab; label: string; icon: React.ReactNode }[] = [
    { key: "found", label: "Найденное", icon: mode === "products" ? <Package size={14} /> : <Briefcase size={14} /> },
    { key: "matching", label: matchingLabel, icon: <Store size={14} /> },
    { key: "chats", label: "Чаты", icon: <MessageCircle size={14} /> },
  ];

  const isEmpty = !busy && !error && results.length === 0 && query;

  return (
    <main id="main-content">
      {/* Sticky search header */}
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
          {/* Search row */}
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.625rem", marginBottom: "0.5rem" }}>
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
              onClick={() => navigate(-1)}
              aria-label="Назад"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="fcw-flex-1">
              <SearchBar onSearch={handleSearch} initialQuery={query} busy={busy} compact />
            </div>
            <CitySelector value={city} onChange={handleCityChange} compact />
            <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" aria-label="Фильтры">
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Tabs + sort */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`fcw-btn fcw-btn-sm ${activeTab === tab.key ? "fcw-glassmorph-selected-seg" : ""}`}
                  style={{
                    background: activeTab === tab.key ? undefined : "transparent",
                    color: activeTab === tab.key ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                    fontWeight: activeTab === tab.key ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                    border: "none",
                    boxShadow: "none",
                    gap: "0.375rem",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon}
                  <span className="fcw-hidden-mobile">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="fcw-flex fcw-items-center fcw-hidden-mobile" style={{ gap: "0.375rem", position: "absolute", right: 0 }}>
              <span className="fcw-body-s fcw-text-tertiary">Сортировка:</span>
              <button
                className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                style={{
                  color: "var(--fcw-color-primary)",
                  fontWeight: "var(--fcw-font-weight-medium)",
                  gap: "0.25rem",
                }}
              >
                Под вас
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results area */}
      <section className="fcw-section-sm">
        <div className="fcw-container">
          {busy && (
            <div style={{ padding: "4rem 0" }}>
              <Loading size="lg" text="Поиск..." />
            </div>
          )}

          {error && (
            <EmptyState
              title="Ошибка поиска"
              description={error}
              action={
                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => handleSearch(query)}>
                  Повторить
                </button>
              }
            />
          )}

          {isEmpty && (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить запрос или город"
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
                  onClick={() => navigate(`/product/${card.id}`, { state: { card } })}
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
                  Запрос отправлен в {Math.min(results.length, 7)} {mode === "products" ? "магазинов" : "исполнителей"} · {Math.min(results.length, 4)} уже ответили
                </p>
              </div>
              {/* Store/provider cards */}
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
                        <span className="fcw-label" style={{ color: "var(--fcw-color-accent)" }}>Уже ответили</span>
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
                          Самовывоз: сегодня
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!busy && !error && activeTab === "chats" && (
            <EmptyState
              title="Чаты"
              description="Контекстные чаты появятся здесь после отправки запросов магазинам"
            />
          )}
        </div>
      </section>

      {/* Mobile spacers for bottom nav */}
      <div className="fcw-hidden-desktop" style={{ height: "64px" }} aria-hidden="true" />
    </main>
  );
}
