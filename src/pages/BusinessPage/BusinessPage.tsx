import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Briefcase, Building2, UserRound,
  Sparkles, Plus, RefreshCw, Loader2,
  ChevronDown, ChevronRight, Menu, X, MapPin, Trash2, Edit3, Check, Clock3, Layout,
  Grid3X3, List, Calendar, Upload
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { DropsEditor } from "../../widgets/DropsEditor/DropsEditor";
import { ProfileEditor } from "../../widgets/ProfileEditor/ProfileEditor";
import { BusinessCardBuilder } from "../../widgets/BusinessCardBuilder/BusinessCardBuilder";
import type { CardBlock } from "../../widgets/BusinessCardBuilder/types";
import {
  getBrandProfile, listDrops,
  updateBrandProfile,
  createDrop, cancelDrop, deleteDrop,
  listProducts, createProduct, updateProduct, deleteProduct,
  listServices, createService, updateService,
  listBranches, createBranch, updateBranch,
  getSupplierTasks,
  getBusinessCard, saveBusinessCard, publishBusinessCard,
} from "../../shared/api/askClient";
import type {
  BrandProfileDto, BrandDropDto,
  BusinessProductDto, BusinessServiceDto,
} from "../../shared/api/dto";
import { ApiError } from "../../shared/api/httpClient";
import { ROUTES } from "../../app/routes";

type BusinessSection = "overview" | "products" | "services" | "branches" | "events" | "business-card" | "profile" | "import";
type ProfileSubtab = "brand";

interface BranchInfo {
  id: string;
  businessId: string;
  cityId: string;
  cityName: string;
  name: string;
  address: string;
  onlineOnly: boolean;
  status: string;
}

const sidebarItems: { key: BusinessSection; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Обзор", icon: <Layout size={18} /> },
  { key: "products", label: "Товары", icon: <Package size={18} /> },
  { key: "services", label: "Услуги", icon: <Briefcase size={18} /> },
  { key: "branches", label: "Филиалы", icon: <Building2 size={18} /> },
  { key: "events", label: "Ивенты", icon: <Calendar size={18} /> },
  { key: "business-card", label: "Визитка", icon: <Sparkles size={18} /> },
  { key: "profile", label: "Профиль", icon: <UserRound size={18} /> },
];

const profileSubtabs: { key: ProfileSubtab; label: string; icon: React.ReactNode }[] = [
  { key: "brand", label: "Бренд", icon: <UserRound size={14} /> },
];

const DEFAULT_BRAND_COLOR = "#e8824e";

function emptyProfile(businessId: string): BrandProfileDto {
  return {
    businessId,
    brandColor: DEFAULT_BRAND_COLOR,
    logoUrl: "",
    coverUrl: "",
    toneOfVoice: "",
    description: "",
    instagramUrl: "",
    telegramUrl: "",
    websiteUrl: "",
  };
}

