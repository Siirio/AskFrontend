import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listPlatformBusinesses,
  type PlatformBusinessRowResponse,
} from "../../shared/api/platformClient";
import { AdminBusinessDetail } from "../AdminBusinessDetail/AdminBusinessDetail";
import "./AdminBusinesses.css";

type Props = {
  onEventsChanged: () => void;
};

export function AdminBusinesses({ onEventsChanged }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<PlatformBusinessRowResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    listPlatformBusinesses(page, 24, query.trim() || undefined)
      .then(response => {
        setItems(response.items);
        setTotalPages(response.totalPages);
      })
      .catch(() => {
        setItems([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [page, query]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (selectedId) {
    return (
      <AdminBusinessDetail
        businessId={selectedId}
        onBack={() => setSelectedId(null)}
        onOpenChat={() => undefined}
        onEventsChanged={() => {
          onEventsChanged();
          load();
        }}
      />
    );
  }

  return (
    <section className="platform-businesses">
      <header className="platform-page-header">
        <div>
          <h1>{t("platform.sections.businesses")}</h1>
          <p>{t("platform.businesses.subtitle")}</p>
        </div>
      </header>

      <div className="platform-list-toolbar">
        <label className="platform-search-field">
          <Search size={17} />
          <input
            value={query}
            placeholder={t("platform.businesses.search")}
            onChange={event => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <span className="platform-businesses-count">
          {t("platform.businesses.onPage", { count: items.length })}
        </span>
      </div>

      <div className="platform-business-list">
        <div className="platform-business-head">
          <span>{t("platform.businesses.columns.name")}</span>
          <span>{t("platform.businesses.columns.catalog")}</span>
          <span>{t("platform.businesses.columns.branches")}</span>
          <span>{t("platform.businesses.columns.members")}</span>
          <span />
        </div>

        {loading ? (
          <div className="platform-list-loading"><span /><span /><span /><span /></div>
        ) : failed ? (
          <div className="platform-list-empty">
            <ShieldAlert size={24} />
            <strong>{t("platform.businesses.loadError")}</strong>
            <button type="button" onClick={load}>{t("platform.accounts.retry")}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="platform-list-empty">
            <Building2 size={25} />
            <strong>{t("platform.businesses.empty")}</strong>
            <p>{t("platform.businesses.emptyHint")}</p>
          </div>
        ) : items.map(business => {
          const reviewRequired = business.catalogStatus === "REVIEW_REQUIRED";
          return (
            <button
              type="button"
              className="platform-business-row"
              key={business.businessId}
              onClick={() => setSelectedId(business.businessId)}
            >
              <span className="platform-business-identity">
                <span><Store size={17} /></span>
                <span>
                  <strong>{business.name}</strong>
                  <small>{business.legalName || business.contactEmail || "—"}</small>
                </span>
              </span>
              <span className={reviewRequired ? "platform-risk-label is-review" : "platform-risk-label"}>
                {reviewRequired && <ShieldAlert size={13} />}
                {t(`platform.businesses.catalogStatus.${business.catalogStatus || "ACTIVE"}`)}
              </span>
              <span>{business.branchCount}</span>
              <span>{business.memberCount}</span>
              <span className="platform-business-catalog-counts">
                {business.productCount} / {business.serviceCount}
                <ChevronRight size={16} />
              </span>
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="platform-pagination">
          <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>
            <ChevronLeft size={16} />{t("common.previous")}
          </button>
          <span>{page + 1} / {totalPages}</span>
          <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(value => value + 1)}>
            {t("common.next")}<ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
