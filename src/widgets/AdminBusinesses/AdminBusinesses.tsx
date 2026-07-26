import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { buildRoute, ROUTES } from "../../app/routes";
import {
  listPlatformBusinesses,
  type PlatformBusinessRowResponse,
} from "../../shared/api/platformClient";
import { Card } from "../../shared/ui/Card/Card";
import { Loading } from "../../shared/ui/Loading/Loading";

type Props = {
  onSelectBusiness: (businessId: string) => void;
};

export function AdminBusinesses({ onSelectBusiness }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<PlatformBusinessRowResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState("");

  const load = useCallback((p: number, q: string) => {
    setLoading(true);
    listPlatformBusinesses(p, 20, q || undefined)
      .then(res => {
        setItems(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page, query); }, [page, load, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    load(0, query);
  };

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.businesses.title")}</h1>
      </div>
      <form onSubmit={handleSearch} className="fcw-flex" style={{ gap: "0.5rem" }}>
        <input
          className="fcw-input"
          style={{ maxWidth: 360 }}
          value={query}
          placeholder={t("platform.businesses.search")}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="fcw-btn fcw-btn-secondary fcw-btn-sm">
          <Search size={15} />
        </button>
      </form>
      {loading ? <Loading /> : items.length === 0 ? (
        <Card padding="md">
          <p className="fcw-body-s fcw-text-secondary">{t("platform.businesses.empty")}</p>
        </Card>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("platform.businesses.columns.name")}</th>
                  <th>{t("platform.businesses.columns.email")}</th>
                  <th>{t("platform.businesses.columns.branches")}</th>
                  <th>{t("platform.businesses.columns.members")}</th>
                  <th>{t("platform.businesses.columns.products")}</th>
                  <th>{t("platform.businesses.columns.services")}</th>
                  <th>{t("platform.businesses.columns.drops")}</th>
                  <th>{t("platform.businesses.columns.catalog")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(biz => (
                  <tr
                    key={biz.businessId}
                    className="admin-table-row-clickable"
                    onClick={() => onSelectBusiness(biz.businessId)}
                  >
                    <td>
                      <span className="fcw-body-s fcw-weight-medium">{biz.name}</span>
                      {biz.legalName && (
                        <span className="fcw-body-xs fcw-text-tertiary" style={{ display: "block" }}>
                          {biz.legalName}
                        </span>
                      )}
                    </td>
                    <td className="fcw-body-xs">{biz.contactEmail || "-"}</td>
                    <td className="fcw-body-s">{biz.branchCount}</td>
                    <td className="fcw-body-s">{biz.memberCount}</td>
                    <td className="fcw-body-s">{biz.productCount}</td>
                    <td className="fcw-body-s">{biz.serviceCount}</td>
                    <td className="fcw-body-s">{biz.dropCount}</td>
                    <td>
                      <span className="fcw-body-xs fcw-text-secondary">
                        {biz.catalogStatus || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", justifyContent: "center" }}>
              <button
                className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              <span className="fcw-body-s fcw-text-secondary">
                {page + 1} / {totalPages}
              </span>
              <button
                className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
