import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SearchBar } from "../../shared/ui/SearchBar/SearchBar";
import { CitySelector } from "../../shared/ui/CitySelector/CitySelector";
import { useMotion } from "../../app/providers/MotionProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import { ArrowRight, Package, Briefcase } from "lucide-react";

type SearchMode = "products" | "services";

export function HomePage() {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<SearchMode>("products");
  const [city, setCity] = useState("Алматы");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const navigate = useNavigate();
  const { reduced } = useMotion();
  const { state } = useAuth();

  if (state.view === "business" || state.view === "staff") {
    return <Navigate to={ROUTES.business} replace />;
  }

  const isAuthenticated = state.view !== "auth";

  const handleSearch = (query: string) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setBusy(true);
    navigate(buildRoute(ROUTES.results, {}, { query, mode, city }));
    setTimeout(() => setBusy(false), 100);
  };

  return (
    <main id="main-content">
      <section
        className="fcw-section fcw-relative fcw-overflow-hidden"
        style={{
          paddingTop: "clamp(2rem, 5vw, 4rem)",
          paddingBottom: "clamp(2rem, 4vw, 3rem)",
          minHeight: "85vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="fcw-container fcw-relative" style={{ zIndex: 2 }}>
          <div
            className="fcw-flex-col fcw-items-center fcw-text-center fcw-mx-auto"
            style={{ maxWidth: "600px", gap: "clamp(0.75rem, 1.5vw, 1.25rem)" }}
          >
            <motion.div
              className="fcw-label"
              style={{ color: "var(--fcw-color-primary)" }}
              initial={reduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Поиск по смыслу, не по словам
            </motion.div>

            <motion.h1
              className="fcw-text-balance"
              style={{
                fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
                fontWeight: "var(--fcw-font-weight-bold)",
                lineHeight: "var(--fcw-line-height-snug)",
                letterSpacing: "var(--fcw-tracking-tight)",
                fontFamily: "var(--fcw-font-body)",
                margin: 0,
              }}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Найдём то, что вам подходит рядом
            </motion.h1>

            {/* Mode toggle — Товары / Услуги */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
                <button
                  className={`fcw-btn fcw-btn-sm ${mode === "products" ? "fcw-glassmorph-selected-seg" : ""}`}
                  style={{
                    background: mode === "products" ? undefined : "transparent",
                    color: mode === "products" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                    fontWeight: mode === "products" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                    borderRadius: "var(--fcw-radius-md) 0 0 var(--fcw-radius-md)",
                    border: "none",
                    boxShadow: "none",
                    gap: "0.375rem",
                  }}
                  onClick={() => setMode("products")}
                >
                  <Package size={14} />
                  Товары
                </button>
                <button
                  className={`fcw-btn fcw-btn-sm ${mode === "services" ? "fcw-glassmorph-selected-seg" : ""}`}
                  style={{
                    background: mode === "services" ? undefined : "transparent",
                    color: mode === "services" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                    fontWeight: mode === "services" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                    borderRadius: "0 var(--fcw-radius-md) var(--fcw-radius-md) 0",
                    border: "none",
                    boxShadow: "none",
                    gap: "0.375rem",
                  }}
                  onClick={() => setMode("services")}
                >
                  <Briefcase size={14} />
                  Услуги
                </button>
              </div>
            </motion.div>

            {/* Search bar + city selector side by side */}
            <motion.div
              className="fcw-w-full"
              initial={reduced ? {} : { opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ maxWidth: "540px" }}
            >
              <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                <div className="fcw-flex-1">
                  <SearchBar onSearch={handleSearch} busy={busy} placeholder="Например: кожаный рюкзак, чёрный, минималистичный" />
                </div>
                <div className="fcw-hidden-mobile">
                  <CitySelector value={city} onChange={setCity} />
                </div>
              </div>
              {/* Mobile city selector — below search */}
              <div className="fcw-flex fcw-justify-center fcw-hidden-desktop" style={{ marginTop: "0.5rem" }}>
                <CitySelector value={city} onChange={setCity} compact />
              </div>
            </motion.div>

            {/* Auth prompt */}
            {showAuthPrompt && !isAuthenticated && (
              <motion.div
                className="fcw-flex-col fcw-items-center"
                style={{ gap: "var(--fcw-space-sm)" }}
                initial={reduced ? {} : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="fcw-body fcw-weight-medium" style={{ color: "var(--fcw-color-primary)" }}>
                  Вы должны авторизоваться
                </p>
                <button className="fcw-btn fcw-btn-primary" onClick={() => navigate(ROUTES.auth)}>
                  Войти
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Auth CTA */}
            {!isAuthenticated && !showAuthPrompt && (
              <motion.div
                className="fcw-flex fcw-flex-wrap fcw-justify-center fcw-items-center"
                style={{ gap: "0.75rem" }}
                initial={reduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <span className="fcw-body-s fcw-text-tertiary">Уже есть аккаунт?</span>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => navigate(ROUTES.auth)}>
                  Войти
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Ambient glow */}
        <div
          className="fcw-absolute"
          style={{
            inset: 0,
            background: "radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--fcw-color-primary) 8%, transparent) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      </section>
    </main>
  );
}
