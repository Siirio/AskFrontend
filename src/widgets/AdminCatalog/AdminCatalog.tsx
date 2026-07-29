import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  Ban,
  Package,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { ApiError } from "../../shared/api/httpClient";
import {
  applyPlatformModerationAction,
  listPlatformCatalog,
  type PlatformCatalogEntry,
  type PlatformCatalogType,
} from "../../shared/api/platformClient";
import { useToast } from "../../shared/ui/Toast/Toast";
import { PlatformSanctionDialog } from "../PlatformSanctionDialog/PlatformSanctionDialog";
import "./AdminCatalog.css";

type Props = {
  initialType: PlatformCatalogType;
  onBack: () => void;
  onEventsChanged?: () => void;
};

type PendingAction = {
  entry: PlatformCatalogEntry;
  action: "block" | "restore" | "delete";
} | null;

const TABS: Array<{ type: PlatformCatalogType; icon: typeof Package }> = [
  { type: "items", icon: Package },
  { type: "services", icon: Wrench },
  { type: "drops", icon: BadgePercent },
];

export function AdminCatalog({ initialType, onBack, onEventsChanged }: Props) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const toast = useToast();
  const [type, setType] = useState<PlatformCatalogType>(initialType);
  const [entries, setEntries] = useState<PlatformCatalogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const permissions = useMemo(
    () => new Set(state.session?.platformMembership?.permissions ?? []),
    [state.session?.platformMembership?.permissions],
  );

  const load = useCallback(() => {
    setLoading(true);
    listPlatformCatalog(type, page)
      .then(result => {
        setEntries(result.items);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
      })
      .catch(() => {
        setEntries([]);
        setTotalElements(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [page, type]);

  useEffect(load, [load]);

  const visibleEntries = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return entries;
    return entries.filter(entry =>
      entry.name.toLocaleLowerCase().includes(term)
      || entry.businessName.toLocaleLowerCase().includes(term)
      || entry.categoryLabel?.toLocaleLowerCase().includes(term),
    );
  }, [entries, query]);

  const switchType = (nextType: PlatformCatalogType) => {
    setType(nextType);
    setPage(0);
    setQuery("");
  };

  const canModerate = (entry: PlatformCatalogEntry) =>
    entry.type === "ITEM"
      ? permissions.has("MODERATE_ITEMS")
      : entry.type === "SERVICE"
        ? permissions.has("MODERATE_SERVICES")
        : permissions.has("MODERATE_UNIQUE_OFFERS");
  const canDelete = state.session?.platformMembership?.role === "SUPER_ADMIN";

  const applyAction = async (reason: string) => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      await applyPlatformModerationAction({
        targetType: pendingAction.entry.type === "ITEM"
          ? "PRODUCT"
          : pendingAction.entry.type === "SERVICE"
            ? "SERVICE"
            : "UNIQUE_OFFER",
        targetId: pendingAction.entry.id,
        action: pendingAction.action === "block"
          ? "BLOCK"
          : pendingAction.action === "restore"
            ? "UNBLOCK"
            : "REJECT",
        reasonCode: pendingAction.action === "delete"
          ? "SOFT_DELETE"
          : "PLATFORM_CATALOG_REVIEW",
        note: reason,
      });
      setPendingAction(null);
      load();
      onEventsChanged?.();
      toast.show(t("platform.sanctions.applied"), "success");
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="platform-catalog-page">
      <header className="platform-catalog-page-header">
        <div>
          <button type="button" className="platform-back-button" onClick={onBack}>
            <ArrowLeft size={16} />{t("platform.catalog.back")}
          </button>
          <h1>{t("platform.catalog.title")}</h1>
          <p>{t("platform.catalog.subtitle")}</p>
        </div>
        <strong>{t("platform.catalog.total", { count: totalElements })}</strong>
      </header>

      <div className="platform-catalog-toolbar">
        <div className="platform-catalog-page-tabs" role="tablist">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.type}
                type="button"
                role="tab"
                aria-selected={type === tab.type}
                className={type === tab.type ? "is-active" : ""}
                onClick={() => switchType(tab.type)}
              >
                <Icon size={16} />{t(`platform.catalog.tabs.${tab.type}`)}
              </button>
            );
          })}
        </div>
        <label className="platform-catalog-search">
          <Search size={16} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t("platform.catalog.search")}
          />
        </label>
      </div>

      <div className="platform-catalog-table">
        <div className="platform-catalog-table-head">
          <span>{t("platform.catalog.columns.name")}</span>
          <span>{t("platform.catalog.columns.business")}</span>
          <span>{t("platform.catalog.columns.category")}</span>
          <span>{t("platform.catalog.columns.value")}</span>
          <span>{t("platform.catalog.columns.status")}</span>
          <span />
        </div>

        {loading ? (
          <div className="platform-list-loading"><span /><span /><span /></div>
        ) : visibleEntries.length === 0 ? (
          <div className="platform-list-empty">
            <Package size={24} />
            <strong>{t("platform.catalog.empty")}</strong>
          </div>
        ) : visibleEntries.map(entry => (
          <div className="platform-catalog-table-row" key={entry.id}>
            <div>
              <strong>{entry.name}</strong>
              <small>{t(`platform.catalog.kind.${entry.type}`)}</small>
            </div>
            <span>{entry.businessName}</span>
            <span>{entry.categoryLabel || "—"}</span>
            <span>{formatValue(entry)}</span>
            <span className={`platform-status platform-status--${entry.isActive ? "active" : "blocked"}`}>
              {entry.status}
            </span>
            <div className="platform-row-actions">
              {canModerate(entry) && entry.isActive && (
                <button type="button" onClick={() => setPendingAction({ entry, action: "block" })}>
                  <Ban size={14} />{t("platform.sanctions.hideFromSearch")}
                </button>
              )}
              {canModerate(entry) && !entry.isActive && (
                <button type="button" onClick={() => setPendingAction({ entry, action: "restore" })}>
                  <RotateCcw size={14} />{t("platform.sanctions.restore.action")}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => setPendingAction({ entry, action: "delete" })}
                >
                  <Trash2 size={14} />{t("platform.sanctions.delete.action")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="platform-catalog-pagination">
          <button type="button" disabled={page === 0} onClick={() => setPage(current => current - 1)}>
            {t("platform.catalog.previous")}
          </button>
          <span>{page + 1} / {totalPages}</span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(current => current + 1)}
          >
            {t("common.next")}
          </button>
        </div>
      )}

      <PlatformSanctionDialog
        open={Boolean(pendingAction)}
        targetName={pendingAction?.entry.name || ""}
        action={pendingAction?.action || "block"}
        busy={busy}
        onClose={() => setPendingAction(null)}
        onConfirm={applyAction}
      />
    </section>
  );
}

function formatValue(entry: PlatformCatalogEntry) {
  if (entry.type === "DROP") {
    if (entry.discountPercent) return `−${entry.discountPercent}%`;
    if (entry.discountAmount) return `−${entry.discountAmount.toLocaleString()} ₸`;
    return "—";
  }
  return entry.price == null ? "—" : `${entry.price.toLocaleString()} ₸`;
}
