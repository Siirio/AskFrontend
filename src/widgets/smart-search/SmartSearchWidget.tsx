import { useTranslation } from "react-i18next";
import { MapPin, MessageCircle, Phone, Send } from "lucide-react";
import type { SearchResult } from "../../entities/search-result/model";

export function SmartSearchWidget({ results, isLoading }: { results: SearchResult[]; isLoading: boolean }) {
  const { t } = useTranslation();

  const kindLabel: Record<string, string> = {
    product: t("smartSearch.kindProduct"),
    service: t("smartSearch.kindService"),
    business: t("smartSearch.kindBusiness"),
  };

  function badgeLabel(value: string): string {
    const labels: Record<string, string> = {
      "official channel": t("smartSearch.badgeOfficial"),
      "complete card": t("smartSearch.badgeComplete"),
      pickup: t("smartSearch.badgePickup"),
      "active drop": t("smartSearch.badgeActiveDrop"),
    };
    return labels[value] ?? value;
  }

  function decisionStatusLabel(result: SearchResult): string {
    if (result.confirmationStatus === "BUSINESS_CONFIRMED") return t("smartSearch.statusConfirmed");
    if (result.confirmationStatus === "DATA_UPDATED") return t("smartSearch.statusUpdated");
    return t("smartSearch.statusNeedsConfirm");
  }

  function pickupLabel(options: SearchResult["pickupOptions"]): string {
    if (options.includes("PICKUP")) return t("smartSearch.pickup");
    if (options.includes("ONLINE")) return t("smartSearch.online");
    return t("smartSearch.pickupUnknown");
  }

  function sectionLabel(section: SearchResult["section"]): string | null {
    if (section === "OVER_BUDGET") return t("smartSearch.sectionOverBudget");
    if (section === "WRONG_CITY") return t("smartSearch.sectionWrongCity");
    if (section === "SIMILAR") return t("smartSearch.sectionSimilar");
    return null;
  }
  return (
    <section className="results-section">
      <div className="section-heading">
        <p className="eyebrow">{t("smartSearch.results")}</p>
        <h2>{t("smartSearch.subtitle")}</h2>
      </div>

      {isLoading ? <div className="empty-state">{t("smartSearch.searching")}</div> : null}

      {!isLoading && results.length === 0 ? (
        <div className="empty-state">{t("smartSearch.noMatch")}</div>
      ) : null}

      <div className="result-grid">
        {results.map((result) => (
          <article className="result-card brand-aware-card" style={{ ["--brand-accent" as string]: result.brandColor }} key={result.id}>
            <div className="result-card-head">
              <span className="kind-pill">{kindLabel[result.kind]}</span>
              {sectionLabel(result.section) ? <span className="kind-pill">{sectionLabel(result.section)}</span> : null}
              {result.badges.slice(0, 2).map(badge => <span className="trust-badge" key={badge}>{badgeLabel(badge)}</span>)}
            </div>
            <div className="brand-strip">
              <div className="brand-mark">{result.brandLogoUrl ? <img src={result.brandLogoUrl} alt="" /> : (result.businessName || result.supplierName || "A").slice(0, 1)}</div>
              <div>
                <strong>{result.businessName || result.supplierName}</strong>
                {result.brandDescriptor ? <span>{result.brandDescriptor}</span> : null}
              </div>
            </div>
            <h3>{result.title}</h3>
            <div className="supplier-line">
              <span>{result.category}</span>
              <span>{decisionStatusLabel(result)}</span>
            </div>
            {result.note ? <p>{result.note}</p> : null}
            <div className="result-meta">
              <span>{result.priceLabel ?? t("smartSearch.priceAfter")}</span>
              <span>{result.branchContext || result.branch}</span>
              <span>{pickupLabel(result.pickupOptions)}</span>
            </div>
            <div className="card-actions">
              {result.actions.includes("call") ? (
                <button aria-label={t("smartSearch.callAria")}>
                  <Phone size={17} />
                </button>
              ) : null}
              {result.actions.includes("map") ? (
                <button aria-label={t("smartSearch.mapAria")}>
                  <MapPin size={17} />
                </button>
              ) : null}
              {result.actions.includes("chat") ? (
                <button aria-label={t("smartSearch.chatAria")}>
                  <MessageCircle size={17} />
                </button>
              ) : null}
              {result.actions.includes("request") ? (
                <button className="icon-text-button">
                  <Send size={17} />
                  {t("smartSearch.confirm")}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
