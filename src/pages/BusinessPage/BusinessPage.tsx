import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
import { Select } from "../../shared/ui/Select/Select";
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


export function BusinessPage() {
  const { state } = useAuth();
  const { reduced } = useMotion();
  const { t } = useTranslation();
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

  const sidebarItems: { key: BusinessSection; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("business.overview"), icon: <Layout size={18} /> },
    { key: "products", label: t("business.products"), icon: <Package size={18} /> },
    { key: "services", label: t("business.services"), icon: <Briefcase size={18} /> },
    { key: "events", label: t("business.events"), icon: <Calendar size={18} /> },
    { key: "business-card", label: t("business.businessCard"), icon: <Sparkles size={18} /> },
    { key: "profile", label: t("business.profile"), icon: <UserRound size={18} /> },
  ];

  const profileSubtabs: { key: ProfileSubtab; label: string; icon: React.ReactNode }[] = [
    { key: "brand", label: t("business.brand"), icon: <UserRound size={14} /> },
  ];

  function taskStatusLabel(status: SupplierTask["status"]) {
    if (status === "answered") return t("business.status.confirmed");
    if (status === "needs_reply") return t("business.status.needsReply");
    return t("business.status.discussing");
  }

  function taskBudgetLabel(task: SupplierTask) {
    return task.category ? task.category : t("business.budgetUnspecified");
  }

  function formatStaffStatus(status: string) {
    if (status === "PENDING_ACTIVATION") return t("business.staffStatus.pendingActivation");
    if (status === "PASSWORD_RESET_REQUIRED") return t("business.staffStatus.passwordResetRequired");
    if (status === "ACTIVE") return t("business.status.active");
    if (status === "DISABLED") return t("business.status.disabled");
    return status;
  }

  const quickActions = [
    { label: t("business.product.add"), icon: <Package size={16} />, onClick: () => setSection("products") },
    { label: t("business.service.add"), icon: <Briefcase size={16} />, onClick: () => setSection("services") },
    { label: t("business.importData"), icon: <Upload size={16} />, onClick: () => setSection("import") },
    { label: t("business.profile"), icon: <UserRound size={16} />, onClick: () => setSection("profile") },
    { label: t("business.businessCard"), icon: <Sparkles size={16} />, onClick: () => setSection("business-card") },
  ];

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
      toast.show(e instanceof ApiError ? e.message : t("business.toast.loadError"), "error");
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
      toast.show(t("business.toast.profileSaved"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.saveError"), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDrop = async (data: Partial<BrandDropDto>) => {
    if (!businessId) {
      toast.show(t("business.toast.sessionNotFound"), "error");
      return;
    }
    try {
      const created = await createDrop(businessId, data);
      setDrops(current => [created, ...current]);
      toast.show(t("business.toast.dropCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.dropCreateError"), "error");
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
    toast.show(t("business.toast.cardSaved"), "success");
  };

  const handlePublishCard = async () => {
    if (!businessId) return;
    const res = await publishBusinessCard(businessId);
    setCardBlocks(res.blocks as unknown as CardBlock[]);
    setCardPublishedAt(res.publishedAt || null);
    toast.show(t("business.toast.cardPublished"), "success");
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
      toast.show(t("business.toast.selectCategory"), "error");
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
      toast.show(t("business.toast.productCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.productCreateError"), "error");
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
      toast.show(t("business.toast.productUpdated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.updateError"), "error");
    }
  };

  const handleDeleteProduct = async (product: BusinessProductDto) => {
    if (!activeBranchId) return;
    try {
      await deleteProduct(activeBranchId, product.productOfferId);
      loadProducts();
      toast.show(t("business.toast.productDeleted"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.deleteError"), "error");
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
      toast.show(t("business.toast.selectServiceCategory"), "error");
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
      toast.show(t("business.toast.serviceCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.serviceCreateError"), "error");
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
      toast.show(t("business.toast.serviceUpdated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.updateError"), "error");
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
      toast.show(t("business.toast.sessionNotFound"), "error");
      return;
    }
    if (!branchForm.name.trim()) {
      toast.show(t("business.toast.enterBranchName"), "error");
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
      toast.show(t("business.toast.branchCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.branchCreateError"), "error");
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
      toast.show(t("business.toast.staffAdded"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.staffAddError"), "error");
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
      toast.show(t("business.toast.passwordReset"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.passwordResetError"), "error");
    } finally {
      setStaffBusy("");
    }
  };

  const handleImportFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    const allowed = nextFiles.filter(file => /\.(xlsx|txt|md|pdf)$/i.test(file.name));
    const rejected = nextFiles.filter(file => !allowed.includes(file));
    setImportFiles(allowed);
    setImportStatus(rejected.length > 0 ? t("business.importUnsupportedFormat") : "");
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
      setImportStatus(t("business.importFilesUploaded", { count: importFiles.length }));
    } catch (e) {
      setImportStatus(e instanceof ApiError ? e.message : t("business.importUploadError"));
    } finally {
      setImportBusy(false);
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
              <button className="fcw-btn fcw-btn-ghost fcw-btn-icon" onClick={() => setSidebarOpen(true)} aria-label={t("business.menu")}>
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0",
                marginBottom: "var(--fcw-space-lg)",
                borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: profile.brandColor || DEFAULT_BRAND_COLOR,
                  flexShrink: 0,
                }} />
                <span className="fcw-body fcw-weight-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {state.session?.business?.businessName || t("business.companyCabinet")}
                </span>
                <span className="fcw-label" style={{
                  color: isStaff ? "var(--fcw-color-text-tertiary)" : "var(--fcw-color-primary)",
                  backgroundColor: isStaff ? "var(--fcw-color-surface-secondary)" : "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "var(--fcw-radius-full)",
                  flexShrink: 0,
                }}>
                  {isStaff ? t("business.staff") : t("business.owner")}
                </span>
                <div style={{ flex: 1 }} />
                {branches.length > 0 && (
                  <Select
                    size="sm"
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                    value={activeBranchId}
                    onChange={(v) => { setSelectedBranchId(v); setImportBranchId(v); }}
                  />
                )}
              </div>

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
                            <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.clientRequests")}</h2>
                            <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>{filteredTasks.length}</span>
                          </div>
                          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
                            {t("business.allRequests")}
                          </p>
                        </div>
                        <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                          <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
                            {([
                              ["all", t("business.filter.all")],
                              ["discussing", t("business.filter.discussing")],
                              ["confirmed", t("business.filter.confirmed")],
                              ["declined", t("business.filter.rejected")],
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
                              ["cards", <Grid3X3 size={14} />, t("business.cards")],
                              ["rows", <List size={14} />, t("business.rows")],
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
                          { label: t("business.new"), value: discussingTasks.length },
                          { label: t("business.needsReply"), value: replyTasks.length },
                          { label: t("business.status.confirmed"), value: confirmedTasks.length },
                          { label: t("business.filter.rejected"), value: declinedTasks.length },
                        ].map(item => (
                          <div key={item.label} style={{ padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)" }}>
                            <span className="fcw-body-xs fcw-text-tertiary">{item.label}</span>
                            <div className="fcw-h3" style={{ margin: 0 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {filteredTasks.length === 0 && (
                        <EmptyState title={t("business.noRequests")} description={t("business.noRequestsDesc")} />
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
                                <span className="fcw-body-s fcw-text-tertiary">{t("business.client")} · {task.customerArea || t("business.areaUnspecified")}</span>
                                <span className="fcw-body-s fcw-text-tertiary">{t("business.messagesCount")}</span>
                              </div>
                              <div className="fcw-flex" style={{ gap: "0.5rem", marginTop: "0.875rem" }}>
                                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm"><MessageCircle size={14} />{t("business.open")}</button>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm"><Reply size={14} />{t("business.reply")}</button>
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
                              <button className="fcw-btn fcw-btn-primary fcw-btn-sm"><Reply size={14} />{t("business.reply")}</button>
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
                        <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.products")}</h2>
                        {productsTotal > 0 && (
                          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>{t("business.total", { count: productsTotal })}</p>
                        )}
                      </div>
                      {!isStaff && (
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setSection("import")}>
                            <Upload size={16} />{t("business.import.title")}
                          </button>
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { resetProductForm(); setShowProductForm(true); }}>
                            <Plus size={16} />{t("business.product.add")}
                          </button>
                        </div>
                      )}
                    </div>

                    {!activeBranchId && (
                      <EmptyState title={t("business.noBranches")} description={t("business.noBranchesDesc")} />
                    )}

                    {activeBranchId && productsBusy && <Loading size="sm" text={t("business.loadingProducts")} />}

                    {activeBranchId && !productsBusy && products.length === 0 && !showProductForm && (
                      <EmptyState
                        title={t("business.noProducts")}
                        description={t("business.noProductsDesc")}
                        action={!isStaff ? (
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowProductForm(true)}>
                            <Plus size={16} />{t("business.product.add")}
                          </button>
                        ) : undefined}
                      />
                    )}

                    {activeBranchId && !productsBusy && (
                      <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
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
                                    {t("business.newProduct")}
                                  </h3>
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.product.namePlaceholder")}
                                    value={productForm.name}
                                    onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                                  />
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.product.descriptionPlaceholder")}
                                    value={productForm.description}
                                    onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                                  />
                                  <Select
                                    options={flattenCategories(categories).map(c => ({ value: c.id, label: c.name }))}
                                    value={productForm.categoryId}
                                    onChange={v => setProductForm(p => ({ ...p, categoryId: v }))}
                                    placeholder={t("business.product.categoryPlaceholder")}
                                    style={{ maxWidth: "320px" }}
                                  />
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.product.pricePlaceholder")}
                                    type="number"
                                    value={productForm.price}
                                    onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                                    style={{ maxWidth: "200px" }}
                                  />
                                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateProduct}>
                                      <Check size={14} />{t("business.create")}
                                    </button>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>{t("business.cancel")}</button>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {products.map(p => (
                          <div key={p.productOfferId} style={{
                            display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--fcw-color-surface)",
                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            borderRadius: "var(--fcw-radius-md)",
                          }}>
                            {editProduct?.productOfferId === p.productOfferId ? (
                              <div className="fcw-flex-col" style={{ gap: "0.75rem", width: "100%" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(120px, 180px)", gap: "0.75rem" }}>
                                  <input className="fcw-input" value={productForm.name} onChange={e => setProductForm(v => ({ ...v, name: e.target.value }))} placeholder={t("business.product.namePlaceholder")} />
                                  <input className="fcw-input" type="number" value={productForm.price} onChange={e => setProductForm(v => ({ ...v, price: e.target.value }))} placeholder={t("business.product.pricePlaceholder")} />
                                </div>
                                <input className="fcw-input" value={productForm.description} onChange={e => setProductForm(v => ({ ...v, description: e.target.value }))} placeholder={t("business.product.descriptionPlaceholder")} />
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateProduct}><Check size={14} />{t("business.save")}</button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>{t("business.cancel")}</button>
                                </div>
                              </div>
                            ) : (
                            <>
                              <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "120px" }}>
                                {p.name}
                              </span>
                              {p.categoryLabel && (
                                <span className="fcw-body-s fcw-text-tertiary">{p.categoryLabel}</span>
                              )}
                              {!p.enabled && (
                                <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>{t("business.hidden")}</span>
                              )}
                              <div style={{ flex: 1 }} />
                              <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>
                                {p.price > 0 ? `${p.price.toLocaleString("ru-KZ")} ₸` : "—"}
                              </span>
                              {!isStaff && (
                                <div className="fcw-flex" style={{ gap: "0.25rem" }}>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => openEditProduct(p)} aria-label={t("business.editAria")}>
                                    <Edit3 size={14} />
                                  </button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => handleDeleteProduct(p)} aria-label={t("business.deleteAria")}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Services */}
                {section === "services" && (
                  <div>
                    <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
                      <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.services")}</h2>
                      {!isStaff && (
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setSection("import")}>
                            <Upload size={16} />{t("business.import.title")}
                          </button>
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { resetServiceForm(); setShowServiceForm(true); }}>
                            <Plus size={16} />{t("business.service.add")}
                          </button>
                        </div>
                      )}
                    </div>

                    {!activeBranchId && (
                      <EmptyState title={t("business.noBranches")} description={t("business.noBranchesDesc")} />
                    )}

                    {activeBranchId && servicesBusy && <Loading size="sm" text={t("business.loadingServices")} />}

                    {activeBranchId && !servicesBusy && services.length === 0 && !showServiceForm && (
                      <EmptyState
                        title={t("business.noServices")}
                        description={t("business.noServicesDesc")}
                        action={!isStaff ? (
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowServiceForm(true)}>
                            <Plus size={16} />{t("business.service.add")}
                          </button>
                        ) : undefined}
                      />
                    )}

                    {activeBranchId && !servicesBusy && (
                      <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
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
                                    {t("business.newService")}
                                  </h3>
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.service.namePlaceholder")}
                                    value={serviceForm.name}
                                    onChange={e => setServiceForm(s => ({ ...s, name: e.target.value }))}
                                  />
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.service.descriptionPlaceholder")}
                                    value={serviceForm.description}
                                    onChange={e => setServiceForm(s => ({ ...s, description: e.target.value }))}
                                  />
                                  <Select
                                    options={[
                                      { value: "FIXED", label: t("business.scheduleFixed") },
                                      { value: "FLEXIBLE", label: t("business.scheduleFlexible") },
                                      { value: "APPOINTMENT", label: t("business.scheduleAppointment") },
                                    ]}
                                    value={serviceForm.scheduleType}
                                    onChange={v => setServiceForm(s => ({ ...s, scheduleType: v as "FIXED" | "FLEXIBLE" | "APPOINTMENT" }))}
                                    style={{ maxWidth: "260px" }}
                                  />
                                  <div className="fcw-flex" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.service.pricePlaceholder")}
                                      type="number"
                                      value={serviceForm.basePrice}
                                      onChange={e => setServiceForm(s => ({ ...s, basePrice: e.target.value }))}
                                      style={{ maxWidth: "160px" }}
                                    />
                                    {serviceForm.scheduleType === "FIXED" && (
                                      <input
                                        className="fcw-input"
                                        placeholder={t("business.service.durationPlaceholder")}
                                        type="number"
                                        value={serviceForm.durationMinutes}
                                        onChange={e => setServiceForm(s => ({ ...s, durationMinutes: e.target.value }))}
                                        style={{ maxWidth: "160px" }}
                                      />
                                    )}
                                    {serviceForm.scheduleType === "FLEXIBLE" && (
                                      <span className="fcw-body-s fcw-text-tertiary" style={{ alignSelf: "center", maxWidth: "160px" }}>{t("business.scheduleFlexibleHint")}</span>
                                    )}
                                    {serviceForm.scheduleType === "APPOINTMENT" && (
                                      <input
                                        className="fcw-input"
                                        placeholder={t("business.service.hoursPlaceholder")}
                                        value={serviceForm.durationMinutes}
                                        onChange={e => setServiceForm(s => ({ ...s, durationMinutes: e.target.value }))}
                                        style={{ maxWidth: "260px" }}
                                      />
                                    )}
                                  </div>
                                  <Select
                                    options={flattenCategories(categories).map(c => ({ value: c.id, label: c.name }))}
                                    value={serviceForm.categoryId}
                                    onChange={v => setServiceForm(s => ({ ...s, categoryId: v }))}
                                    placeholder={t("business.service.categoryPlaceholder")}
                                    style={{ maxWidth: "320px" }}
                                  />
                                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateService}>
                                      <Check size={14} />{t("business.create")}
                                    </button>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetServiceForm}>{t("business.cancel")}</button>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {services.map(s => (
                          <div key={s.serviceBranchOfferId} style={{
                            display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--fcw-color-surface)",
                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            borderRadius: "var(--fcw-radius-md)",
                          }}>
                            {editService?.serviceBranchOfferId === s.serviceBranchOfferId ? (
                              <div className="fcw-flex-col" style={{ gap: "0.75rem", width: "100%" }}>
                                <Select
                                  options={[
                                    { value: "FIXED", label: t("business.scheduleFixed") },
                                    { value: "FLEXIBLE", label: t("business.scheduleFlexible") },
                                    { value: "APPOINTMENT", label: t("business.scheduleAppointment") },
                                  ]}
                                  value={serviceForm.scheduleType}
                                  onChange={v => setServiceForm(v2 => ({ ...v2, scheduleType: v as "FIXED" | "FLEXIBLE" | "APPOINTMENT" }))}
                                  style={{ maxWidth: "260px" }}
                                />
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(110px, 160px) minmax(110px, 160px)", gap: "0.75rem" }}>
                                  <input className="fcw-input" value={serviceForm.name} onChange={e => setServiceForm(v => ({ ...v, name: e.target.value }))} placeholder={t("business.service.namePlaceholder")} />
                                  <input className="fcw-input" type="number" value={serviceForm.basePrice} onChange={e => setServiceForm(v => ({ ...v, basePrice: e.target.value }))} placeholder={t("business.service.pricePlaceholder")} />
                                  {serviceForm.scheduleType === "FIXED" && (
                                    <input className="fcw-input" type="number" value={serviceForm.durationMinutes} onChange={e => setServiceForm(v => ({ ...v, durationMinutes: e.target.value }))} placeholder={t("business.service.minutesPlaceholder")} />
                                  )}
                                  {serviceForm.scheduleType === "FLEXIBLE" && (
                                    <span className="fcw-body-s fcw-text-tertiary" style={{ alignSelf: "center" }}>{t("business.scheduleFlexibleHint")}</span>
                                  )}
                                  {serviceForm.scheduleType === "APPOINTMENT" && (
                                    <input className="fcw-input" value={serviceForm.durationMinutes} onChange={e => setServiceForm(v => ({ ...v, durationMinutes: e.target.value }))} placeholder={t("business.service.hoursPlaceholder")} />
                                  )}
                                </div>
                                <input className="fcw-input" value={serviceForm.description} onChange={e => setServiceForm(v => ({ ...v, description: e.target.value }))} placeholder={t("business.service.descriptionPlaceholder")} />
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateService}><Check size={14} />{t("business.save")}</button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetServiceForm}>{t("business.cancel")}</button>
                                </div>
                              </div>
                            ) : (
                            <>
                              <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "120px" }}>
                                {s.name}
                              </span>
                              {(s as any).scheduleType && (s as any).scheduleType !== "FIXED" && (
                                <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>
                                  {(s as any).scheduleType === "FLEXIBLE" ? t("business.scheduleFlexibleLabel") : t("business.scheduleAppointmentLabel")}
                                </span>
                              )}
                              {s.durationMinutes > 0 && (
                                <span className="fcw-body-s fcw-text-secondary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                                  <Clock3 size={11} />{s.durationMinutes}{t("business.minutes")}
                                </span>
                              )}
                              {!s.active && (
                                <span className="fcw-label" style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }}>{t("business.inactive")}</span>
                              )}
                              <div style={{ flex: 1 }} />
                              <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>
                                {s.basePrice > 0 ? `${s.basePrice.toLocaleString("ru-KZ")} ₸` : "—"}
                              </span>
                              {!isStaff && (
                                <div className="fcw-flex" style={{ gap: "0.25rem" }}>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => openEditService(s)} aria-label={t("business.editAria")}>
                                    <Edit3 size={14} />
                                  </button>
                                </div>
                              )}
                            </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Branches */}
                {/* Events */}
                {section === "events" && (
                  <DropsEditor
                    drops={drops}
                    onCreate={handleCreateDrop}
                    onCancel={handleCancelDrop}
                    onDelete={handleDeleteDrop}
                    busy={busy}
                    readOnly={isStaff}
                  />
                )}

                {/* Import data */}
                {section === "import" && (
                  <div>
                    <h2 className="fcw-h2" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>{t("business.importData")}</h2>
                    <p className="fcw-body fcw-text-secondary" style={{ marginBottom: "var(--fcw-space-lg)" }}>
                      {t("business.importDesc")}
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
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>{t("business.importDragHere")}</h3>
                        <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.35rem 0 1rem" }}>
                          {t("business.importFormats")}
                        </p>
                        <label className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ display: "inline-flex" }}>
                          <Upload size={14} />
                          {t("business.importSelectFile")}
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
                        <div className="fcw-body-s" style={{ marginTop: "var(--fcw-space-md)", color: "var(--fcw-color-text-secondary)" }}>
                          {importStatus}
                        </div>
                      )}

                      <div className="fcw-flex" style={{ gap: "0.75rem", marginTop: "var(--fcw-space-md)" }}>
                        <button className="fcw-btn fcw-btn-primary" onClick={handleUploadImport} disabled={importBusy || importFiles.length === 0 || !branches.length}>
                          {importBusy ? <Loader2 className="fcw-animate-spin" size={16} /> : <Upload size={16} />}
                          {t("business.importUpload")}
                        </button>
                        <button className="fcw-btn fcw-btn-secondary" onClick={() => {
                          setImportFiles([]);
                          setImportStatus("");
                        }} disabled={importBusy || importFiles.length === 0}>
                          {t("business.importClear")}
                        </button>
                      </div>
                    </Card>
                    <div style={{ marginTop: "var(--fcw-space-lg)" }}>
                      <Card padding="lg">
                        <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>{t("business.importSettings")}</h3>
                        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">{t("business.importBranch")}</label>
                            <Select
                              options={branches.map(b => ({ value: b.id, label: b.name }))}
                              value={importBranchId || activeBranchId}
                              onChange={v => setImportBranchId(v)}
                              placeholder={branches.length === 0 ? t("business.noBranchesOption") : undefined}
                              style={{ width: "100%", maxWidth: "320px" }}
                            />
                          </div>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">{t("business.importLanguage")}</label>
                            <Select
                              options={[
                                { value: "ru", label: t("business.russian") },
                                { value: "kk", label: t("business.kazakh") },
                              ]}
                              value="ru"
                              onChange={() => {}}
                              style={{ width: "100%", maxWidth: "320px" }}
                            />
                          </div>
                          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                            <label className="fcw-body-s fcw-weight-medium">{t("business.importWhat")}</label>
                            <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                              <button className="fcw-btn fcw-btn-primary fcw-btn-sm">{t("business.products")}</button>
                              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm">{t("business.services")}</button>
                            </div>
                          </div>
                          <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked />
                            <span className="fcw-body-s">{t("business.importHasHeaders")}</span>
                          </label>
                          <label className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", cursor: "pointer" }}>
                            <input type="checkbox" />
                            <span className="fcw-body-s">{t("business.importUpdateExisting")}</span>
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
                          {t("business.importWarning")}
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
                  <div>
                    <h2 className="fcw-h2" style={{ margin: "0 0 var(--fcw-space-md) 0" }}>{t("business.companyCabinet")}</h2>
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
