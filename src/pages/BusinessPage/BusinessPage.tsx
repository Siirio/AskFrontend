import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Briefcase, Building2, UserRound,
  Sparkles, Plus, RefreshCw, Loader2,
  ChevronDown, Menu, X, MapPin, Trash2, Edit3, Check, Clock3, Layout,
  Grid3X3, List, Calendar, Upload, MessageCircle, Reply, Users, Copy
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { useToast } from "../../shared/ui/Toast/Toast";
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
  listCategories, listStaff, createStaff, resetStaffPassword, uploadProductImport,
} from "../../shared/api/askClient";
import type {
  BrandProfileDto, BrandDropDto,
  BusinessProductDto, BusinessServiceDto, StaffDto,
} from "../../shared/api/dto";
import type { SupplierTask } from "../../entities/supplier/model";
import { ApiError } from "../../shared/api/httpClient";
import { ROUTES } from "../../app/routes";

type BusinessSection = "overview" | "products" | "services" | "branches" | "events" | "business-card" | "profile" | "import";
type ProfileSubtab = "brand";
type TaskFilter = "all" | "discussing" | "confirmed" | "declined";
type TaskView = "cards" | "rows";

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryInfo[];
}

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

function flattenCategories(items: CategoryInfo[]): CategoryInfo[] {
  return items.flatMap(item => [item, ...flattenCategories(item.children || [])]);
}

function taskStatusLabel(status: SupplierTask["status"]) {
  if (status === "answered") return "Подтверждено";
  if (status === "needs_reply") return "Требует ответа";
  return "Обсуждается";
}

function taskBudgetLabel(task: SupplierTask) {
  return task.category ? task.category : "Бюджет не указан";
}

