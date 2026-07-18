import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SearchBar } from "../../shared/ui/SearchBar/SearchBar";
import { CitySelector } from "../../shared/ui/CitySelector/CitySelector";
import { SegmentedControl, type SegmentedOption } from "../../shared/ui/SegmentedControl/SegmentedControl";
import { HomeCursorSurface } from "../../widgets/home-cursor-surface/HomeCursorSurface";
import { useMotion } from "../../app/providers/MotionProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import { ArrowRight, Package, Briefcase } from "lucide-react";

type SearchMode = "products" | "services";

export function HomePage() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<SearchMode>("products");
  const [city, setCity] = useState(t("citySelector.almaty"));
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const navigate = useNavigate();
  const { reduced } = useMotion();
  const { state } = useAuth();

  const isAuthenticated = state.authenticated;

  const handleSearch = (query: string) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setBusy(true);
    navigate(buildRoute(ROUTES.results, {}, { query, mode, city }));
    setBusy(false);
  };

  const modeOptions: SegmentedOption<SearchMode>[] = [
    { key: "products", label: t("home.products"), icon: <Package size={15} /> },
    { key: "services", label: t("home.services"), icon: <Briefcase size={15} /> },
  ];

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
            style={{ maxWidth: "820px", gap: "clamp(0.9rem, 1.7vw, 1.4rem)" }}
          >
            <motion.div
              className="fcw-label"
              style={{ color: "var(--fcw-color-primary)" }}
              initial={reduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
{t("home.hero.tagline")}
            </motion.div>

            <motion.h1
              className="fcw-text-balance"
              style={{
                fontSize: "clamp(2rem, 5vw, 4.75rem)",
                fontWeight: "var(--fcw-font-weight-bold)",
                lineHeight: "1.03",
                letterSpacing: "0",
                fontFamily: "var(--fcw-font-body)",
                margin: 0,
              }}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
{t("home.hero.title")}
            </motion.h1>

            <motion.div
              className="fcw-w-full"
              initial={reduced ? {} : { opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ maxWidth: "760px" }}
            >
              <div className="home-search-row">
                <div className="fcw-flex-1">
                  <SearchBar onSearch={handleSearch} busy={busy} placeholder={t("home.search.placeholder")} />
                </div>
                <SegmentedControl
                  options={modeOptions}
                  value={mode}
                  onChange={setMode}
                  layoutId="homeModePill"
                  ariaLabel={t("home.search.ariaLabel")}
                  style={{ flexShrink: 0 }}
                />
                <div className="fcw-hidden-mobile">
                  <CitySelector value={city} onChange={setCity} />
                </div>
              </div>
              <div className="fcw-flex fcw-justify-center fcw-hidden-desktop" style={{ marginTop: "0.5rem" }}>
                <CitySelector value={city} onChange={setCity} compact />
              </div>
            </motion.div>

            {showAuthPrompt && !isAuthenticated && (
              <motion.div
                className="fcw-flex-col fcw-items-center"
                style={{ gap: "var(--fcw-space-sm)" }}
                initial={reduced ? {} : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="fcw-body fcw-weight-medium" style={{ color: "var(--fcw-color-primary)" }}>
                  {t("home.auth.required")}
                </p>
                <button className="fcw-btn fcw-btn-primary" onClick={() => navigate(ROUTES.auth)}>
                  {t("home.auth.login")}
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {!isAuthenticated && !showAuthPrompt && (
              <motion.div
                className="fcw-flex fcw-flex-wrap fcw-justify-center fcw-items-center"
                style={{ gap: "0.75rem" }}
                initial={reduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <span className="fcw-body-s fcw-text-tertiary">{t("home.auth.hasAccount")}</span>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => navigate(ROUTES.auth)}>
                  {t("home.auth.login")}
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <HomeCursorSurface />
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
