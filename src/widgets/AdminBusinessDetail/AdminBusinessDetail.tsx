import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Building2, MapPin, RotateCcw, Trash2, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { ApiError } from "../../shared/api/httpClient";
import {
  applyPlatformModerationAction,
  getPlatformBusinessDetail,
  listPlatformBusinessItems,
  listPlatformBusinessServices,
  type PlatformBusinessDetailResponse,
} from "../../shared/api/platformClient";
import type { BusinessProductDto, BusinessServiceDto } from "../../shared/api/dto";
import { Loading } from "../../shared/ui/Loading/Loading";
import { useToast } from "../../shared/ui/Toast/Toast";
import { PlatformSanctionDialog } from "../PlatformSanctionDialog/PlatformSanctionDialog";
import "./AdminBusinessDetail.css";

type Props = {
  businessId: string;
  onBack: () => void;
  onOpenChat: (businessId: string) => void;
  onEventsChanged?: () => void;
};

type Tab = "items" | "services";

type SanctionTarget = {
  type: "PRODUCT" | "SERVICE" | "BUSINESS";
  id: string;
  name: string;
  action: "block" | "restore" | "delete";
} | null;

export function AdminBusinessDetail({ businessId, onBack, onEventsChanged }: Props) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const toast = useToast();
  const permissions = useMemo(
    () => new Set(state.session?.platformMembership?.permissions ?? []),
    [state.session?.platformMembership?.permissions],
  );
  const [detail, setDetail] = useState<PlatformBusinessDetailResponse | null>(null);
  const [items, setItems] = useState<BusinessProductDto[]>([]);
  const [services, setServices] = useState<BusinessServiceDto[]>([]);
  const [tab, setTab] = useState<Tab>("items");
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [sanction, setSanction] = useState<SanctionTarget>(null);
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(() => {
    setLoading(true);
    getPlatformBusinessDetail(businessId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [businessId]);

  const loadCatalog = useCallback(() => {
    setCatalogLoading(true);
    const request = tab === "items"
      ? listPlatformBusinessItems(businessId).then(response => setItems(response.items))
      : listPlatformBusinessServices(businessId).then(response => setServices(response.items));
    request.catch(() => {
      if (tab === "items") setItems([]);
      else setServices([]);
    }).finally(() => setCatalogLoading(false));
  }, [businessId, tab]);

  useEffect(loadDetail, [loadDetail]);
  useEffect(loadCatalog, [loadCatalog]);

  const canModerateItems = permissions.has("MODERATE_ITEMS") || permissions.has("MODERATE_CONTENT");
  const canModerateServices = permissions.has("MODERATE_SERVICES") || permissions.has("MODERATE_CONTENT");
  const canModerateBusiness = permissions.has("MODERATE_BUSINESSES") || permissions.has("MODERATE_CONTENT");
  const canSoftDelete = permissions.has("MANAGE_PLATFORM_USERS");

  const applySanction = async (reason: string) => {
    if (!sanction) return;
    setBusy(true);
    try {
      await applyPlatformModerationAction({
        targetType: sanction.type,
        targetId: sanction.id,
        action: sanction.action === "block"
          ? "BLOCK"
          : sanction.action === "restore"
            ? "UNBLOCK"
            : "REJECT",
        reasonCode: sanction.action === "delete" ? "SOFT_DELETE" : "PLATFORM_REVIEW",
        note: reason,
      });
      toast.show(t("platform.sanctions.applied"), "success");
      setSanction(null);
      loadCatalog();
      loadDetail();
      onEventsChanged?.();
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  if (!detail) {
    return (
      <div className="platform-list-empty">
        <Building2 size={25} />
        <strong>{t("platform.businessDetail.notFound")}</strong>
        <button type="button" onClick={onBack}>{t("platform.businessDetail.back")}</button>
      </div>
    );
  }

  const rows = tab === "items" ? items : services;

  return (
    <section className="platform-business-detail">
      <header className="platform-detail-header">
        <button type="button" className="platform-back-button" onClick={onBack}>
          <ArrowLeft size={17} />{t("platform.businessDetail.back")}
        </button>
        <div className="platform-detail-title">
          <span><Building2 size={21} /></span>
          <div>
            <h1>{detail.name}</h1>
            <p>{detail.legalName || t("platform.businessDetail.noLegalName")}</p>
          </div>
        </div>
        <div className="platform-detail-actions">
          {canModerateBusiness && (
            <>
              <button type="button" onClick={() => setSanction({ type: "BUSINESS", id: businessId, name: detail.name, action: "block" })}>
                <Ban size={15} />{t("platform.sanctions.blockBusiness")}
              </button>
              <button type="button" onClick={() => setSanction({ type: "BUSINESS", id: businessId, name: detail.name, action: "restore" })}>
                <RotateCcw size={15} />{t("platform.sanctions.restore.action")}
              </button>
            </>
          )}
          {canSoftDelete && (
            <button
              type="button"
              className="is-danger"
              onClick={() => setSanction({ type: "BUSINESS", id: businessId, name: detail.name, action: "delete" })}
            >
              <Trash2 size={15} />{t("platform.sanctions.delete.action")}
            </button>
          )}
        </div>
      </header>

      <div className="platform-business-facts">
        <div>
          <MapPin size={17} />
          <span>{t("platform.businesses.columns.branches")}</span>
          <strong>{detail.branchCount}</strong>
        </div>
        <div>
          <UsersRound size={17} />
          <span>{t("platform.businesses.columns.members")}</span>
          <strong>{detail.memberCount}</strong>
        </div>
        <div>
          <span>{t("platform.businessDetail.scope")}</span>
          <strong>{detail.businessScope}</strong>
        </div>
        <div>
          <span>{t("platform.businessDetail.country")}</span>
          <strong>{detail.countryCode}</strong>
        </div>
      </div>

      <div className="platform-catalog-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "items"}
          className={tab === "items" ? "is-active" : ""}
          onClick={() => setTab("items")}
        >
          {t("platform.businessDetail.products")} <span>{detail.productCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "services"}
          className={tab === "services" ? "is-active" : ""}
          onClick={() => setTab("services")}
        >
          {t("platform.businessDetail.services")} <span>{detail.serviceCount}</span>
        </button>
      </div>

      <div className="platform-catalog-surface">
        <div className="platform-catalog-head">
          <span>{t("platform.businessDetail.catalogName")}</span>
          <span>{t("platform.businessDetail.category")}</span>
          <span>{t("platform.businessDetail.price")}</span>
          <span>{t("platform.businessDetail.visibility")}</span>
          <span />
        </div>

        {catalogLoading ? (
          <div className="platform-list-loading"><span /><span /><span /></div>
        ) : rows.length === 0 ? (
          <div className="platform-list-empty">
            <strong>{t("platform.businessDetail.catalogEmpty")}</strong>
            <p>{t("platform.businessDetail.catalogEmptyHint")}</p>
          </div>
        ) : tab === "items" ? items.map(item => (
          <CatalogRow
            key={item.productId}
            name={item.name}
            category={item.categoryLabel}
            price={item.price}
            active={item.isActive}
            canModerate={canModerateItems}
            canSoftDelete={canSoftDelete}
            onAction={action => setSanction({ type: "PRODUCT", id: item.productId, name: item.name, action })}
          />
        )) : services.map(service => (
          <CatalogRow
            key={service.serviceOfferingId}
            name={service.name}
            category={service.categoryLabel}
            price={service.basePrice}
            active={service.isActive}
            canModerate={canModerateServices}
            canSoftDelete={canSoftDelete}
            onAction={action => setSanction({ type: "SERVICE", id: service.serviceOfferingId, name: service.name, action })}
          />
        ))}
      </div>

      <PlatformSanctionDialog
        open={Boolean(sanction)}
        targetName={sanction?.name || ""}
        action={sanction?.action || "block"}
        busy={busy}
        onClose={() => setSanction(null)}
        onConfirm={applySanction}
      />
    </section>
  );
}
function CatalogRow({
  name,
  category,
  price,
  active,
  canModerate,
  canSoftDelete,
  onAction,
}: {
  name: string;
  category: string | null;
  price: number;
  active: boolean;
  canModerate: boolean;
  canSoftDelete: boolean;
  onAction: (action: "block" | "restore" | "delete") => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="platform-catalog-row">
      <strong>{name}</strong>
      <span>{category || "—"}</span>
      <span>{price != null ? `${price.toLocaleString()} ₸` : "—"}</span>
      <span className={`platform-status platform-status--${active ? "active" : "blocked"}`}>
        {t(active ? "platform.businessDetail.inSearch" : "platform.businessDetail.outOfSearch")}
      </span>
      <div className="platform-row-actions">
        {canModerate && active && (
          <button type="button" onClick={() => onAction("block")}>
            <Ban size={14} />{t("platform.sanctions.hideFromSearch")}
          </button>
        )}
        {canModerate && !active && (
          <button type="button" onClick={() => onAction("restore")}>
            <RotateCcw size={14} />{t("platform.sanctions.restore.action")}
          </button>
        )}
        {canSoftDelete && (
          <button type="button" className="is-danger" onClick={() => onAction("delete")}>
            <Trash2 size={14} />{t("platform.sanctions.delete.action")}
          </button>
        )}
      </div>
    </div>
  );
}
