import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MapLocationPicker from "../../widgets/MapLocationPicker/MapLocationPicker";
import {
  Package, Briefcase, Building2, UserRound,
  Sparkles, Plus, RefreshCw, Loader2,
  ChevronDown, Menu, X, MapPin, Trash2, Edit3, Check, Layout,
  Calendar, Upload, MessageCircle, Reply, Link2
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
import { ProductImportWizard } from "../../widgets/ProductImportWizard/ProductImportWizard";
import {
  getBrandProfile, listDrops,
  updateBrandProfile,
  createDrop, cancelDrop, deleteDrop,
  listProducts, createProduct, updateProduct, deleteProduct,
  listServices, createService, updateService,
  listBranches, createBranch, updateBranch,
  getSupplierTasks,
  listCategories, listStaff, createStaff, resetStaffPassword,
  listCities, parseTwoGisLink,
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
  latitude: number;
  longitude: number;
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
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [gisLink, setGisLink] = useState("");
  const [gisParsing, setGisParsing] = useState(false);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Products
  const [products, setProducts] = useState<BusinessProductDto[]>([]);
  const [productsPage, setProductsPage] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<BusinessProductDto | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", categoryId: "", imageUrl: "" });
  const [productsBusy, setProductsBusy] = useState(false);

  // Services
  const [services, setServices] = useState<BusinessServiceDto[]>([]);
  const [servicesBusy, setServicesBusy] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editService, setEditService] = useState<BusinessServiceDto | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", basePrice: "", categoryId: "", scheduleType: "FIXED" as "FIXED" | "FLEXIBLE" | "APPOINTMENT", imageUrl: "" });

  // Branches
  const [branchesBusy, setBranchesBusy] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editBranchId, setEditBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", cityId: "", latitude: null as number | null, longitude: null as number | null });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [staffByBranch, setStaffByBranch] = useState<Record<string, StaffDto[]>>({});
  const [staffForms, setStaffForms] = useState<Record<string, { displayName: string; email: string }>>({});
  const [staffBusy, setStaffBusy] = useState("");

  // Overview
  const [tasks, setTasks] = useState<SupplierTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
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
    { key: "branches", label: t("business.branches"), icon: <MapPin size={18} /> },
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
  useEffect(() => {
    listCities().then(setCities).catch(() => setCities([]));
  }, []);
  useEffect(() => { if (section === "products" || section === "overview") loadProducts(); }, [section, loadProducts]);
  useEffect(() => { if (section === "services" || section === "overview") loadServices(); }, [section, loadServices]);
  useEffect(() => { if (section === "overview") { loadTasks(); } }, [section, loadTasks]);

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

  // Product CRUD
  const resetProductForm = () => {
    setProductForm({ name: "", description: "", price: "", categoryId: "", imageUrl: "" });
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
        imageUrl: productForm.imageUrl || undefined,
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
        imageUrl: productForm.imageUrl || undefined,
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
      imageUrl: p.imageUrl || "",
    });
    setShowProductForm(false);
  };

  // Service CRUD
  const resetServiceForm = () => {
    setServiceForm({ name: "", description: "", basePrice: "", categoryId: "", scheduleType: "FIXED", imageUrl: "" });
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
        scheduleType: serviceForm.scheduleType,
        imageUrl: serviceForm.imageUrl || undefined,
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
        scheduleType: serviceForm.scheduleType,
        imageUrl: serviceForm.imageUrl || undefined,
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
      categoryId: s.categoryId || "",
      scheduleType: (s as any).scheduleType || "FIXED",
      imageUrl: s.imageUrl || "",
    });
    setShowServiceForm(false);
  };

  const handleParseGisLink = async () => {
    if (!gisLink.trim()) return;
    setGisParsing(true);
    try {
      const result = await parseTwoGisLink(gisLink.trim());
      if (result.found && result.latitude != null && result.longitude != null) {
        setBranchForm(p => ({ ...p, latitude: result.latitude!, longitude: result.longitude! }));
        toast.show(t("business.branch.2gisParsed"), "success");
      } else {
        toast.show(t("business.branch.2gisParseError"), "error");
      }
    } catch {
      toast.show(t("business.branch.2gisParseError"), "error");
    } finally {
      setGisParsing(false);
    }
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
    if (branchForm.latitude == null || branchForm.longitude == null) {
      toast.show(t("business.toast.branchLocationRequired"), "error");
      return;
    }
    try {
      const created = await createBranch(businessId, {
        name: branchForm.name.trim(),
        address: branchForm.address || undefined,
        cityId: branchForm.cityId || undefined,
        latitude: branchForm.latitude,
        longitude: branchForm.longitude,
      });
      setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
      setGisLink("");
      setShowBranchForm(false);
      setSelectedBranchId(created.id);
      setImportBranchId(created.id);
      loadBranches();
      toast.show(t("business.toast.branchCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.branchCreateError"), "error");
    }
  };

  const handleUpdateBranch = async () => {
    if (!businessId || !editBranchId) return;
    if (!branchForm.name.trim()) {
      toast.show(t("business.toast.enterBranchName"), "error");
      return;
    }
    try {
      await updateBranch(businessId, editBranchId, {
        name: branchForm.name.trim() || undefined,
        address: branchForm.address || undefined,
        cityId: branchForm.cityId || undefined,
        latitude: branchForm.latitude ?? undefined,
        longitude: branchForm.longitude ?? undefined,
      });
      setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
      setGisLink("");
      setEditBranchId(null);
      loadBranches();
      toast.show(t("business.toast.branchUpdated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.updateError"), "error");
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
                  <Card padding="lg" style={{ marginBottom: "var(--fcw-space-lg)" }}>
                    <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "1rem", marginBottom: "var(--fcw-space-md)" }}>
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
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="fcw-grid-4" style={{ gap: "0.5rem", marginBottom: "var(--fcw-space-md)" }}>
                      {[
                        { label: t("business.new"), value: discussingTasks.length },
                        { label: t("business.needsReply"), value: replyTasks.length },
                        { label: t("business.status.confirmed"), value: confirmedTasks.length },
                        { label: t("business.filter.rejected"), value: declinedTasks.length },
                      ].map(item => (
                        <div
                          key={item.label}
                          style={{ padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: "var(--fcw-color-surface-secondary)", cursor: "pointer" }}
                          onClick={() => setTaskFilter(item.label === t("business.new") ? "discussing" : item.label === t("business.needsReply") ? "discussing" : item.label === t("business.status.confirmed") ? "confirmed" : item.label === t("business.filter.rejected") ? "declined" : "all")}
                        >
                          <span className="fcw-body-xs fcw-text-tertiary">{item.label}</span>
                          <div className="fcw-h3" style={{ margin: 0 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Requests content */}
                    <>
                      {filteredTasks.length === 0 && (
                        <EmptyState title={t("business.noRequests")} description={t("business.noRequestsDesc")} />
                      )}

                      {filteredTasks.length > 0 && (
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
                    </>
                  </Card>
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
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "0.75rem" }}>
                                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                      <label className="fcw-label">{t("business.product.name")}</label>
                                      <input
                                        className="fcw-input"
                                        placeholder={t("business.product.namePlaceholder")}
                                        value={productForm.name}
                                        onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                                      />
                                    </div>
                                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                      <label className="fcw-label">{t("business.product.category")}</label>
                                      <Select
                                        options={flattenCategories(categories).map(c => ({ value: c.id, label: c.name }))}
                                        value={productForm.categoryId}
                                        onChange={v => setProductForm(p => ({ ...p, categoryId: v }))}
                                        placeholder={t("business.product.categoryPlaceholder")}
                                      />
                                    </div>
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem", maxWidth: "200px" }}>
                                    <label className="fcw-label">{t("business.product.price")}</label>
                                    <input
                                      className="fcw-input"
                                      type="text"
                                      inputMode="decimal"
                                      placeholder={t("business.product.pricePlaceholder")}
                                      value={productForm.price}
                                      onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                                    />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.product.description")}</label>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.product.descriptionPlaceholder")}
                                      value={productForm.description}
                                      onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                                    />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.product.imageUrlPlaceholder")}</label>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.product.imageUrlPlaceholder")}
                                      value={productForm.imageUrl}
                                      onChange={e => setProductForm(p => ({ ...p, imageUrl: e.target.value }))}
                                    />
                                  </div>
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
                              <Card padding="md" style={{ width: "100%" }}>
                                <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                  <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Edit3 size={16} style={{ color: "var(--fcw-color-primary)" }} />
                                    {t("business.product.editTitle")}
                                  </h3>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "0.75rem" }}>
                                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                      <label className="fcw-label">{t("business.product.name")}</label>
                                      <input className="fcw-input" value={productForm.name} onChange={e => setProductForm(v => ({ ...v, name: e.target.value }))} placeholder={t("business.product.namePlaceholder")} />
                                    </div>
                                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                      <label className="fcw-label">{t("business.product.price")}</label>
                                      <input className="fcw-input" type="text" inputMode="decimal" value={productForm.price} onChange={e => setProductForm(v => ({ ...v, price: e.target.value }))} placeholder={t("business.product.pricePlaceholder")} />
                                    </div>
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.product.description")}</label>
                                    <input className="fcw-input" value={productForm.description} onChange={e => setProductForm(v => ({ ...v, description: e.target.value }))} placeholder={t("business.product.descriptionPlaceholder")} />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.product.imageUrlPlaceholder")}</label>
                                    <input className="fcw-input" value={productForm.imageUrl} onChange={e => setProductForm(v => ({ ...v, imageUrl: e.target.value }))} placeholder={t("business.product.imageUrlPlaceholder")} />
                                  </div>
                                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateProduct}><Check size={14} />{t("business.save")}</button>
                                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={resetProductForm}>{t("business.cancel")}</button>
                                  </div>
                                </div>
                              </Card>
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
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.service.name")}</label>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.service.namePlaceholder")}
                                      value={serviceForm.name}
                                      onChange={e => setServiceForm(s => ({ ...s, name: e.target.value }))}
                                    />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.service.description")}</label>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.service.descriptionPlaceholder")}
                                      value={serviceForm.description}
                                      onChange={e => setServiceForm(s => ({ ...s, description: e.target.value }))}
                                    />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem", maxWidth: "260px" }}>
                                    <label className="fcw-label">{t("business.service.schedule")}</label>
                                    <Select
                                      options={[
                                        { value: "FIXED", label: t("business.scheduleFixed") },
                                        { value: "FLEXIBLE", label: t("business.scheduleFlexible") },
                                        { value: "APPOINTMENT", label: t("business.scheduleAppointment") },
                                      ]}
                                      value={serviceForm.scheduleType}
                                      onChange={v => setServiceForm(s => ({ ...s, scheduleType: v as "FIXED" | "FLEXIBLE" | "APPOINTMENT" }))}
                                    />
                                  </div>
                                  <div className="fcw-flex" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
                                    <div className="fcw-flex-col" style={{ gap: "0.25rem", maxWidth: "160px" }}>
                                      <label className="fcw-label">{t("business.service.price")}</label>
                                      <input
                                        className="fcw-input"
                                        placeholder={t("business.service.pricePlaceholder")}
                                        type="text"
                                        inputMode="decimal"
                                        value={serviceForm.basePrice}
                                        onChange={e => setServiceForm(s => ({ ...s, basePrice: e.target.value }))}
                                      />
                                    </div>
                                    {serviceForm.scheduleType === "FLEXIBLE" && (
                                      <span className="fcw-body-s fcw-text-tertiary" style={{ alignSelf: "center", maxWidth: "160px" }}>{t("business.scheduleFlexibleHint")}</span>
                                    )}
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem", maxWidth: "320px" }}>
                                    <label className="fcw-label">{t("business.service.category")}</label>
                                    <Select
                                      options={flattenCategories(categories).map(c => ({ value: c.id, label: c.name }))}
                                      value={serviceForm.categoryId}
                                      onChange={v => setServiceForm(s => ({ ...s, categoryId: v }))}
                                      placeholder={t("business.service.categoryPlaceholder")}
                                    />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.service.imageUrlPlaceholder")}</label>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.service.imageUrlPlaceholder")}
                                      value={serviceForm.imageUrl}
                                      onChange={e => setServiceForm(s => ({ ...s, imageUrl: e.target.value }))}
                                    />
                                  </div>
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
                                <div className="fcw-flex-col" style={{ gap: "0.25rem", maxWidth: "260px" }}>
                                  <label className="fcw-label">{t("business.service.schedule")}</label>
                                  <Select
                                    options={[
                                      { value: "FIXED", label: t("business.scheduleFixed") },
                                      { value: "FLEXIBLE", label: t("business.scheduleFlexible") },
                                      { value: "APPOINTMENT", label: t("business.scheduleAppointment") },
                                    ]}
                                    value={serviceForm.scheduleType}
                                    onChange={v => setServiceForm(v2 => ({ ...v2, scheduleType: v as "FIXED" | "FLEXIBLE" | "APPOINTMENT" }))}
                                  />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(110px, 160px) minmax(110px, 160px)", gap: "0.75rem" }}>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.service.name")}</label>
                                    <input className="fcw-input" value={serviceForm.name} onChange={e => setServiceForm(v => ({ ...v, name: e.target.value }))} placeholder={t("business.service.namePlaceholder")} />
                                  </div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.service.price")}</label>
                                    <input className="fcw-input" type="text" inputMode="decimal" value={serviceForm.basePrice} onChange={e => setServiceForm(v => ({ ...v, basePrice: e.target.value }))} placeholder={t("business.service.pricePlaceholder")} />
                                  </div>
                                  {serviceForm.scheduleType === "FLEXIBLE" && (
                                    <span className="fcw-body-s fcw-text-tertiary" style={{ alignSelf: "center" }}>{t("business.scheduleFlexibleHint")}</span>
                                  )}
                                </div>
                                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <label className="fcw-label">{t("business.service.description")}</label>
                                  <input className="fcw-input" value={serviceForm.description} onChange={e => setServiceForm(v => ({ ...v, description: e.target.value }))} placeholder={t("business.service.descriptionPlaceholder")} />
                                </div>
                                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <label className="fcw-label">{t("business.service.imageUrlPlaceholder")}</label>
                                  <input className="fcw-input" value={serviceForm.imageUrl} onChange={e => setServiceForm(v => ({ ...v, imageUrl: e.target.value }))} placeholder={t("business.service.imageUrlPlaceholder")} />
                                </div>
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
                {section === "branches" && (
                  <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                    <div className="fcw-flex" style={{ alignItems: "center", gap: "0.5rem" }}>
                      <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.branches")}</h2>
                      <div style={{ flex: 1 }} />
                      {!isStaff && (
                        <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowBranchForm(v => !v)}>
                          <Plus size={16} />{t("business.branch.add")}
                        </button>
                      )}
                    </div>

                    {branchesBusy && <Loading size="sm" />}

                    {!branchesBusy && branches.length === 0 && !showBranchForm && (
                      <EmptyState
                        title={t("business.noBranches")}
                        description={t("business.noBranchesDesc")}
                      />
                    )}

                    <AnimatePresence>
                      {showBranchForm && (
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
                                {t("business.branch.add")}
                              </h3>
                              <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                <label className="fcw-label">{t("business.branch.name")}</label>
                                <input
                                  className="fcw-input"
                                  placeholder={t("business.branch.name")}
                                  value={branchForm.name}
                                  onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))}
                                />
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <label className="fcw-label">{t("business.branch.address")}</label>
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.branch.address")}
                                    value={branchForm.address}
                                    onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))}
                                  />
                                </div>
                                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <label className="fcw-label">{t("business.branch.city")}</label>
                                  <Select
                                    options={cities.map(c => ({ value: c.id, label: c.name }))}
                                    value={branchForm.cityId}
                                    onChange={v => setBranchForm(p => ({ ...p, cityId: v }))}
                                    placeholder={t("business.branch.city")}
                                  />
                                </div>
                              </div>
                              <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                                <span className="fcw-body-s fcw-weight-medium" style={{ color: "var(--fcw-color-text-secondary)" }}>
                                  {t("business.branch.location")}
                                </span>
                                <span className="fcw-body-xs" style={{ color: "var(--fcw-color-text-tertiary)" }}>
                                  {t("business.branch.2gisGuide")}
                                </span>
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.branch.2gisLinkPlaceholder")}
                                    value={gisLink}
                                    onChange={e => setGisLink(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleParseGisLink(); }}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                    onClick={handleParseGisLink}
                                    disabled={gisParsing || !gisLink.trim()}
                                  >
                                    {gisParsing ? <Loader2 size={14} className="fcw-animate-spin" /> : <Link2 size={14} />}
                                    {t("business.branch.extractCoords")}
                                  </button>
                                </div>
                                {branchForm.latitude != null && branchForm.longitude != null && (
                                  <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
                                    <span className="fcw-body-s" style={{ color: "var(--fcw-color-accent)" }}>
                                      {branchForm.latitude.toFixed(6)}, {branchForm.longitude.toFixed(6)}
                                    </span>
                                    <a
                                      className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                      style={{ textDecoration: "none" }}
                                      href={`https://2gis.kz/geo/${branchForm.longitude},${branchForm.latitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MapPin size={14} />{t("business.branch.openIn2gis")}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                onClick={() => setShowMapPicker(v => !v)}
                                style={{ alignSelf: "flex-start", gap: "0.375rem" }}
                              >
                                <MapPin size={14} />
                                {t("business.branch.pickOnMap")}
                              </button>
                              {showMapPicker && (
                                <MapLocationPicker
                                  initialLat={branchForm.latitude ?? undefined}
                                  initialLng={branchForm.longitude ?? undefined}
                                  onChange={(lat, lng) => setBranchForm(p => ({ ...p, latitude: lat, longitude: lng }))}
                                />
                              )}
                              <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateBranch}>
                                  <Check size={14} />{t("business.create")}
                                </button>
                                <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => {
                                  setShowBranchForm(false);
                                  setShowMapPicker(false);
                                  setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
      setGisLink("");
                                }}>{t("business.cancel")}</button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!branchesBusy && branches.map(b => (
                      <div key={b.id}>
                        {editBranchId === b.id ? (
                          <Card padding="md">
                            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                              <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <MapPin size={18} style={{ color: "var(--fcw-color-primary)" }} />
                                {t("business.branch.edit")}
                              </h3>
                              <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                <label className="fcw-label">{t("business.branch.name")}</label>
                                <input
                                  className="fcw-input"
                                  placeholder={t("business.branch.name")}
                                  value={branchForm.name}
                                  onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))}
                                />
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <label className="fcw-label">{t("business.branch.address")}</label>
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.branch.address")}
                                    value={branchForm.address}
                                    onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))}
                                  />
                                </div>
                                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <label className="fcw-label">{t("business.branch.city")}</label>
                                  <Select
                                    options={cities.map(c => ({ value: c.id, label: c.name }))}
                                    value={branchForm.cityId}
                                    onChange={v => setBranchForm(p => ({ ...p, cityId: v }))}
                                    placeholder={t("business.branch.city")}
                                  />
                                </div>
                              </div>
                              <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                                <span className="fcw-body-s fcw-weight-medium" style={{ color: "var(--fcw-color-text-secondary)" }}>
                                  {t("business.branch.location")}
                                </span>
                                <span className="fcw-body-xs" style={{ color: "var(--fcw-color-text-tertiary)" }}>
                                  {t("business.branch.2gisGuide")}
                                </span>
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.branch.2gisLinkPlaceholder")}
                                    value={gisLink}
                                    onChange={e => setGisLink(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleParseGisLink(); }}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                    onClick={handleParseGisLink}
                                    disabled={gisParsing || !gisLink.trim()}
                                  >
                                    {gisParsing ? <Loader2 size={14} className="fcw-animate-spin" /> : <Link2 size={14} />}
                                    {t("business.branch.extractCoords")}
                                  </button>
                                </div>
                                {branchForm.latitude != null && branchForm.longitude != null && (
                                  <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
                                    <span className="fcw-body-s" style={{ color: "var(--fcw-color-accent)" }}>
                                      {branchForm.latitude.toFixed(6)}, {branchForm.longitude.toFixed(6)}
                                    </span>
                                    <a
                                      className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                      style={{ textDecoration: "none" }}
                                      href={`https://2gis.kz/geo/${branchForm.longitude},${branchForm.latitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MapPin size={14} />{t("business.branch.openIn2gis")}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                onClick={() => setShowMapPicker(v => !v)}
                                style={{ alignSelf: "flex-start", gap: "0.375rem" }}
                              >
                                <MapPin size={14} />
                                {t("business.branch.pickOnMap")}
                              </button>
                              {showMapPicker && (
                                <MapLocationPicker
                                  initialLat={branchForm.latitude ?? undefined}
                                  initialLng={branchForm.longitude ?? undefined}
                                  onChange={(lat, lng) => setBranchForm(p => ({ ...p, latitude: lat, longitude: lng }))}
                                />
                              )}
                              <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateBranch}>
                                  <Check size={14} />{t("business.save")}
                                </button>
                                <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => {
                                  setEditBranchId(null);
                                  setShowMapPicker(false);
                                  setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
      setGisLink("");
                                }}>{t("business.cancel")}</button>
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <div style={{
                            display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--fcw-color-surface)",
                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            borderRadius: "var(--fcw-radius-md)",
                          }}>
                            <MapPin size={16} style={{ color: "var(--fcw-color-primary)", flexShrink: 0 }} />
                            <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "120px" }}>
                              {b.name}
                            </span>
                            {b.address && (
                              <span className="fcw-body-s fcw-text-tertiary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {b.address}
                              </span>
                            )}
                            {b.cityName && (
                              <span className="fcw-label">{b.cityName}</span>
                            )}
                            {b.onlineOnly && (
                              <span className="fcw-label">{t("business.branch.onlineOnly")}</span>
                            )}
                            <div style={{ flex: 1 }} />
                            {!isStaff && (
                              <button
                                className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                onClick={() => {
                                  setEditBranchId(b.id);
                                  setBranchForm({
                                    name: b.name,
                                    address: b.address || "",
                                    cityId: b.cityId || "",
                                    latitude: b.latitude ?? null,
                                    longitude: b.longitude ?? null,
                                  });
                                  setShowBranchForm(false);
                                }}
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

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
                  <ProductImportWizard
                    branches={branches}
                    activeBranchId={importBranchId || activeBranchId}
                    onBranchChange={setImportBranchId}
                    onBackToProducts={() => setSection("products")}
                    onImported={loadProducts}
                  />
                )}

                {/* Business Card Builder */}
                {section === "business-card" && (
                  <BusinessCardBuilder />
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