function formatStaffStatus(status: string) {
  if (status === "PENDING_ACTIVATION") return "Ожидает активации";
  if (status === "PASSWORD_RESET_REQUIRED") return "Требуется смена пароля";
  if (status === "ACTIVE") return "Активен";
  if (status === "DISABLED") return "Отключен";
  return status;
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
  const toast = useToast();
  const [profile, setProfile] = useState<BrandProfileDto>(() => emptyProfile(businessId));
  const [drops, setDrops] = useState<BrandDropDto[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [cardBlocks, setCardBlocks] = useState<CardBlock[]>([]);
  const [cardPublishedAt, setCardPublishedAt] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

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
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", basePrice: "", durationMinutes: "", categoryId: "", scheduleType: "FIXED" as "FIXED" | "FLEXIBLE" | "APPOINTMENT" });

  // Branches
  const [branchesBusy, setBranchesBusy] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", cityId: "" });
  const [staffByBranch, setStaffByBranch] = useState<Record<string, StaffDto[]>>({});
  const [staffForms, setStaffForms] = useState<Record<string, { displayName: string; email: string }>>({});
  const [staffBusy, setStaffBusy] = useState("");

  // Overview
  const [tasks, setTasks] = useState<SupplierTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [taskView, setTaskView] = useState<TaskView>("cards");
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importBranchId, setImportBranchId] = useState("");
  const [quickRailOpen, setQuickRailOpen] = useState(false);

  const activeBranchId = selectedBranchId || branches[0]?.id || "";

  const loadCoreData = useCallback(async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      const [profileRes, dropsRes, branchesRes] = await Promise.allSettled([
        getBrandProfile(businessId),
        listDrops(businessId),
        listBranches(businessId),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (dropsRes.status === "fulfilled") setDrops(dropsRes.value);
      if (branchesRes.status === "fulfilled") {
        setBranches(branchesRes.value);
        setSelectedBranchId(current => current || branchesRes.value[0]?.id || "");
        setImportBranchId(current => current || branchesRes.value[0]?.id || "");
      }
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка загрузки", "error");
    } finally {
      setBusy(false);
    }
  }, [businessId]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await listCategories();
      setCategories(res);
      const firstCategory = flattenCategories(res)[0];
      if (firstCategory) {
        setProductForm(current => current.categoryId ? current : { ...current, categoryId: firstCategory.id });
        setServiceForm(current => current.categoryId ? current : { ...current, categoryId: firstCategory.id });
      }
    } catch {
      setCategories([]);
    }
  }, []);

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
      setSelectedBranchId(current => current || res[0]?.id || "");
      setImportBranchId(current => current || res[0]?.id || "");
    } catch { /* empty */ } finally {
      setBranchesBusy(false);
    }
  }, [businessId]);

  const loadTasks = useCallback(async () => {
    if (!activeBranchId) return;
    try {
      const loadedTasks = await getSupplierTasks(activeBranchId);
      setTasks(loadedTasks);
    } catch { setTasks([]); }
  }, [activeBranchId]);

  const loadStaffForBranch = useCallback(async (branchId: string) => {
    if (!businessId || !branchId || isStaff) return;
    try {
      const staff = await listStaff(businessId, branchId);
      setStaffByBranch(current => ({ ...current, [branchId]: staff }));
    } catch {
      setStaffByBranch(current => ({ ...current, [branchId]: [] }));
    }
  }, [businessId, isStaff]);

  useEffect(() => { loadCoreData(); }, [loadCoreData]);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { if (section === "products" || section === "overview") loadProducts(); }, [section, loadProducts]);
  useEffect(() => { if (section === "services" || section === "overview") loadServices(); }, [section, loadServices]);
  useEffect(() => { if (section === "overview") loadTasks(); }, [section, loadTasks]);

  if (state.view !== "business" && state.view !== "staff") {
    return <Navigate to={ROUTES.home} replace />;
  }

  const discussingTasks = tasks.filter(task => task.status === "new");
  const replyTasks = tasks.filter(task => task.status === "needs_reply");
  const confirmedTasks = tasks.filter(task => task.status === "answered");
  const declinedTasks: SupplierTask[] = [];
  const filteredTasks = taskFilter === "confirmed"
    ? confirmedTasks
    : taskFilter === "declined"
      ? declinedTasks
      : taskFilter === "discussing"
        ? [...discussingTasks, ...replyTasks]
        : tasks;

  const handleSaveProfile = async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      const saved = await updateBrandProfile(businessId, profile);
      setProfile(saved);
      toast.show("Профиль сохранен.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка сохранения", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDrop = async (data: Partial<BrandDropDto>) => {
    if (!businessId) {
      toast.show("?????? ??????? ?? ???????. ??????? ? ??????-??????? ?????.", "error");
      return;
    }
    try {
      const created = await createDrop(businessId, data);
      setDrops(current => [created, ...current]);
      toast.show("????? ????????.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "?????? ?????????? ??????", "error");
      throw e;
    }
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
    toast.show("Визитка сохранена.", "success");
  };

  const handlePublishCard = async () => {
    if (!businessId) return;
    const res = await publishBusinessCard(businessId);
    setCardBlocks(res.blocks as unknown as CardBlock[]);
    setCardPublishedAt(res.publishedAt || null);
    toast.show("Визитка опубликована.", "success");
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
    if (!productForm.categoryId) {
      toast.show("Выберите категорию товара.", "error");
      return;
    }
    try {
      await createProduct(activeBranchId, {
        name: productForm.name,
        description: productForm.description || undefined,
        price: productForm.price ? Number(productForm.price) : undefined,
        categoryId: productForm.categoryId,
      });
      resetProductForm();
      loadProducts();
      toast.show("Товар добавлен.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка создания товара", "error");
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
      toast.show("Товар обновлен.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка обновления", "error");
    }
  };

  const handleDeleteProduct = async (product: BusinessProductDto) => {
    if (!activeBranchId) return;
    try {
      await deleteProduct(activeBranchId, product.productOfferId);
      loadProducts();
      toast.show("Товар удален.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка удаления", "error");
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
    setShowProductForm(false);
  };

  // Service CRUD
  const resetServiceForm = () => {
    setServiceForm({ name: "", description: "", basePrice: "", durationMinutes: "", categoryId: "", scheduleType: "FIXED" });
    setEditService(null);
    setShowServiceForm(false);
  };

  const handleCreateService = async () => {
    if (!activeBranchId || !serviceForm.name) return;
    if (!serviceForm.categoryId) {
      toast.show("Выберите категорию услуги.", "error");
      return;
    }
    try {
      await createService(activeBranchId, {
        categoryId: serviceForm.categoryId,
        name: serviceForm.name,
        description: serviceForm.description || undefined,
        basePrice: serviceForm.basePrice ? Number(serviceForm.basePrice) : undefined,
        durationMinutes: serviceForm.durationMinutes ? Number(serviceForm.durationMinutes) : undefined,
        scheduleType: serviceForm.scheduleType,
      } as any);
      resetServiceForm();
      loadServices();
      toast.show("Услуга добавлена.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка создания услуги", "error");
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
        scheduleType: serviceForm.scheduleType,
      } as any);
      resetServiceForm();
      loadServices();
      toast.show("Услуга обновлена.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка обновления", "error");
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
      scheduleType: (s as any).scheduleType || "FIXED",
    });
    setShowServiceForm(false);
  };

  // Branch CRUD
  const handleCreateBranch = async () => {
    if (!businessId) {
      toast.show("Сессия бизнеса не найдена. Выйдите и зайдите в бизнес-аккаунт снова.", "error");
      return;
    }
    if (!branchForm.name.trim()) {
      toast.show("Введите название филиала.", "error");
      return;
    }
    try {
      const created = await createBranch(businessId, {
        name: branchForm.name.trim(),
        address: branchForm.address || undefined,
        cityId: branchForm.cityId || undefined,
      });
      setBranchForm({ name: "", address: "", cityId: "" });
      setShowBranchForm(false);
      setSelectedBranchId(created.id);
      setImportBranchId(created.id);
      loadBranches();
      toast.show("Филиал создан.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка создания филиала", "error");
    }
  };

  const handleCreateStaff = async (branchId: string) => {
    const form = staffForms[branchId];
    if (!businessId || !branchId || !form?.displayName || !form?.email) return;
    setStaffBusy(branchId);
    try {
      const created = await createStaff(businessId, branchId, form);
      setStaffByBranch(current => ({ ...current, [branchId]: [created, ...(current[branchId] || [])] }));
      setStaffForms(current => ({ ...current, [branchId]: { displayName: "", email: "" } }));
      toast.show("Сотрудник добавлен. Временный пароль показан в карточке сотрудника.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка добавления сотрудника", "error");
    } finally {
      setStaffBusy("");
    }
  };

  const handleResetStaffPassword = async (branchId: string, staffId: string) => {
    if (!businessId || !branchId) return;
    setStaffBusy(staffId);
    try {
      const updated = await resetStaffPassword(businessId, branchId, staffId);
      setStaffByBranch(current => ({
        ...current,
        [branchId]: (current[branchId] || []).map(item => item.id === staffId ? updated : item),
      }));
      toast.show("Новый временный пароль создан.", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Ошибка сброса пароля", "error");
    } finally {
      setStaffBusy("");
    }
  };

  const handleImportFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    const allowed = nextFiles.filter(file => /\.(xlsx|txt|md|pdf)$/i.test(file.name));
    const rejected = nextFiles.filter(file => !allowed.includes(file));
    setImportFiles(allowed);
    setImportStatus(rejected.length > 0 ? "Пока что данный формат не поддерживается" : "");
  };

  const handleUploadImport = async () => {
    const branchId = importBranchId || activeBranchId;
    if (!branchId || importFiles.length === 0) return;
    setImportBusy(true);
    setImportStatus("");
    try {
      for (const file of importFiles) {
        await uploadProductImport(branchId, file);
      }
      setImportStatus(`Загружено файлов: ${importFiles.length}. Проверьте предпросмотр перед публикацией.`);
    } catch (e) {
      setImportStatus(e instanceof ApiError ? e.message : "Ошибка загрузки файла");
    } finally {
      setImportBusy(false);
    }
  };

  const quickActions = [
    { label: "Добавить товар", icon: <Package size={16} />, onClick: () => setSection("products") },
    { label: "Добавить услугу", icon: <Briefcase size={16} />, onClick: () => setSection("services") },
    { label: "Импорт", icon: <Upload size={16} />, onClick: () => setSection("import") },
    { label: "Профиль", icon: <UserRound size={16} />, onClick: () => setSection("profile") },
    { label: "Визитка", icon: <Sparkles size={16} />, onClick: () => setSection("business-card") },
  ];

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

        {!isStaff && (
          <>
            <div
              className="fcw-hidden-mobile"
              onMouseEnter={() => setQuickRailOpen(true)}
              style={{
                position: "fixed",
                right: 0,
                top: 0,
                width: 12,
                height: "100vh",
                zIndex: 21,
              }}
            />
            <motion.aside
              className="fcw-hidden-mobile"
              onMouseLeave={() => setQuickRailOpen(false)}
              onMouseEnter={() => setQuickRailOpen(true)}
              initial={false}
              animate={{ x: quickRailOpen ? 0 : 200 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                right: 0,
                top: 96,
                zIndex: 20,
                width: 192,
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                borderRight: "none",
                borderRadius: "var(--fcw-radius-lg) 0 0 var(--fcw-radius-lg)",
                backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 94%, transparent)",
                boxShadow: "var(--fcw-shadow-lg)",
                backdropFilter: "var(--fcw-blur-glass)",
                padding: "0.375rem",
              }}
            >
              <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                {quickActions.map(action => (
                  <button
                    key={action.label}
                    className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                    style={{ justifyContent: "flex-start", gap: "0.625rem", width: "100%", padding: "0.5rem 0.75rem" }}
                    onClick={action.onClick}
                  >
                    <span className="fcw-flex-center" style={{ width: 24, flexShrink: 0 }}>{action.icon}</span>
                    <span style={{ whiteSpace: "nowrap" }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}

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
              <Card padding="lg" style={{ marginBottom: "var(--fcw-space-lg)" }}>
                <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "1rem" }}>
                  <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--fcw-radius-md)",
                        backgroundColor: profile.brandColor || DEFAULT_BRAND_COLOR,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                        <span className="fcw-body-l fcw-weight-bold">
                          {state.session?.business?.businessName || "Кабинет компании"}
                        </span>
                        <span className="fcw-label" style={{
                          color: isStaff ? "var(--fcw-color-text-tertiary)" : "var(--fcw-color-primary)",
                          backgroundColor: isStaff ? "var(--fcw-color-surface-secondary)" : "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "var(--fcw-radius-full)",
                        }}>
                          {isStaff ? "Сотрудник" : "Владелец"}
                        </span>
                      </div>
                      <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem", marginTop: "0.25rem" }}>
                        <span className="fcw-body-s fcw-text-secondary">
                          {state.session?.user?.email || ""}
                        </span>
                        <span className="fcw-body-xs fcw-text-tertiary">·</span>
                        <select
                          className="fcw-input"
                          value={activeBranchId}
                          onChange={event => {
                            setSelectedBranchId(event.target.value);
                            setImportBranchId(event.target.value);
                          }}
                          style={{ width: "auto", minWidth: 180, height: 30, fontSize: "0.75rem", padding: "0.125rem 0.5rem" }}
                        >
                          {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <motion.div
                key={section + (section === "profile" ? profileSubtab : "")}
                initial={reduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Overview */}
                {section === "overview" && (
                  <>
                    <Card padding="lg" style={{ marginBottom: "var(--fcw-space-lg)" }}>
                      <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "1rem", marginBottom: "var(--fcw-space-md)" }}>
                        <div>
                          <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                            <h2 className="fcw-h2" style={{ margin: 0 }}>Запросы клиентов</h2>
                            <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>{filteredTasks.length}</span>
                          </div>
                          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
                            Все обращения по текущему филиалу
                          </p>
                        </div>
                        <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                          <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
                            {([
                              ["all", "Все"],
                              ["discussing", "Обсуждается"],
                              ["confirmed", "Подтверждено"],
                              ["declined", "Отклонено"],
                            ] as const).map(([key, label]) => (
                              <button
                                key={key}
                                className={`fcw-btn fcw-btn-sm ${taskFilter === key ? "fcw-glassmorph-selected-seg" : ""}`}
                                style={{ background: taskFilter === key ? undefined : "transparent", border: "none", boxShadow: "none" }}
                                onClick={() => setTaskFilter(key)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
                            {([
                              ["cards", <Grid3X3 size={14} />, "Карточки"],
                              ["rows", <List size={14} />, "Строки"],
                            ] as const).map(([key, icon, label]) => (
                              <button
                                key={key}
                                className={`fcw-btn fcw-btn-sm ${taskView === key ? "fcw-glassmorph-selected-seg" : ""}`}
                                style={{ background: taskView === key ? undefined : "transparent", border: "none", boxShadow: "none", gap: "0.375rem" }}
                                onClick={() => setTaskView(key)}
                              >
                                {icon}
                                <span className="fcw-hidden-mobile">{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="fcw-grid-4" style={{ gap: "0.5rem", marginBottom: "var(--fcw-space-md)" }}>
                        {[
                          { label: "Новые", value: discussingTasks.length },
                          { label: "Требуют ответа", value: replyTasks.length },
                          { label: "Подтверждено", value: confirmedTasks.length },
                          { label: "Отклонено", value: declinedTasks.length },
                        ].map(item => (
                          <div key={item.label} style={{ padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)" }}>
                            <span className="fcw-body-xs fcw-text-tertiary">{item.label}</span>
                            <div className="fcw-h3" style={{ margin: 0 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {filteredTasks.length === 0 && (
                        <EmptyState title="Нет запросов" description="Новые обращения по филиалу появятся здесь." />
                      )}

                      {filteredTasks.length > 0 && taskView === "cards" && (
                        <div className="fcw-grid-2" style={{ gap: "0.75rem" }}>
                          {filteredTasks.map(task => (
                            <article key={task.id} className="fcw-card" style={{ padding: "1rem", borderRadius: "var(--fcw-radius-md)" }}>
                              <div className="fcw-flex-between" style={{ gap: "0.5rem", marginBottom: "0.625rem" }}>
                                <span className="fcw-label" style={{ color: task.status === "needs_reply" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)" }}>
                                  {taskStatusLabel(task.status)}
                                </span>
                                <span className="fcw-body-xs fcw-text-tertiary">{task.ageLabel}</span>
                              </div>
                              <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>{task.query}</h3>
                              <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.375rem 0" }}>{taskBudgetLabel(task)}</p>
                              <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem", marginTop: "0.75rem" }}>
                                <span className="fcw-body-s fcw-text-tertiary">Клиент · {task.customerArea || "район не указан"}</span>
                                <span className="fcw-body-s fcw-text-tertiary">2 сообщения</span>
                              </div>
                              <div className="fcw-flex" style={{ gap: "0.5rem", marginTop: "0.875rem" }}>
                                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm"><MessageCircle size={14} />Открыть</button>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm"><Reply size={14} />Ответить</button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}

                      {filteredTasks.length > 0 && taskView === "rows" && (
                        <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                          {filteredTasks.map(task => (
                            <div key={task.id} className="fcw-flex-between" style={{ gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)" }}>
                              <div style={{ minWidth: 0 }}>
                                <span className="fcw-body fcw-weight-medium" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.query}</span>
                                <span className="fcw-body-s fcw-text-tertiary">{taskStatusLabel(task.status)} · {task.ageLabel}</span>
                              </div>
                              <button className="fcw-btn fcw-btn-primary fcw-btn-sm"><Reply size={14} />Ответить</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

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

                    {activeBranchId && !productsBusy && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.5rem" }}>
                        <AnimatePresence>
                          {showProductForm && !editProduct && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              style={{ overflow: "hidden" }}
                            >
                              <Card padding="md">
                                <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                  <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Plus size={18} style={{ color: "var(--fcw-color-primary)" }} />
                                    Новый товар
                                  </h3>
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
                                  <select
                                    className="fcw-input"
                                    value={productForm.categoryId}
                                    onChange={e => setProductForm(p => ({ ...p, categoryId: e.target.value }))}
                                    style={{ maxWidth: "320px" }}
                                  >
                                    <option value="">Категория товара *</option>
                                    {flattenCategories(categories).map(category => (
                                      <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    className="fcw-input"
                                    placeholder="Цена (₸)"
                                    type="number"
                                    value={productForm.price}
                                    onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                                    style={{ maxWidth: "200px" }}
                                  />
                                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateProduct}>
                                      <Check size={14} />Создать
                                    </button>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>Отмена</button>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {products.map(p => (
                          <Card key={p.productOfferId} padding="md">
                            {editProduct?.productOfferId === p.productOfferId ? (
                              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(120px, 180px)", gap: "0.75rem" }}>
                                  <input className="fcw-input" value={productForm.name} onChange={e => setProductForm(v => ({ ...v, name: e.target.value }))} placeholder="Название товара" />
                                  <input className="fcw-input" type="number" value={productForm.price} onChange={e => setProductForm(v => ({ ...v, price: e.target.value }))} placeholder="Цена" />
                                </div>
                                <input className="fcw-input" value={productForm.description} onChange={e => setProductForm(v => ({ ...v, description: e.target.value }))} placeholder="Описание" />
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateProduct}><Check size={14} />Сохранить</button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>Отмена</button>
                                </div>
                              </div>
                            ) : (
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
                            )}
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

                    {activeBranchId && !servicesBusy && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.5rem" }}>
                        <AnimatePresence>
                          {showServiceForm && !editService && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              style={{ overflow: "hidden" }}
                            >
                              <Card padding="md">
                                <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                  <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Plus size={18} style={{ color: "var(--fcw-color-primary)" }} />
                                    Новая услуга
                                  </h3>
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
                                  <select
                                    className="fcw-input"
                                    value={serviceForm.scheduleType}
                                    onChange={e => setServiceForm(s => ({ ...s, scheduleType: e.target.value as "FIXED" | "FLEXIBLE" | "APPOINTMENT" }))}
                                    style={{ maxWidth: "260px" }}
                                  >
                                    <option value="FIXED">Фиксированная длительность</option>
                                    <option value="FLEXIBLE">Свяжемся с вами</option>
                                    <option value="APPOINTMENT">Запись на время</option>
                                  </select>
                                  <div className="fcw-flex" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
                                    <input
                                      className="fcw-input"
                                      placeholder="Цена (₸)"
                                      type="number"
                                      value={serviceForm.basePrice}
                                      onChange={e => setServiceForm(s => ({ ...s, basePrice: e.target.value }))}
                                      style={{ maxWidth: "160px" }}
                                    />
                                    {serviceForm.scheduleType === "FIXED" && (
                                      <input
                                        className="fcw-input"
                                        placeholder="Длительность (мин)"
                                        type="number"
                                        value={serviceForm.durationMinutes}
                                        onChange={e => setServiceForm(s => ({ ...s, durationMinutes: e.target.value }))}
                                        style={{ maxWidth: "160px" }}
                                      />
                                    )}
                                    {serviceForm.scheduleType === "FLEXIBLE" && (
                                      <span className="fcw-body-s fcw-text-tertiary" style={{ alignSelf: "center", maxWidth: "160px" }}>Вы сами свяжетесь с клиентом</span>
                                    )}
                                    {serviceForm.scheduleType === "APPOINTMENT" && (
                                      <input
                                        className="fcw-input"
                                        placeholder="Часы работы (напр. Пн-Пт 9:00-18:00)"
                                        value={serviceForm.durationMinutes}
                                        onChange={e => setServiceForm(s => ({ ...s, durationMinutes: e.target.value }))}
                                        style={{ maxWidth: "260px" }}
                                      />
                                    )}
                                  </div>
                                  <select
                                    className="fcw-input"
                                    value={serviceForm.categoryId}
                                    onChange={e => setServiceForm(s => ({ ...s, categoryId: e.target.value }))}
                                    style={{ maxWidth: "320px" }}
                                  >
                                    <option value="">Категория услуги *</option>
                                    {flattenCategories(categories).map(category => (
                                      <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                  </select>
                                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateService}>
                                      <Check size={14} />Создать
                                    </button>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetServiceForm}>Отмена</button>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {services.map(s => (
                          <Card key={s.serviceBranchOfferId} padding="md">
                            {editService?.serviceBranchOfferId === s.serviceBranchOfferId ? (
                              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                <select
                                  className="fcw-input"
                                  value={serviceForm.scheduleType}
                                  onChange={e => setServiceForm(v => ({ ...v, scheduleType: e.target.value as "FIXED" | "FLEXIBLE" | "APPOINTMENT" }))}
                                  style={{ maxWidth: "260px" }}
                                >
                                  <option value="FIXED">Фиксированная длительность</option>
                                  <option value="FLEXIBLE">Свяжемся с вами</option>
                                  <option value="APPOINTMENT">Запись на время</option>
                                </select>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(110px, 160px) minmax(110px, 160px)", gap: "0.75rem" }}>
                                  <input className="fcw-input" value={serviceForm.name} onChange={e => setServiceForm(v => ({ ...v, name: e.target.value }))} placeholder="Название услуги" />
                                  <input className="fcw-input" type="number" value={serviceForm.basePrice} onChange={e => setServiceForm(v => ({ ...v, basePrice: e.target.value }))} placeholder="Цена" />
                                  {serviceForm.scheduleType === "FIXED" && (
                                    <input className="fcw-input" type="number" value={serviceForm.durationMinutes} onChange={e => setServiceForm(v => ({ ...v, durationMinutes: e.target.value }))} placeholder="Минуты" />
                                  )}
                                  {serviceForm.scheduleType === "FLEXIBLE" && (
                                    <span className="fcw-body-s fcw-text-tertiary" style={{ alignSelf: "center" }}>Вы свяжетесь с клиентом</span>
                                  )}
                                  {serviceForm.scheduleType === "APPOINTMENT" && (
                                    <input className="fcw-input" value={serviceForm.durationMinutes} onChange={e => setServiceForm(v => ({ ...v, durationMinutes: e.target.value }))} placeholder="Часы работы" />
                                  )}
                                </div>
                                <input className="fcw-input" value={serviceForm.description} onChange={e => setServiceForm(v => ({ ...v, description: e.target.value }))} placeholder="Описание или сценарий выполнения" />
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateService}><Check size={14} />Сохранить</button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetServiceForm}>Отмена</button>
                                </div>
                              </div>
                            ) : (
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
                                <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", marginTop: "0.25rem" }}>
                                  {s.durationMinutes > 0 && (
                                    <span className="fcw-body-s fcw-text-secondary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                                      <Clock3 size={11} />{s.durationMinutes} мин
                                    </span>
                                  )}
                                  {(s as any).scheduleType && (s as any).scheduleType !== "FIXED" && (
                                    <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)" }}>
                                      {(s as any).scheduleType === "FLEXIBLE" ? "Свяжемся с вами" : "По записи"}
                                    </span>
                                  )}
                                </div>
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
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Branches */}
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
                    <Card padding="lg">
                      <div
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                          event.preventDefault();
                          handleImportFiles(event.dataTransfer.files);
                        }}
                        style={{
                          border: "1px dashed var(--fcw-color-border-strong)",
                          borderRadius: "var(--fcw-radius-lg)",
                          padding: "2rem",
                          backgroundColor: "var(--fcw-color-surface-secondary)",
                          textAlign: "center",
                        }}
                      >
                        <Upload size={28} style={{ color: "var(--fcw-color-primary)", marginBottom: "0.75rem" }} />
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>Перетащите файл сюда</h3>
                        <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.35rem 0 1rem" }}>
                          Поддерживаются XLSX, TXT, MD и PDF. Другие форматы можно выбрать, но они не будут загружены.
                        </p>
                        <label className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ display: "inline-flex" }}>
                          <Upload size={14} />
                          Выбрать файл
                          <input
                            type="file"
                            multiple
                            onChange={event => handleImportFiles(event.target.files || [])}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>

                      {importFiles.length > 0 && (
                        <div className="fcw-flex-col" style={{ gap: "0.5rem", marginTop: "var(--fcw-space-md)" }}>
                          {importFiles.map(file => (
                            <div key={`${file.name}-${file.size}`} className="fcw-flex-between" style={{ gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)" }}>
                              <span className="fcw-body-s">{file.name}</span>
                              <span className="fcw-body-xs fcw-text-tertiary">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {importStatus && (
                        <div className="fcw-body-s" style={{ marginTop: "var(--fcw-space-md)", color: importStatus.includes("не поддерживается") || importStatus.includes("Ошибка") ? "var(--fcw-color-error)" : "var(--fcw-color-accent)" }}>
                          {importStatus}
                        </div>
                      )}

                      <div className="fcw-flex" style={{ gap: "0.75rem", marginTop: "var(--fcw-space-md)" }}>
                        <button className="fcw-btn fcw-btn-primary" onClick={handleUploadImport} disabled={importBusy || importFiles.length === 0 || !branches.length}>
                          {importBusy ? <Loader2 className="fcw-animate-spin" size={16} /> : <Upload size={16} />}
                          Загрузить
                        </button>
                        <button className="fcw-btn fcw-btn-secondary" onClick={() => {
                          setImportFiles([]);
                          setImportStatus("");
                        }} disabled={importBusy || importFiles.length === 0}>
                          Очистить
                        </button>
                      </div>
                    </Card>
                    <div style={{ marginTop: "var(--fcw-space-lg)" }}>
                      <Card padding="lg">
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>Настройки импорта</h3>
                        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">Филиал импорта</label>
                            <select
                              className="fcw-input"
                              value={importBranchId || activeBranchId}
                              onChange={event => setImportBranchId(event.target.value)}
                              style={{ width: "100%", maxWidth: "320px" }}
                            >
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
                  <div style={{ maxWidth: "640px", margin: "0 auto" }}>
                    <h2 className="fcw-h2" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>Кабинет компании</h2>
                    <ProfileEditor
                      profile={profile}
                      onChange={setProfile}
                      onSave={handleSaveProfile}
                      busy={busy}
                      readOnly={isStaff}
                    />
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
