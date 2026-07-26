import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getPlatformBusinessDetail, createPlatformBusinessProduct, deletePlatformProduct,
  type PlatformBusinessDetailResponse,
} from "../../shared/api/platformClient";
import type { BusinessProductDto, BusinessServiceDto } from "../../shared/api/dto";
import { apiRequest } from "../../shared/api/httpClient";
import { Card } from "../../shared/ui/Card/Card";
import { Modal } from "../../shared/ui/Modal/Modal";
import { Loading } from "../../shared/ui/Loading/Loading";
import { useToast } from "../../shared/ui/Toast/Toast";
import { ApiError } from "../../shared/api/httpClient";

type Props = {
  businessId: string;
  onBack: () => void;
  onOpenChat: (businessId: string) => void;
};

type Tab = "products" | "services" | "drops";

export function AdminBusinessDetail({ businessId, onBack, onOpenChat }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [detail, setDetail] = useState<PlatformBusinessDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<BusinessProductDto[]>([]);
  const [services, setServices] = useState<BusinessServiceDto[]>([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", categoryLabel: "" });
  const [addBusy, setAddBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);

  useEffect(() => {
    getPlatformBusinessDetail(businessId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (tab === "products") {
      apiRequest<{ items: BusinessProductDto[] }>(`/api/v1/platform/businesses/${businessId}/products?page=0&size=50`, { auth: true })
        .then(res => setProducts(res.items ?? []))
        .catch(() => setProducts([]));
    }
    if (tab === "services") {
      apiRequest<{ items: BusinessServiceDto[] }>(`/api/v1/platform/businesses/${businessId}/services?page=0&size=50`, { auth: true })
        .then(res => setServices((res as { items: BusinessServiceDto[] }).items ?? []))
        .catch(() => setServices([]));
    }
  }, [tab, businessId]);

  if (loading) return <Loading />;
  if (!detail) {
    return (
      <Card padding="md">
        <p className="fcw-body-s fcw-text-secondary">{t("platform.businessDetail.notFound")}</p>
      </Card>
    );
  }

  const handleAddProduct = async () => {
    if (!addForm.name.trim()) return;
    setAddBusy(true);
    try {
      await createPlatformBusinessProduct(businessId, addForm);
      toast.show(t("platform.businessDetail.productAdded"), "success");
      setShowAddProduct(false);
      setAddForm({ name: "", description: "", categoryLabel: "" });
      const res = await apiRequest<{ items: BusinessProductDto[] }>(
        `/api/v1/platform/businesses/${businessId}/products?page=0&size=50`, { auth: true });
      setProducts(res.items ?? []);
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setAddBusy(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeleteBusy(productId);
    try {
      await deletePlatformProduct(productId);
      setProducts(prev => prev.filter(p => p.productId !== productId));
      toast.show(t("platform.businessDetail.productDeleted"), "success");
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setDeleteBusy(null);
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "products", label: t("platform.businessDetail.products"), count: detail.productCount },
    { key: "services", label: t("platform.businessDetail.services"), count: detail.serviceCount },
    { key: "drops", label: t("platform.businessDetail.drops"), count: detail.dropCount },
  ];

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
        <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="fcw-h2" style={{ margin: 0 }}>{detail.name}</h1>
          {detail.legalName && (
            <p className="fcw-body-s fcw-text-secondary">{detail.legalName}</p>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => onOpenChat(businessId)}>
          <MessageCircle size={15} />
          {t("platform.businessDetail.openChat")}
        </button>
      </div>

      <Card padding="lg">
        <div className="fcw-flex fcw-flex-wrap" style={{ gap: "1rem" }}>
          <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 120 }}>
            <span className="fcw-body-xs fcw-text-tertiary">{t("platform.businesses.columns.branches")}</span>
            <span className="fcw-body fcw-weight-semibold">{detail.branchCount}</span>
          </div>
          <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 120 }}>
            <span className="fcw-body-xs fcw-text-tertiary">{t("platform.businesses.columns.members")}</span>
            <span className="fcw-body fcw-weight-semibold">{detail.memberCount}</span>
          </div>
          {detail.bin && (
            <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 120 }}>
              <span className="fcw-body-xs fcw-text-tertiary">БИН</span>
              <span className="fcw-body-s">{detail.bin}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="fcw-flex" style={{ gap: "0.25rem" }}>
        {tabs.map(tabItem => (
          <button
            key={tabItem.key}
            className={`fcw-btn fcw-btn-sm ${tab === tabItem.key ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
            onClick={() => setTab(tabItem.key)}
          >
            {tabItem.label} ({tabItem.count})
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
          <div className="fcw-flex-between">
            <span className="fcw-body-s fcw-text-secondary">
              {products.length} {t("platform.businessDetail.products").toLowerCase()}
            </span>
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowAddProduct(true)}>
              <Plus size={14} />
              {t("platform.businessDetail.addProduct")}
            </button>
          </div>
          {products.map(p => (
            <Card key={p.productId} padding="md">
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
                  <span className="fcw-body-s fcw-weight-medium">{p.name}</span>
                  <span className="fcw-body-xs fcw-text-tertiary">
                    {p.categoryLabel || "-"} · {p.price != null ? `${p.price} ₸` : "-"}
                  </span>
                </div>
                <button
                  className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                  disabled={deleteBusy === p.productId}
                  onClick={() => handleDeleteProduct(p.productId)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "services" && (
        <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
          {services.map(s => (
            <Card key={s.serviceOfferingId} padding="md">
              <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                <span className="fcw-body-s fcw-weight-medium">{s.name}</span>
                <span className="fcw-body-xs fcw-text-tertiary">
                  {s.categoryLabel || "-"} · {s.basePrice != null ? `${s.basePrice} ₸` : "-"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "drops" && (
        <Card padding="md">
          <p className="fcw-body-s fcw-text-secondary">
            {t("platform.businessDetail.drops")}: {detail.dropCount}
          </p>
        </Card>
      )}

      {showAddProduct && (
        <Modal open onClose={() => setShowAddProduct(false)}>
          <div className="fcw-flex-col" style={{ gap: "1rem", padding: "1rem", minWidth: 320 }}>
            <h3 className="fcw-h3" style={{ margin: 0 }}>{t("platform.businessDetail.addProductTitle")}</h3>
            <input
              className="fcw-input"
              placeholder={t("platform.businessDetail.productName")}
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="fcw-input"
              placeholder={t("platform.businessDetail.productCategory")}
              value={addForm.categoryLabel}
              onChange={e => setAddForm(f => ({ ...f, categoryLabel: e.target.value }))}
            />
            <textarea
              className="fcw-input"
              rows={2}
              placeholder={t("platform.businessDetail.productDescription")}
              value={addForm.description}
              onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
            />
            <div className="fcw-flex" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="fcw-btn fcw-btn-secondary" onClick={() => setShowAddProduct(false)}>
                {t("platform.users.cancel")}
              </button>
              <button className="fcw-btn fcw-btn-primary" disabled={addBusy || !addForm.name.trim()} onClick={handleAddProduct}>
                {t("platform.users.save")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