export function BusinessPage() {
  const { state } = useAuth();
  const { reduced } = useMotion();
  const [section, setSection] = useState<BusinessSection>("overview");
  const [profileSubtab, setProfileSubtab] = useState<ProfileSubtab>("brand");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const businessId = state.session?.business?.businessId || "";
  const isStaff = state.view === "staff";

  // Shared state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<BrandProfileDto>(() => emptyProfile(businessId));
  const [drops, setDrops] = useState<BrandDropDto[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [cardBlocks, setCardBlocks] = useState<CardBlock[]>([]);
  const [cardPublishedAt, setCardPublishedAt] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<BusinessProductDto[]>([]);
  const [productsPage, setProductsPage] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<BusinessProductDto | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", categoryId: "" });
  const [productsBusy, setProductsBusy] = useState(false);

  // Services
  const [services, setServices] = useState<BusinessServiceDto[]>([]);
  const [servicesBusy, setServicesBusy] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editService, setEditService] = useState<BusinessServiceDto | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", basePrice: "", durationMinutes: "", categoryId: "" });

  // Branches
  const [branchesBusy, setBranchesBusy] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", cityId: "" });

  // Overview
  const [taskCount, setTaskCount] = useState(0);

  const activeBranchId = branches.length > 0 ? branches[0].id : "";

  const loadCoreData = useCallback(async () => {
    if (!businessId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const [profileRes, dropsRes, branchesRes] = await Promise.allSettled([
        getBrandProfile(businessId),
        listDrops(businessId),
        listBranches(businessId),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (dropsRes.status === "fulfilled") setDrops(dropsRes.value);
      if (branchesRes.status === "fulfilled") setBranches(branchesRes.value);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
    }
  }, [businessId]);

  const loadProducts = useCallback(async () => {
    if (!activeBranchId) return;
    setProductsBusy(true);
    try {
      const res = await listProducts(activeBranchId, { page: productsPage, size: 20 });
      setProducts(res.items);
      setProductsTotal(res.totalElements);
    } catch { /* empty */ } finally {
      setProductsBusy(false);
    }
  }, [activeBranchId, productsPage]);

  const loadServices = useCallback(async () => {
    if (!activeBranchId) return;
    setServicesBusy(true);
    try {
      const res = await listServices(activeBranchId, { page: 0, size: 20 });
      setServices(res.items);
    } catch { /* empty */ } finally {
      setServicesBusy(false);
    }
  }, [activeBranchId]);

  const loadBranches = useCallback(async () => {
    if (!businessId) return;
    setBranchesBusy(true);
    try {
      const res = await listBranches(businessId);
      setBranches(res);
    } catch { /* empty */ } finally {
      setBranchesBusy(false);
    }
  }, [businessId]);

  const loadTasks = useCallback(async () => {
    if (!activeBranchId) return;
    try {
      const tasks = await getSupplierTasks(activeBranchId);
      setTaskCount(tasks.length);
    } catch { setTaskCount(0); }
  }, [activeBranchId]);

  useEffect(() => { loadCoreData(); }, [loadCoreData]);
  useEffect(() => { if (section === "products" || section === "overview") loadProducts(); }, [section, loadProducts]);
  useEffect(() => { if (section === "services" || section === "overview") loadServices(); }, [section, loadServices]);
  useEffect(() => { if (section === "branches") loadBranches(); }, [section, loadBranches]);
  useEffect(() => { if (section === "overview") loadTasks(); }, [section, loadTasks]);

  if (state.view !== "business" && state.view !== "staff") {
    return <Navigate to={ROUTES.home} replace />;
  }

  const handleSaveProfile = async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      const saved = await updateBrandProfile(businessId, profile);
      setProfile(saved);
      setNotice("Профиль сохранен.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDrop = async (data: Partial<BrandDropDto>) => {
    if (!businessId) return;
    const created = await createDrop(businessId, data);
    setDrops([created, ...drops]);
    setNotice("Дроп создан.");
  };

  const handleCancelDrop = async (drop: BrandDropDto) => {
    if (!businessId) return;
    const updated = await cancelDrop(businessId, drop.id);
    setDrops(drops.map(d => d.id === updated.id ? updated : d));
  };

  const handleDeleteDrop = async (drop: BrandDropDto) => {
    if (!businessId) return;
    await deleteDrop(businessId, drop.id);
    setDrops(drops.filter(d => d.id !== drop.id));
  };

  const loadCard = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await getBusinessCard(businessId);
      setCardBlocks(res.blocks as unknown as CardBlock[]);
      setCardPublishedAt(res.publishedAt || null);
    } catch { /* card not created yet */ }
  }, [businessId]);

  const handleSaveCard = async (blocks: CardBlock[]) => {
    if (!businessId) return;
    const res = await saveBusinessCard(businessId, blocks as unknown as import("../../shared/api/dto").BusinessCardBlockDto[]);
    setCardBlocks(res.blocks as unknown as CardBlock[]);
    setCardPublishedAt(res.publishedAt || null);
    setNotice("Визитка сохранена.");
  };

  const handlePublishCard = async () => {
    if (!businessId) return;
    const res = await publishBusinessCard(businessId);
    setCardBlocks(res.blocks as unknown as CardBlock[]);
    setCardPublishedAt(res.publishedAt || null);
    setNotice("Визитка опубликована.");
  };

  useEffect(() => { if (section === "business-card") loadCard(); }, [section, loadCard]);

  // Product CRUD
  const resetProductForm = () => {
    setProductForm({ name: "", description: "", price: "", categoryId: "" });
    setEditProduct(null);
    setShowProductForm(false);
  };

  const handleCreateProduct = async () => {
    if (!activeBranchId || !productForm.name) return;
    try {
      await createProduct(activeBranchId, {
        name: productForm.name,
        description: productForm.description || undefined,
        price: productForm.price ? Number(productForm.price) : undefined,
        categoryId: productForm.categoryId || "default",
      });
      resetProductForm();
      loadProducts();
      setNotice("Товар добавлен.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка создания товара");
    }
  };

  const handleUpdateProduct = async () => {
    if (!activeBranchId || !editProduct) return;
    try {
      await updateProduct(activeBranchId, editProduct.productOfferId, {
        name: productForm.name || undefined,
        description: productForm.description || undefined,
        price: productForm.price ? Number(productForm.price) : undefined,
      });
      resetProductForm();
      loadProducts();
      setNotice("Товар обновлен.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка обновления");
    }
  };

  const handleDeleteProduct = async (product: BusinessProductDto) => {
    if (!activeBranchId) return;
    try {
      await deleteProduct(activeBranchId, product.productOfferId);
      loadProducts();
      setNotice("Товар удален.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка удаления");
    }
  };

  const openEditProduct = (p: BusinessProductDto) => {
    setEditProduct(p);
    setProductForm({
      name: p.name,
      description: p.description || "",
      price: p.price ? String(p.price) : "",
      categoryId: p.categoryId || "",
    });
    setShowProductForm(true);
  };

  // Service CRUD
  const resetServiceForm = () => {
    setServiceForm({ name: "", description: "", basePrice: "", durationMinutes: "", categoryId: "" });
    setEditService(null);
    setShowServiceForm(false);
  };

  const handleCreateService = async () => {
    if (!activeBranchId || !serviceForm.name) return;
    try {
      await createService(activeBranchId, {
        categoryId: serviceForm.categoryId || "default",
        name: serviceForm.name,
        description: serviceForm.description || undefined,
        basePrice: serviceForm.basePrice ? Number(serviceForm.basePrice) : undefined,
        durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : undefined,
      });
      resetServiceForm();
      loadServices();
      setNotice("Услуга добавлена.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка создания услуги");
    }
  };

  const handleUpdateService = async () => {
    if (!activeBranchId || !editService) return;
    try {
      await updateService(activeBranchId, editService.serviceBranchOfferId, {
        name: serviceForm.name || undefined,
        description: serviceForm.description || undefined,
        basePrice: serviceForm.basePrice ? Number(serviceForm.basePrice) : undefined,
        durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : undefined,
      });
      resetServiceForm();
      loadServices();
      setNotice("Услуга обновлена.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка обновления");
    }
  };

  const openEditService = (s: BusinessServiceDto) => {
    setEditService(s);
    setServiceForm({
      name: s.name,
      description: s.description || "",
      basePrice: s.basePrice ? String(s.basePrice) : "",
      durationMinutes: s.durationMinutes ? String(s.durationMinutes) : "",
      categoryId: s.categoryId || "",
    });
    setShowServiceForm(true);
  };

  // Branch CRUD
  const handleCreateBranch = async () => {
    if (!businessId || !branchForm.name) return;
    try {
      await createBranch(businessId, {
        name: branchForm.name,
        address: branchForm.address || undefined,
        cityId: branchForm.cityId || undefined,
      });
      setBranchForm({ name: "", address: "", cityId: "" });
      setShowBranchForm(false);
      loadBranches();
      setNotice("Филиал создан.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка создания филиала");
    }
  };

  const sidebar = (
    <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "var(--fcw-space-sm)" }}>
      {sidebarItems.map(item => (
        <button
          key={item.key}
          className="fcw-btn fcw-btn-ghost fcw-btn-sm"
          style={{
            justifyContent: "flex-start",
            gap: "0.625rem",
            width: "100%",
            color: section === item.key ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
            fontWeight: section === item.key ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
            backgroundColor: section === item.key ? "color-mix(in srgb, var(--fcw-color-primary) 8%, transparent)" : "transparent",
            borderRadius: "var(--fcw-radius-md)",
            padding: "0.5rem 0.75rem",
          }}
          onClick={() => { setSection(item.key); setSidebarOpen(false); }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <main id="main-content">
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* Desktop sidebar */}
        <aside
          className="fcw-hidden-mobile"
          style={{
            width: "220px",
            flexShrink: 0,
            borderRight: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
            backgroundColor: "var(--fcw-color-surface)",
            paddingTop: "var(--fcw-space-md)",
          }}
        >
          {sidebar}
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                className="fcw-hidden-desktop fcw-fixed fcw-z-overlay"
                style={{ inset: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                className="fcw-hidden-desktop fcw-fixed fcw-z-modal"
                style={{
                  top: 0, left: 0, bottom: 0, width: "260px",
                  backgroundColor: "var(--fcw-color-surface)",
                  borderRight: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                  paddingTop: "var(--fcw-space-lg)",
                }}
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fcw-container" style={{ paddingTop: "var(--fcw-space-md)", paddingBottom: "var(--fcw-space-section)" }}>
            {/* Mobile section selector */}
            <div className="fcw-hidden-desktop fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)", gap: "0.5rem" }}>
              <button className="fcw-btn fcw-btn-ghost fcw-btn-icon" onClick={() => setSidebarOpen(true)} aria-label="Меню">
                <Menu size={20} />
              </button>
              <div className="fcw-flex fcw-items-center" style={{ gap: "0.375rem", overflow: "hidden" }}>
                {sidebarItems.map(item => (
                  <button
                    key={item.key}
                    className="fcw-btn fcw-btn-sm"
                    style={{
                      color: section === item.key ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                      fontWeight: section === item.key ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                      background: section === item.key ? "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)" : "transparent",
                      borderRadius: "var(--fcw-radius-full)",
                      padding: "0.25rem 0.625rem",
                      fontSize: "var(--fcw-font-size-body-s)",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => setSection(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Header */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "1rem", marginBottom: "var(--fcw-space-lg)" }}>
                <div>
                  <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>
                      {isStaff ? "Сотрудник" : "Владелец"}
                    </span>
                  </div>
                  <h1 className="fcw-h1" style={{ margin: 0 }}>
                    {state.session?.business?.businessName || "Кабинет компании"}
                  </h1>
                  <p className="fcw-body fcw-text-secondary" style={{ margin: "0.5rem 0 0 0" }}>
                    {sidebarItems.find(s => s.key === section)?.label}
                  </p>
                </div>
                <button className="fcw-btn fcw-btn-secondary" onClick={loadCoreData} disabled={busy || !businessId}>
                  {busy ? <Loader2 className="fcw-animate-spin" size={16} /> : <RefreshCw size={16} />}
                  Синхронизировать
                </button>
              </div>

              {error && (
                <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)", marginBottom: "var(--fcw-space-md)" }}>
                  {error}
                </div>
              )}
              {notice && (
                <div className="fcw-body-s" style={{ color: "var(--fcw-color-accent)", marginBottom: "var(--fcw-space-md)" }}>
                  {notice}
                </div>
              )}

              <motion.div
                key={section + (section === "profile" ? profileSubtab : "")}
                initial={reduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Overview */}
                {section === "overview" && (
                  <>
                    {/* Collapsible stat strip */}
                    <div style={{ marginBottom: "var(--fcw-space-lg)" }}>
                      <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-sm)" }}>
                        <span className="fcw-body-l fcw-weight-semibold">Показатели</span>
                      </div>
                      <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                        {[
                          { label: "Запросы", value: taskCount, color: "var(--fcw-color-primary)" },
                          { label: "Филиалы", value: branches.length, color: "var(--fcw-blue-500)" },
                          { label: "Товары", value: productsTotal || 0, color: "var(--fcw-color-accent)" },
                          { label: "Ивенты", value: drops.filter(d => d.status === "ACTIVE").length, color: "var(--fcw-amber-500)" },
                        ].map(stat => (
                          <div
                            key={stat.label}
                            style={{
                              flex: "1 1 120px",
                              minWidth: 120,
                              padding: "1rem",
                              backgroundColor: "var(--fcw-color-surface)",
                              borderRadius: "var(--fcw-radius-lg)",
                              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            }}
                          >
                            <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", marginBottom: "0.25rem" }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: stat.color, flexShrink: 0 }} />
                              <span className="fcw-body-s fcw-text-secondary">{stat.label}</span>
                            </div>
                            <span className="fcw-h2" style={{ margin: 0 }}>{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dashboard: left content + right actions */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "var(--fcw-space-lg)", alignItems: "start" }}>
                      {/* Left column: products + services preview */}
                      <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                        {/* Products preview */}
                        <Card padding="lg">
                          <div className="fcw-flex-between" style={{ marginBottom: products.length > 0 ? "0.75rem" : 0 }}>
                            <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>Товары</h3>
                            <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => setSection("products")}>
                              Все <ChevronRight size={14} />
                            </button>
                          </div>
                          {productsBusy && <Loading size="sm" text="Загрузка..." />}
                          {!productsBusy && products.length === 0 && (
                            <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                              Нет товаров. <button className="fcw-link" onClick={() => setSection("products")} style={{ color: "var(--fcw-color-primary)", cursor: "pointer", background: "none", border: "none", padding: 0, fontSize: "inherit" }}>Добавить</button>
                            </p>
                          )}
                          {!productsBusy && products.length > 0 && (
                            <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                              {products.slice(0, 5).map(p => (
                                <div key={p.productOfferId} className="fcw-flex-between" style={{ padding: "0.375rem 0" }}>
                                  <span className="fcw-body-s" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                                  <span className="fcw-body-s fcw-weight-medium" style={{ color: "var(--fcw-color-primary)", flexShrink: 0, marginLeft: "0.5rem" }}>
                                    {p.price > 0 ? `${p.price.toLocaleString("ru-KZ")} ₸` : "—"}
                                  </span>
                                </div>
                              ))}
                              {products.length > 5 && (
                                <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                                  + ещё {products.length - 5}
                                </p>
                              )}
                            </div>
                          )}
                        </Card>

                        {/* Services preview */}
                        <Card padding="lg">
                          <div className="fcw-flex-between" style={{ marginBottom: services.length > 0 ? "0.75rem" : 0 }}>
                            <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>Услуги</h3>
                            <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => setSection("services")}>
                              Все <ChevronRight size={14} />
                            </button>
                          </div>
                          {servicesBusy && <Loading size="sm" text="Загрузка..." />}
                          {!servicesBusy && services.length === 0 && (
                            <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                              Нет услуг. <button className="fcw-link" onClick={() => setSection("services")} style={{ color: "var(--fcw-color-primary)", cursor: "pointer", background: "none", border: "none", padding: 0, fontSize: "inherit" }}>Добавить</button>
                            </p>
                          )}
                          {!servicesBusy && services.length > 0 && (
                            <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                              {services.slice(0, 5).map(s => (
                                <div key={s.serviceBranchOfferId} className="fcw-flex-between" style={{ padding: "0.375rem 0" }}>
                                  <span className="fcw-body-s" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                                  <span className="fcw-body-s fcw-weight-medium" style={{ color: "var(--fcw-color-primary)", flexShrink: 0, marginLeft: "0.5rem" }}>
                                    {s.basePrice > 0 ? `${s.basePrice.toLocaleString("ru-KZ")} ₸` : "—"}
                                  </span>
                                </div>
                              ))}
                              {services.length > 5 && (
                                <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                                  + ещё {services.length - 5}
                                </p>
                              )}
                            </div>
                          )}
                        </Card>

                        {/* Branches preview */}
                        <Card padding="lg">
                          <div className="fcw-flex-between" style={{ marginBottom: branches.length > 0 ? "0.75rem" : 0 }}>
                            <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>Филиалы</h3>
                            <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => setSection("branches")}>
                              Все <ChevronRight size={14} />
                            </button>
                          </div>
                          {!activeBranchId && (
                            <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                              Нет филиалов. <button className="fcw-link" onClick={() => setSection("branches")} style={{ color: "var(--fcw-color-primary)", cursor: "pointer", background: "none", border: "none", padding: 0, fontSize: "inherit" }}>Добавить</button>
                            </p>
                          )}
                          {branches.length > 0 && (
                            <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                              {branches.map(b => (
                                <div key={b.id} className="fcw-flex-between" style={{ padding: "0.375rem 0" }}>
                                  <span className="fcw-body-s">{b.name}</span>
                                  <span className={`fcw-label ${b.status === "ACTIVE" ? "" : "fcw-text-tertiary"}`} style={{ fontSize: "0.6875rem" }}>
                                    {b.status === "ACTIVE" ? "Активен" : b.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </div>

                      {/* Right column: quick actions */}
                      <Card padding="lg">
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 1rem 0" }}>Быстрые действия</h3>
                        <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                          {[
                            { label: "Добавить товар", icon: <Package size={14} />, onClick: () => setSection("products") },
                            { label: "Добавить услугу", icon: <Briefcase size={14} />, onClick: () => setSection("services") },
                            { label: "Добавить филиал", icon: <Building2 size={14} />, onClick: () => setSection("branches") },
                            { label: "Создать ивент", icon: <Calendar size={14} />, onClick: () => setSection("events") },
                            { label: "Редактировать визитку", icon: <Sparkles size={14} />, onClick: () => setSection("business-card") },
                          ].map(action => (
                            <button
                              key={action.label}
                              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                              style={{ justifyContent: "flex-start", gap: "0.5rem", width: "100%" }}
                              onClick={action.onClick}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </>
                )}

                {/* Products */}
                {section === "products" && (
                  <div>
                    <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
                      <div>
                        <h2 className="fcw-h2" style={{ margin: 0 }}>Товары</h2>
                        {productsTotal > 0 && (
                          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>Всего: {productsTotal}</p>
                        )}
                      </div>
                      {!isStaff && (
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setSection("import")}>
                            <Upload size={16} />Импорт
                          </button>
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { resetProductForm(); setShowProductForm(true); }}>
                            <Plus size={16} />Добавить товар
                        </button>
                        </div>
                      )}
                    </div>

                    {/* Product form */}
                    <AnimatePresence>
                      {showProductForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: "hidden", marginBottom: "var(--fcw-space-md)" }}
                        >
                          <Card padding="lg">
                            <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 1rem 0" }}>
                              {editProduct ? "Редактировать товар" : "Новый товар"}
                            </h3>
                            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                              <input
                                className="fcw-input"
                                placeholder="Название товара *"
                                value={productForm.name}
                                onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                              />
                              <input
                                className="fcw-input"
                                placeholder="Описание"
                                value={productForm.description}
                                onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                              />
                              <input
                                className="fcw-input"
                                placeholder="Цена (₸)"
                                type="number"
                                value={productForm.price}
                                onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                                style={{ maxWidth: "200px" }}
                              />
                              <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={editProduct ? handleUpdateProduct : handleCreateProduct}>
                                  <Check size={14} />{editProduct ? "Сохранить" : "Создать"}
                                </button>
                                <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>Отмена</button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!activeBranchId && (
                      <EmptyState title="Нет филиалов" description="Сначала создайте филиал в разделе «Филиалы»" />
                    )}

                    {activeBranchId && productsBusy && <Loading size="sm" text="Загрузка товаров..." />}

                    {activeBranchId && !productsBusy && products.length === 0 && !showProductForm && (
                      <EmptyState
                        title="Нет товаров"
                        description="Добавьте товары, чтобы они появились в поиске и на витрине"
                        action={!isStaff ? (
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowProductForm(true)}>
                            <Plus size={16} />Добавить товар
                          </button>
                        ) : undefined}
                      />
                    )}

                    {activeBranchId && !productsBusy && products.length > 0 && (
                      <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                        {products.map(p => (
                          <Card key={p.productOfferId} padding="md">
                            <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                              <div style={{ minWidth: 0 }}>
                                <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                                  <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p.name}
                                  </span>
                                  {!p.enabled && (
                                    <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>Скрыт</span>
                                  )}
                                </div>
                                {p.description && (
                                  <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>{p.description}</p>
                                )}
                                {p.categoryLabel && (
                                  <span className="fcw-body-s fcw-text-tertiary">{p.categoryLabel}</span>
                                )}
                              </div>
                              <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem", flexShrink: 0 }}>
                                <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>
                                  {p.price > 0 ? `${p.price.toLocaleString("ru-KZ")} ₸` : "—"}
                                </span>
                                {!isStaff && (
                                  <div className="fcw-flex" style={{ gap: "0.25rem" }}>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => openEditProduct(p)} aria-label="Редактировать">
                                      <Edit3 size={14} />
                                    </button>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => handleDeleteProduct(p)} aria-label="Удалить">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Services */}
                {section === "services" && (
                  <div>
                    <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
                      <h2 className="fcw-h2" style={{ margin: 0 }}>Услуги</h2>
                      {!isStaff && (
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setSection("import")}>
                            <Upload size={16} />Импорт
                          </button>
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { resetServiceForm(); setShowServiceForm(true); }}>
                            <Plus size={16} />Добавить услугу
                          </button>
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {showServiceForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: "hidden", marginBottom: "var(--fcw-space-md)" }}
                        >
                          <Card padding="lg">
                            <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 1rem 0" }}>
                              {editService ? "Редактировать услугу" : "Новая услуга"}
                            </h3>
                            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                              <input
                                className="fcw-input"
                                placeholder="Название услуги *"
                                value={serviceForm.name}
                                onChange={e => setServiceForm(s => ({ ...s, name: e.target.value }))}
                              />
                              <input
                                className="fcw-input"
                                placeholder="Описание"
                                value={serviceForm.description}
                                onChange={e => setServiceForm(s => ({ ...s, description: e.target.value }))}
                              />
                              <div className="fcw-flex" style={{ gap: "0.75rem" }}>
                                <input
                                  className="fcw-input"
                                  placeholder="Цена (₸)"
                                  type="number"
                                  value={serviceForm.basePrice}
                                  onChange={e => setServiceForm(s => ({ ...s, basePrice: e.target.value }))}
                                  style={{ maxWidth: "160px" }}
                                />
                                <input
                                  className="fcw-input"
                                  placeholder="Длительность (мин)"
                                  type="number"
                                  value={serviceForm.durationMinutes}
                                  onChange={e => setServiceForm(s => ({ ...s, durationMinutes: e.target.value }))}
                                  style={{ maxWidth: "160px" }}
                                />
                              </div>
                              <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={editService ? handleUpdateService : handleCreateService}>
                                  <Check size={14} />{editService ? "Сохранить" : "Создать"}
                                </button>
                                <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetServiceForm}>Отмена</button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!activeBranchId && (
                      <EmptyState title="Нет филиалов" description="Сначала создайте филиал в разделе «Филиалы»" />
                    )}

                    {activeBranchId && servicesBusy && <Loading size="sm" text="Загрузка услуг..." />}

                    {activeBranchId && !servicesBusy && services.length === 0 && !showServiceForm && (
                      <EmptyState
                        title="Нет услуг"
                        description="Добавьте услуги, чтобы клиенты могли находить вас в поиске"
                        action={!isStaff ? (
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowServiceForm(true)}>
                            <Plus size={16} />Добавить услугу
                          </button>
                        ) : undefined}
                      />
                    )}

                    {activeBranchId && !servicesBusy && services.length > 0 && (
                      <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                        {services.map(s => (
                          <Card key={s.serviceBranchOfferId} padding="md">
                            <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                              <div style={{ minWidth: 0 }}>
                                <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                                  <span className="fcw-body fcw-weight-medium">{s.name}</span>
                                  {!s.active && (
                                    <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>Неактивна</span>
                                  )}
                                </div>
                                {s.description && (
                                  <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>{s.description}</p>
                                )}
                                {s.scheduleText && (
                                  <div className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem", marginTop: "0.25rem" }}>
                                    <Clock3 size={11} />{s.scheduleText}
                                  </div>
                                )}
                              </div>
                              <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem", flexShrink: 0 }}>
                                <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>
                                  {s.basePrice > 0 ? `${s.basePrice.toLocaleString("ru-KZ")} ₸` : "—"}
                                </span>
                                {!isStaff && (
                                  <div className="fcw-flex" style={{ gap: "0.25rem" }}>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => openEditService(s)} aria-label="Редактировать">
                                      <Edit3 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Branches */}
                {section === "branches" && (
                  <div>
                    <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
                      <h2 className="fcw-h2" style={{ margin: 0 }}>Филиалы</h2>
                      {!isStaff && (
                        <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowBranchForm(true)}>
                          <Plus size={16} />Добавить филиал
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showBranchForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: "hidden", marginBottom: "var(--fcw-space-md)" }}
                        >
                          <Card padding="lg">
                            <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 1rem 0" }}>Новый филиал</h3>
                            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                              <input
                                className="fcw-input"
                                placeholder="Название филиала *"
                                value={branchForm.name}
                                onChange={e => setBranchForm(b => ({ ...b, name: e.target.value }))}
                              />
                              <input
                                className="fcw-input"
                                placeholder="Адрес"
                                value={branchForm.address}
                                onChange={e => setBranchForm(b => ({ ...b, address: e.target.value }))}
                              />
                              <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateBranch}>
                                  <Check size={14} />Создать
                                </button>
                                <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => setShowBranchForm(false)}>Отмена</button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {branchesBusy && <Loading size="sm" text="Загрузка филиалов..." />}

                    {!branchesBusy && branches.length === 0 && !showBranchForm && (
                      <EmptyState
                        title="Нет филиалов"
                        description="Создайте хотя бы один филиал, чтобы добавлять товары и услуги"
                        action={!isStaff ? (
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowBranchForm(true)}>
                            <Plus size={16} />Добавить филиал
                          </button>
                        ) : undefined}
                      />
                    )}

                    {!branchesBusy && branches.length > 0 && (
                      <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                        {branches.map(b => (
                          <Card key={b.id} padding="md">
                            <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                              <div>
                                <span className="fcw-body fcw-weight-medium">{b.name}</span>
                                {b.address && (
                                  <div className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem", marginTop: "0.25rem" }}>
                                    <MapPin size={11} />{b.address}{b.cityName ? `, ${b.cityName}` : ""}
                                  </div>
                                )}
                                {b.onlineOnly && (
                                  <span className="fcw-label" style={{ color: "var(--fcw-blue-500)", marginTop: "0.25rem", display: "inline-block" }}>Онлайн</span>
                                )}
                              </div>
                              <span className={`fcw-label ${b.status === "ACTIVE" ? "" : "fcw-text-tertiary"}`}>
                                {b.status === "ACTIVE" ? "Активен" : b.status}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Events */}
                {section === "events" && (
                  <div>
                    <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
                      <div>
                        <h2 className="fcw-h2" style={{ margin: 0 }}>Ивенты</h2>
                        <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
                          {drops.filter(d => d.status === "ACTIVE").length} активных
                        </p>
                      </div>
                    </div>
                    <DropsEditor
                      drops={drops}
                      onCreate={handleCreateDrop}
                      onCancel={handleCancelDrop}
                      onDelete={handleDeleteDrop}
                      busy={busy}
                      readOnly={isStaff}
                    />
                  </div>
                )}

                {/* Import data */}
                {section === "import" && (
                  <div>
                    <h2 className="fcw-h2" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>Импорт данных</h2>
                    <p className="fcw-body fcw-text-secondary" style={{ marginBottom: "var(--fcw-space-lg)" }}>
                      Импортируйте товары и услуги быстро и без ошибок
                    </p>
                    <div className="fcw-grid-3" style={{ gap: "var(--fcw-space-md)" }}>
                      {[
                        { step: 1, title: "Загрузка файла", desc: "Загрузите CSV или Excel файл с товарами или услугами" },
                        { step: 2, title: "Распознавание (AI)", desc: "ASK автоматически распознает и сопоставит данные" },
                        { step: 3, title: "Предпросмотр для клиентов", desc: "Проверьте, как клиенты увидят ваши товары" },
                      ].map(s => (
                        <Card key={s.step} padding="lg" style={{ opacity: s.step === 1 ? 1 : 0.5 }}>
                          <div
                            className="fcw-label fcw-weight-bold"
                            style={{ color: "var(--fcw-color-primary)", marginBottom: "0.5rem", fontSize: "var(--fcw-font-size-body-s)" }}
                          >
                            Этап {s.step}
                          </div>
                          <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 0.25rem 0" }}>{s.title}</h3>
                          <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>{s.desc}</p>
                        </Card>
                      ))}
                    </div>
                    <p className="fcw-body-s fcw-text-tertiary" style={{ marginTop: "var(--fcw-space-md)" }}>
                      Следующий блок откроется автоматически после успешного шага.
                    </p>
                    <div style={{ marginTop: "var(--fcw-space-lg)" }}>
                      <Card padding="lg">
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>Настройки импорта</h3>
                        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">Филиал импорта</label>
                            <select className="fcw-input" style={{ width: "100%", maxWidth: "320px" }}>
                              {branches.length > 0 ? branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              )) : (
                                <option>Нет филиалов</option>
                              )}
                            </select>
                          </div>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">Язык файла</label>
                            <select className="fcw-input" style={{ width: "100%", maxWidth: "320px" }}>
                              <option>Русский</option>
                              <option>Казахский</option>
                            </select>
                          </div>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">Что загружаем</label>
                            <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                              <button className="fcw-btn fcw-btn-primary fcw-btn-sm">Товары</button>
                              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm">Услуги</button>
                            </div>
                          </div>
                          <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked />
                            <span className="fcw-body-s">В файле есть названия колонок</span>
                          </label>
                          <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", cursor: "pointer" }}>
                            <input type="checkbox" />
                            <span className="fcw-body-s">Обновлять существующие позиции</span>
                          </label>
                        </div>
                        <div
                          className="fcw-body-s"
                          style={{
                            marginTop: "var(--fcw-space-md)",
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--fcw-color-surface-tertiary)",
                            borderRadius: "var(--fcw-radius-md)",
                            color: "var(--fcw-color-text-secondary)",
                          }}
                        >
                          Не загружайте внутренние данные: закупочные цены, маржинальность, поставщиков и остатки, если они не должны быть видны клиентам.
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Business Card Builder */}
                {section === "business-card" && (
                  <BusinessCardBuilder
                    blocks={cardBlocks}
                    businessId={businessId}
                    brandColor={profile.brandColor || DEFAULT_BRAND_COLOR}
                    onSave={handleSaveCard}
                    onPublish={handlePublishCard}
                    busy={busy}
                    readOnly={isStaff}
                  />
                )}

                {/* Profile */}
                {section === "profile" && (
                  <div style={{ display: "flex", gap: "var(--fcw-space-lg)", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 500px", maxWidth: 700 }}>
                      <h2 className="fcw-h2" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>Кабинет компании</h2>
                      <ProfileEditor
                        profile={profile}
                        onChange={setProfile}
                        onSave={handleSaveProfile}
                        busy={busy}
                        readOnly={isStaff}
                      />
                    </div>
                    <div style={{ flex: "1 1 280px", maxWidth: 400 }}>
                      <Card padding="lg">
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 1rem 0" }}>О бренде</h3>
                        <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                          {[
                            { label: "Цвет бренда", value: profile.brandColor, preview: true },
                            { label: "Логотип", value: profile.logoUrl ? "Загружен" : "Не загружен" },
                            { label: "Обложка", value: profile.coverUrl ? "Загружена" : "Не загружена" },
                            { label: "Описание", value: profile.description ? `${profile.description.substring(0, 60)}...` : "Не заполнено" },
                            { label: "Instagram", value: profile.instagramUrl || "—" },
                            { label: "Telegram", value: profile.telegramUrl || "—" },
                            { label: "Сайт", value: profile.websiteUrl || "—" },
                          ].map(item => (
                            <div key={item.label} className="fcw-flex-between" style={{ gap: "0.5rem" }}>
                              <span className="fcw-body-s fcw-text-secondary" style={{ flexShrink: 0 }}>{item.label}</span>
                              <span className="fcw-body-s fcw-weight-medium" style={{ textAlign: "right" }}>
                                {item.preview ? (
                                  <span className="fcw-flex fcw-items-center" style={{ gap: "0.375rem" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: item.value as string, display: "inline-block", border: "1px solid var(--fcw-color-border)" }} />
                                    {item.value}
                                  </span>
                                ) : item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
