import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Package, Search } from "lucide-react";
import { buildRoute, ROUTES } from "../../app/routes";
import { saveActiveSearchRoute } from "../../entities/search-session/model/activeSearchSession";

type SearchMode = "ITEM" | "SERVICE";

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<SearchMode>("ITEM");
  const [query, setQuery] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const rawQuery = query.trim();
    if (!rawQuery) return;
    const city = window.localStorage.getItem("ask.city") || t("citySelector.almaty");
    const route = buildRoute(ROUTES.results, {}, {
      query: rawQuery,
      mode,
      city,
    });
    saveActiveSearchRoute(route, window.sessionStorage);
    navigate(route);
  };

  return (
    <main id="main-content" className="ask-home">
      <section className="ask-home__hero">
        <div className="ask-home__copy">
          <h1>{t("home.hero.title")}</h1>
          <p>{t("home.hero.tagline")}</p>
        </div>

        <form className="ask-home__search-card" onSubmit={submit}>
          <div className="ask-home__modes" role="tablist" aria-label={t("home.search.ariaLabel")}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ITEM"}
              className={mode === "ITEM" ? "is-active" : ""}
              onClick={() => setMode("ITEM")}
            >
              <Package size={20} />
              {t("home.products")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "SERVICE"}
              className={mode === "SERVICE" ? "is-active" : ""}
              onClick={() => setMode("SERVICE")}
            >
              <BriefcaseBusiness size={20} />
              {t("home.services")}
            </button>
          </div>

          <div className="ask-home__query">
            <Search size={25} aria-hidden="true" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t("home.search.placeholder")}
              aria-label={t("home.search.ariaLabel")}
            />
            <button type="submit" disabled={!query.trim()}>
              {t("home.cta")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
