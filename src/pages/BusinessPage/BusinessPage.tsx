import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MapLocationPicker from "../../widgets/MapLocationPicker/MapLocationPicker";
import {
  Package, Briefcase, Building2, UserRound,
  Sparkles, Plus, RefreshCw, Loader2,
  ChevronDown, Menu, X, MapPin, Trash2, Edit3, Check, Layout,
  Calendar, Upload, Reply, ChevronLeft, ChevronRight, MessageCircle
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
  listCategories, listStaff, updateStaff, resetStaffPassword,
  listEmployees,
  listCities,
  listBusinessChats, getBusinessChatMessages, sendBusinessChatMessage, markBusinessChatRead,
} from "../../shared/api/askClient";
import type {
  BrandProfileDto, BrandDropDto,
  BusinessProductDto, BusinessServiceDto, StaffDto,
  ChatConversationDto, ChatMessageDto,
} from "../../shared/api/dto";
import { createBusinessInvitation } from "../../shared/api/businessInvitationClient";
import { getManagedImportCatalogAccess } from "../../shared/api/managedImportClient";
import {
  getBusinessCatalogStatus, completeBusinessCatalogSetup,
  type BusinessCatalogStatus,
} from "../../shared/api/sellerOnboardingClient";

import { ApiError } from "../../shared/api/httpClient";
import { isValidEmail } from "../../shared/utils/validation";
import { ROUTES } from "../../app/routes";

type BusinessSection = "overview" | "products" | "services" | "organization" | "events" | "business-card" | "import";

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
  const { state, actions } = useAuth();
  const { selectBusiness } = actions;
  const { businessId = "" } = useParams<{ businessId: string }>();
  const { reduced } = useMotion();
  const { t } = useTranslation();
  const [section, setSection] = useState<BusinessSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const membership = state.session?.businessMemberships?.find(
    item => item.businessId === businessId,
  );
  const platformPermissions = state.session?.platformMembership?.permissions ?? [];
  const isPlatformCandidate = platformPermissions.includes("EDIT_CATALOG_DURING_IMPORT");
  const [platformWorkspaceAccess, setPlatformWorkspaceAccess] = useState<boolean | null>(
    isPlatformCandidate ? null : false,
  );
  const isPlatformWorkspace = !membership && platformWorkspaceAccess === true;
  const hasBusinessAccess = Boolean(membership || isPlatformWorkspace);
  const memberRole = membership?.role ?? (isPlatformWorkspace ? "PLATFORM_IMPORT" : "");
  const isStaff = memberRole === "MANAGER" || memberRole === "WORKER";
  const isWorker = memberRole === "WORKER";
  const isManager = memberRole === "MANAGER";
  const isOwner = memberRole === "OWNER";

  useEffect(() => {
    if (!membership && isPlatformCandidate && businessId) {
      getManagedImportCatalogAccess(businessId)
        .then(result => setPlatformWorkspaceAccess(result.allowed))
        .catch(() => setPlatformWorkspaceAccess(false));
    }
  }, [businessId, isPlatformCandidate, membership]);

  useEffect(() => {
    if (membership) {
      selectBusiness(membership.businessId);
    }
  }, [membership?.businessId, selectBusiness]);

  // Shared state
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [profile, setProfile] = useState<BrandProfileDto>(() => emptyProfile(businessId));
  const [drops, setDrops] = useState<BrandDropDto[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
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
  const [productsLoadingPage, setProductsLoadingPage] = useState(false);
  const [newProductIds, setNewProductIds] = useState<Set<string>>(new Set());
  const prevProductIdsRef = useRef<Set<string>>(new Set());
  const productsCacheRef = useRef<Map<number, { items: BusinessProductDto[]; totalElements: number }>>(new Map());

  useEffect(() => {
    prevProductIdsRef.current = new Set(products.map(p => p.productOfferId));
  }, [products]);

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
  const [staffForms, setStaffForms] = useState<Record<string, { displayName: string; email: string; role: string }>>({});
  const [staffBusy, setStaffBusy] = useState("");
  const [selectedStaffBranchId, setSelectedStaffBranchId] = useState<string | null>(null);
  const [staffEditingId, setStaffEditingId] = useState<string | null>(null);

  // Employees (business-level)
  const [employees, setEmployees] = useState<StaffDto[]>([]);
  const [employeesBusy, setEmployeesBusy] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ email: "", role: "WORKER", branchId: "" });

  // Overview
  const [importBranchId, setImportBranchId] = useState("");
  const [importMode, setImportMode] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [quickRailOpen, setQuickRailOpen] = useState(false);

  // Catalog setup deadline
  const [catalogStatus, setCatalogStatus] = useState<BusinessCatalogStatus | null>(null);
  const [catalogCompleteBusy, setCatalogCompleteBusy] = useState(false);

  // Chats
  const [chatConversations, setChatConversations] = useState<ChatConversationDto[]>([]);
  const [chatsBusy, setChatsBusy] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageDto[]>([]);
  const [messagesBusy, setMessagesBusy] = useState(false);
  const [replyText, setReplyText] = useState("");

  const activeBranchId = selectedBranchId || branches[0]?.id || "";

  const sidebarItems: { key: BusinessSection; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("business.overview"), icon: <Layout size={18} /> },
    { key: "products", label: t("business.products"), icon: <Package size={18} /> },
    { key: "services", label: t("business.services"), icon: <Briefcase size={18} /> },
    { key: "events", label: t("business.events"), icon: <Calendar size={18} /> },
    { key: "business-card", label: t("business.businessCard"), icon: <Sparkles size={18} /> },
    ...(isWorker || isPlatformWorkspace ? [] : [
      { key: "organization" as BusinessSection, label: t("business.organization"), icon: <Building2 size={18} /> },
    ]),
  ];

  function formatStaffStatus(status: string) {
    if (status === "PENDING_ACTIVATION") return t("business.staffStatus.pendingActivation");
    if (status === "PASSWORD_RESET_REQUIRED") return t("business.staffStatus.passwordResetRequired");
    if (status === "ACTIVE") return t("business.status.active");
    if (status === "DISABLED") return t("business.status.disabled");
    return status;
  }

  function convStatusLabel(status: string) {
    if (status === "NEW_REQUEST") return t("business.chats.status.NEW_REQUEST");
    if (status === "IN_PROGRESS") return t("business.chats.status.IN_PROGRESS");
    if (status === "DEAL_CLOSED") return t("business.chats.status.DEAL_CLOSED");
    return status;
  }

  function formatChatTime(iso: string) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("business.chats.justNow");
    if (mins < 60) return t("business.chats.minAgo", { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("business.chats.hoursAgo", { n: hours });
    const days = Math.floor(hours / 24);
    return t("business.chats.daysAgo", { n: days });
  }

  const quickActions = [
    { label: t("business.product.add"), icon: <Package size={16} />, onClick: () => setSection("products") },
    { label: t("business.service.add"), icon: <Briefcase size={16} />, onClick: () => setSection("services") },
    { label: t("business.importData"), icon: <Upload size={16} />, onClick: () => setSection("import") },
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
    const cached = productsCacheRef.current.get(productsPage);
    if (cached) {
      setProducts(cached.items);
      setProductsTotal(cached.totalElements);
      return;
    }
    setProductsLoadingPage(true);
    try {
      const res = await listProducts(activeBranchId, { page: productsPage, size: 10 });
      productsCacheRef.current.set(productsPage, { items: res.items, totalElements: res.totalElements });
      setProducts(res.items);
      setProductsTotal(res.totalElements);
    } catch { /* empty */ } finally {
      setProductsLoadingPage(false);
    }
  }, [activeBranchId, productsPage]);

  const handleImportCompleted = useCallback(async () => {
    const targetBranchId = importBranchId || activeBranchId;
    if (!targetBranchId) return;
    if (targetBranchId !== selectedBranchId) {
      setSelectedBranchId(targetBranchId);
    }
    productsCacheRef.current.clear();
    setProductsLoadingPage(true);
    try {
      const res = await listProducts(targetBranchId, { page: 0, size: 10 });
      const newItems = res.items.filter(p => !prevProductIdsRef.current.has(p.productOfferId));
      setProducts(res.items);
      setProductsTotal(res.totalElements);
      setProductsPage(0);
      if (newItems.length > 0) {
        setNewProductIds(new Set(newItems.map(p => p.productOfferId)));
        setTimeout(() => setNewProductIds(new Set()), 5000);
      }
      setSection("products");
    } catch { /* empty */ } finally {
      setProductsLoadingPage(false);
    }
  }, [activeBranchId, importBranchId, selectedBranchId]);

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

  const loadStaffForBranch = useCallback(async (branchId: string) => {
    if (!businessId || !branchId || isStaff) return;
    try {
      const staff = await listStaff(businessId, branchId);
      setStaffByBranch(current => ({ ...current, [branchId]: staff }));
    } catch {
      // keep previous data on error
    }
  }, [businessId, isStaff]);

  const loadEmployees = useCallback(async () => {
    if (!businessId) return;
    setEmployeesBusy(true);
    try {
      const list = await listEmployees(businessId);
      setEmployees(list);
    } catch {
      // keep previous data on error
    } finally {
      setEmployeesBusy(false);
    }
  }, [businessId]);

  const handleCreateEmployee = async () => {
    if (!businessId || !employeeForm.email) return;
    if (!isValidEmail(employeeForm.email)) {
      toast.show(t("business.validation.emailInvalid"), "error");
      return;
    }
    if (employeeForm.role === "WORKER" && !employeeForm.branchId) {
      toast.show(t("business.employee.selectBranch"), "error");
      return;
    }
    setEmployeesBusy(true);
    try {
      await createBusinessInvitation(businessId, {
        invitedEmail: employeeForm.email,
        invitedRole: employeeForm.role as "MANAGER" | "WORKER",
        branchIds: employeeForm.role === "WORKER" && employeeForm.branchId
          ? [employeeForm.branchId]
          : [],
      });
      setEmployeeForm({ email: "", role: "WORKER", branchId: "" });
      setShowEmployeeForm(false);
      await loadEmployees();
      toast.show(t("business.toast.invitationSent"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.staffAddError"), "error");
    } finally {
      setEmployeesBusy(false);
    }
  };

  useEffect(() => { if (hasBusinessAccess) loadCoreData(); }, [hasBusinessAccess, loadCoreData]);
  useEffect(() => { if (hasBusinessAccess) loadCategories(); }, [hasBusinessAccess, loadCategories]);
  useEffect(() => {
    listCities().then(setCities).catch(() => setCities([]));
  }, []);
  useEffect(() => { productsCacheRef.current.clear(); setProductsPage(0); }, [activeBranchId]);
  useEffect(() => { if (hasBusinessAccess && (section === "products" || section === "overview")) loadProducts(); }, [hasBusinessAccess, section, loadProducts]);
  useEffect(() => { if (hasBusinessAccess && (section === "services" || section === "overview")) loadServices(); }, [hasBusinessAccess, section, loadServices]);
  useEffect(() => { if (hasBusinessAccess && section === "organization") { loadBranches(); loadEmployees(); } }, [hasBusinessAccess, section, loadBranches, loadEmployees]);
  useEffect(() => {
    if (!hasBusinessAccess || !businessId) return;
    getBusinessCatalogStatus(businessId).then(setCatalogStatus).catch(() => setCatalogStatus(null));
  }, [hasBusinessAccess, businessId]);

  const handleCompleteCatalogSetup = async () => {
    setCatalogCompleteBusy(true);
    try {
      const updated = await completeBusinessCatalogSetup(businessId);
      setCatalogStatus(updated);
      toast.show(t("business.catalogSetup.completedToast"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.loadError"), "error");
    } finally {
      setCatalogCompleteBusy(false);
    }
  };

  const loadChats = useCallback(async () => {
    if (!businessId) return;
    setChatsBusy(true);
    try {
      const res = await listBusinessChats(businessId);
      setChatConversations(res.items);
    } catch { setChatConversations([]); } finally {
      setChatsBusy(false);
    }
  }, [businessId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!businessId) return;
    setMessagesBusy(true);
    try {
      const res = await getBusinessChatMessages(conversationId, businessId);
      setChatMessages(res.items);
    } catch { setChatMessages([]); } finally {
      setMessagesBusy(false);
    }
  }, [businessId]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    loadMessages(conversationId);
    if (businessId) markBusinessChatRead(conversationId, businessId).catch(() => {});
  }, [businessId, loadMessages]);

  const handleSendReply = useCallback(async () => {
    if (!businessId || !selectedConversationId || !replyText.trim()) return;
    try {
      await sendBusinessChatMessage(selectedConversationId, businessId, replyText.trim());
      setReplyText("");
      loadMessages(selectedConversationId);
      loadChats();
    } catch { /* empty */ }
  }, [businessId, selectedConversationId, replyText, loadMessages, loadChats]);

  useEffect(() => { if (hasBusinessAccess && section === "overview") { loadChats(); } }, [hasBusinessAccess, section, loadChats]);

  if (!membership && isPlatformCandidate && platformWorkspaceAccess === null) {
    return <Loading />;
  }

  if (!hasBusinessAccess) {
    return <Navigate to={ROUTES.home} replace />;
  }

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
      productsCacheRef.current.clear();
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
      productsCacheRef.current.clear();
      resetProductForm();
      loadProducts();
      toast.show(t("business.toast.productUpdated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.updateError"), "error");
    }
  };

  const handleDeleteProduct = async (product: BusinessProductDto) => {
    const branchId = product.branchId || activeBranchId;
    if (!branchId) return;
    try {
      productsCacheRef.current.clear();
      await deleteProduct(branchId, product.productOfferId);
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
        onlineOnly: false,
        latitude: branchForm.latitude,
        longitude: branchForm.longitude,
      });
      setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
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
    if (!isValidEmail(form.email)) {
      toast.show(t("business.validation.emailInvalid"), "error");
      return;
    }
    setStaffBusy(branchId);
    try {
      await createBusinessInvitation(businessId, {
        invitedEmail: form.email,
        invitedRole: (form.role || "WORKER") as "MANAGER" | "WORKER",
        branchIds: [branchId],
      });
      setStaffForms(current => ({ ...current, [branchId]: { displayName: "", email: "", role: "WORKER" } }));
      await loadStaffForBranch(branchId);
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

        {!isWorker && (
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
                  {isManager ? t("business.employee.manager") : isWorker ? t("business.employee.worker") : isStaff ? "" : t("business.owner")}
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

              {catalogStatus && catalogStatus.status !== "COMPLETED" && (
                <Card padding="md" style={{
                  marginBottom: "var(--fcw-space-md)",
                  borderColor: catalogStatus.status === "RESTRICTED" ? "var(--fcw-color-error)" : "var(--fcw-amber-500)",
                  backgroundColor: catalogStatus.status === "RESTRICTED"
                    ? "color-mix(in srgb, var(--fcw-color-error) 6%, transparent)"
                    : "color-mix(in srgb, var(--fcw-amber-500) 8%, transparent)",
                }}>
                  <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", alignItems: "center" }}>
                    <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 0 }}>
                      <span className="fcw-body fcw-weight-semibold">
                        {catalogStatus.status === "RESTRICTED"
                          ? t("business.catalogSetup.restrictedTitle")
                          : t("business.catalogSetup.deadlineTitle", {
                              days: Math.max(0, Math.ceil((new Date(catalogStatus.deadlineAt).getTime() - Date.now()) / 86400000)),
                            })}
                      </span>
                      <span className="fcw-body-s fcw-text-secondary">
                        {catalogStatus.status === "RESTRICTED"
                          ? t("business.catalogSetup.restrictedDescription")
                          : t("business.catalogSetup.deadlineDescription")}
                      </span>
                    </div>
                    {(isOwner || isManager || isPlatformWorkspace) && (
                      <button
                        className="fcw-btn fcw-btn-primary fcw-btn-sm"
                        disabled={catalogCompleteBusy}
                        onClick={handleCompleteCatalogSetup}
                      >
                        {catalogCompleteBusy ? <Loader2 size={14} className="fcw-spin" /> : <Check size={14} />}
                        {t("business.catalogSetup.complete")}
                      </button>
                    )}
                  </div>
                </Card>
              )}

              <motion.div
                key={section}
                initial={reduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Overview */}
                {section === "overview" && (
                  <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                    <div className="fcw-flex-between fcw-items-center">
                      <h2 className="fcw-h3" style={{ margin: 0 }}>{t("business.overview.activity")}</h2>
                      {branches.length > 0 && (
                        <Select
                          size="sm"
                          options={[{ value: "", label: t("business.allBranches") }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                          value={selectedBranchId}
                          onChange={(v) => setSelectedBranchId(v)}
                        />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "var(--fcw-space-md)", alignItems: "flex-start" }}>
                    <Card padding="lg" style={{ flex: 1, minWidth: 0 }}>
                      {chatConversations.length === 0 && (
                        <EmptyState title={t("business.chats.empty")} description={t("business.chats.emptyDesc")} />
                      )}

                      {chatConversations.length > 0 && (
                        <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                          {chatConversations.map(conv => (
                            <div
                              key={conv.conversationId}
                              className="fcw-flex-between fcw-items-center"
                              style={{ gap: "0.75rem", padding: "0.75rem", borderRadius: "var(--fcw-radius-md)", background: selectedConversationId === conv.conversationId ? "color-mix(in srgb, var(--fcw-color-primary) 10%, var(--fcw-color-surface-secondary))" : "var(--fcw-color-surface-secondary)", cursor: "pointer" }}
                              onClick={() => handleSelectConversation(conv.conversationId)}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span className="fcw-body fcw-weight-medium" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.subject || t("business.chats.status.NEW_REQUEST")}</span>
                                <span className="fcw-body-s fcw-text-tertiary">{conv.customerName} · {formatChatTime(conv.lastMessageAt)}</span>
                              </div>
                              {conv.businessUnreadCount > 0 && (
                                <span className="fcw-label" style={{ backgroundColor: "var(--fcw-color-primary)", color: "#fff", borderRadius: "var(--fcw-radius-full)", padding: "0.125rem 0.5rem", fontSize: "var(--fcw-font-size-body-xs)" }}>
                                  {conv.businessUnreadCount}
                                </span>
                              )}
                              <button
                                className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                                style={{ flexShrink: 0 }}
                                onClick={(e) => { e.stopPropagation(); handleSelectConversation(conv.conversationId); }}
                              >
                                <MessageCircle size={16} style={{ color: "var(--fcw-color-primary)" }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {selectedConversationId && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 380, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          flexShrink: 0,
                          borderRadius: "var(--fcw-radius-lg)",
                          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                          backgroundColor: "var(--fcw-color-surface)",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          height: "calc(100vh - 180px)",
                          minHeight: 400,
                        }}
                      >
                        <div className="fcw-flex-between" style={{ padding: "0.75rem 1rem", borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", flexShrink: 0 }}>
                          <span className="fcw-body fcw-weight-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {chatConversations.find(c => c.conversationId === selectedConversationId)?.subject || t("business.chats.title")}
                          </span>
                          <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => setSelectedConversationId(null)}>
                            <X size={16} />
                          </button>
                        </div>
                        <div style={{ flex: 1, overflow: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {messagesBusy && <Loading size="sm" />}
                          {!messagesBusy && chatMessages.length === 0 && (
                            <span className="fcw-body-s fcw-text-tertiary" style={{ textAlign: "center", padding: "var(--fcw-space-lg) 0" }}>{t("business.chats.noMessages")}</span>
                          )}
                          {!messagesBusy && chatMessages.map(msg => (
                            <div key={msg.messageId} style={{
                              alignSelf: msg.senderType === "BUSINESS" ? "flex-end" : "flex-start",
                              maxWidth: "85%",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "var(--fcw-radius-md)",
                              backgroundColor: msg.senderType === "BUSINESS" ? "color-mix(in srgb, var(--fcw-color-primary) 12%, var(--fcw-color-surface))" : "var(--fcw-color-surface-secondary)",
                              border: msg.senderType === "BUSINESS" ? "var(--fcw-border-width-thin) solid color-mix(in srgb, var(--fcw-color-primary) 25%, transparent)" : "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            }}>
                              <span className="fcw-body-s" style={{ wordBreak: "break-word" }}>{msg.text}</span>
                              <span className="fcw-body-xs fcw-text-tertiary" style={{ display: "block", marginTop: "0.25rem" }}>
                                {new Date(msg.createdAt).toLocaleTimeString("ru-KZ", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", flexShrink: 0 }}>
                          <input
                            className="fcw-input fcw-input-sm"
                            placeholder={t("business.chats.replyPlaceholder")}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSendReply(); }}
                            style={{ flex: 1 }}
                          />
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleSendReply} disabled={!replyText.trim()}>
                            <Reply size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  </div>
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
                      {!isWorker && (
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => { setImportMode("PRODUCT"); setSection("import"); }}>
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

                    {activeBranchId && products.length === 0 && productsLoadingPage && <Loading size="sm" text={t("business.loadingProducts")} />}

                    {activeBranchId && !productsLoadingPage && products.length === 0 && !showProductForm && (
                      <EmptyState
                        title={t("business.noProducts")}
                        description={t("business.noProductsDesc")}
                        action={!isWorker ? (
                          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => setShowProductForm(true)}>
                            <Plus size={16} />{t("business.product.add")}
                          </button>
                        ) : undefined}
                      />
                    )}

                    {activeBranchId && products.length > 0 && (
                      <div className="fcw-flex-col" style={{ gap: "0.25rem", minHeight: 440, opacity: productsLoadingPage ? 0.6 : 1, transition: "opacity 150ms" }}>
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
                          <div key={p.productOfferId}
                            className={newProductIds.has(p.productOfferId) ? "fcw-animate-glass-highlight" : ""}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                              padding: "0.5rem 0.75rem",
                              backgroundColor: "var(--fcw-color-surface)",
                              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                              borderRadius: "var(--fcw-radius-md)",
                              position: "relative",
                              overflow: "hidden",
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
                              {!isWorker && (
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

                        {productsTotal > 10 && (
                          <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", justifyContent: "center", paddingTop: "0.5rem" }}>
                            <button
                              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                              onClick={() => setProductsPage(p => Math.max(0, p - 1))}
                              disabled={productsPage === 0}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: Math.ceil(productsTotal / 10) }, (_, i) => (
                              <button
                                key={i}
                                className="fcw-btn fcw-btn-sm"
                                style={{
                                  minWidth: 32,
                                  justifyContent: "center",
                                  backgroundColor: i === productsPage ? "var(--fcw-color-primary)" : "transparent",
                                  color: i === productsPage ? "#fff" : "var(--fcw-color-text-secondary)",
                                  border: i === productsPage ? "none" : "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                }}
                                onClick={() => setProductsPage(i)}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                              onClick={() => setProductsPage(p => Math.min(Math.ceil(productsTotal / 10) - 1, p + 1))}
                              disabled={productsPage >= Math.ceil(productsTotal / 10) - 1}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Services */}
                {section === "services" && (
                  <div>
                    <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
                      <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.services")}</h2>
                      {!isWorker && (
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
                          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => { setImportMode("SERVICE"); setSection("import"); }}>
                            <Upload size={16} />{t("business.import.titleServices")}
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
                        action={!isWorker ? (
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
                              {!isWorker && (
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

                {/* Organization — Branches + Team */}
                {section === "organization" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--fcw-space-xl)" }}>

                    {/* ═══════ Branches ═══════ */}
                    <section>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        marginBottom: "var(--fcw-space-md)", gap: "var(--fcw-space-sm)",
                      }}>
                        <div>
                          <h2 style={{
                            fontSize: "var(--fcw-font-size-h3)", fontWeight: "var(--fcw-font-weight-semibold)",
                            margin: 0, letterSpacing: "var(--fcw-tracking-tight)",
                          }}>
                            {t("business.branches")}
                          </h2>
                          <p style={{
                            fontSize: "var(--fcw-font-size-body-s)", color: "var(--fcw-color-text-secondary)",
                            margin: "0.25rem 0 0 0",
                          }}>
                            {branches.length === 0 ? t("business.noBranches") : `${branches.length} ${branches.length === 1 ? t("business.branch.name") : t("business.branches").toLowerCase()}`}
                          </p>
                        </div>
                        {isOwner && (
                          <button
                            className="fcw-btn fcw-btn-primary fcw-btn-sm"
                            onClick={() => {
                              setEditBranchId(null); setShowMapPicker(false);
                              setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
                              setShowBranchForm(v => !v);
                            }}
                          >
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
                        {showBranchForm && !editBranchId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: "hidden", marginBottom: "var(--fcw-space-sm)" }}
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
                                  <button
                                    type="button"
                                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                    onClick={() => setShowMapPicker(v => !v)}
                                    style={{ alignSelf: "flex-start", gap: "0.375rem" }}
                                  >
                                    <MapPin size={14} />
                                    {showMapPicker ? t("business.cancel") : t("business.branch.pickOnMap")}
                                  </button>
                                  {showMapPicker && (
                                    <MapLocationPicker
                                      initialLat={branchForm.latitude ?? undefined}
                                      initialLng={branchForm.longitude ?? undefined}
                                      onChange={(lat, lng, address) => setBranchForm(p => ({
                                        ...p,
                                        latitude: lat,
                                        longitude: lng,
                                        ...(address ? { address } : {}),
                                      }))}
                                    />
                                  )}
                                  {branchForm.latitude != null && branchForm.longitude != null && (
                                    <a
                                      className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                      style={{ textDecoration: "none", alignSelf: "flex-start" }}
                                      href={`https://2gis.kz/geo/${branchForm.longitude},${branchForm.latitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MapPin size={14} />{t("business.branch.openIn2gis")}
                                    </a>
                                  )}
                                </div>
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateBranch}>
                                    <Check size={14} />{t("business.create")}
                                  </button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => {
                                    setShowBranchForm(false); setShowMapPicker(false);
                                    setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
                                  }}>{t("business.cancel")}</button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!branchesBusy && branches.map(b => (
                        <div key={b.id} style={{ marginBottom: "var(--fcw-space-2xs)" }}>
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
                                  <button
                                    type="button"
                                    className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                    onClick={() => setShowMapPicker(v => !v)}
                                    style={{ alignSelf: "flex-start", gap: "0.375rem" }}
                                  >
                                    <MapPin size={14} />
                                    {showMapPicker ? t("business.cancel") : t("business.branch.pickOnMap")}
                                  </button>
                                  {showMapPicker && (
                                    <MapLocationPicker
                                      initialLat={branchForm.latitude ?? undefined}
                                      initialLng={branchForm.longitude ?? undefined}
                                      onChange={(lat, lng, address) => setBranchForm(p => ({
                                        ...p,
                                        latitude: lat,
                                        longitude: lng,
                                        ...(address ? { address } : {}),
                                      }))}
                                    />
                                  )}
                                  {branchForm.latitude != null && branchForm.longitude != null && (
                                    <a
                                      className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                      style={{ textDecoration: "none", alignSelf: "flex-start" }}
                                      href={`https://2gis.kz/geo/${branchForm.longitude},${branchForm.latitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MapPin size={14} />{t("business.branch.openIn2gis")}
                                    </a>
                                  )}
                                </div>
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateBranch}>
                                    <Check size={14} />{t("business.save")}
                                  </button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => {
                                    setEditBranchId(null); setShowMapPicker(false);
                                    setBranchForm({ name: "", address: "", cityId: "", latitude: null, longitude: null });
                                  }}>{t("business.cancel")}</button>
                                </div>
                              </div>
                            </Card>
                          ) : (
                            <div>
                              <div style={{
                                display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                                padding: "var(--fcw-space-sm) var(--fcw-space-sm)",
                                backgroundColor: "var(--fcw-color-surface)",
                                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                borderRadius: selectedStaffBranchId === b.id
                                  ? "var(--fcw-radius-lg) var(--fcw-radius-lg) 0 0"
                                  : "var(--fcw-radius-lg)",
                              }}>
                                <MapPin size={16} style={{ color: "var(--fcw-color-primary)", flexShrink: 0 }} />
                                <span className="fcw-body fcw-weight-medium" style={{
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "100px",
                                }}>
                                  {b.name}
                                </span>
                                {b.address && (
                                  <span className="fcw-body-s" style={{ color: "var(--fcw-color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {b.address}
                                  </span>
                                )}
                                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                                  {b.cityName && (
                                    <span className="fcw-label" style={{
                                      color: "var(--fcw-color-text-secondary)",
                                      border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                      borderRadius: "var(--fcw-radius-full)",
                                      padding: "0.125rem 0.5rem",
                                    }}>
                                      {b.cityName}
                                    </span>
                                  )}
                                  {b.onlineOnly && (
                                    <span className="fcw-label" style={{
                                      color: "var(--fcw-color-primary)",
                                      border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                      borderRadius: "var(--fcw-radius-full)",
                                      padding: "0.125rem 0.5rem",
                                    }}>
                                      {t("business.branch.onlineOnly")}
                                    </span>
                                  )}
                                </div>
                                <div style={{ flex: 1 }} />
                                {!isWorker && (
                                  <button
                                    className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                    style={{ gap: "0.25rem", flexShrink: 0 }}
                                    onClick={() => {
                                      if (selectedStaffBranchId === b.id) {
                                        setSelectedStaffBranchId(null); setStaffEditingId(null);
                                      } else {
                                        setSelectedStaffBranchId(b.id); setStaffEditingId(null);
                                        if (!staffByBranch[b.id]) loadStaffForBranch(b.id);
                                      }
                                    }}
                                  >
                                    <UserRound size={14} />
                                    <span style={{
                                      fontSize: "var(--fcw-font-size-body-s)", fontWeight: "var(--fcw-font-weight-medium)",
                                      color: selectedStaffBranchId === b.id ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                                    }}>
                                      {(staffByBranch[b.id] || []).length}
                                    </span>
                                    <ChevronDown size={12} style={{
                                      color: "var(--fcw-color-text-tertiary)",
                                      transform: selectedStaffBranchId === b.id ? "rotate(180deg)" : "rotate(0deg)",
                                      transition: "transform 0.2s ease",
                                    }} />
                                  </button>
                                )}
                                {isOwner && (
                                  <button
                                    className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                    style={{ flexShrink: 0 }}
                                    onClick={() => {
                                      setEditBranchId(b.id); setShowMapPicker(false);
                                      setBranchForm({
                                        name: b.name, address: b.address || "", cityId: b.cityId || "",
                                        latitude: b.latitude ?? null, longitude: b.longitude ?? null,
                                      });
                                      setShowBranchForm(false);
                                    }}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Staff panel below branch */}
                              {selectedStaffBranchId === b.id && !isWorker && (
                                <div style={{
                                  border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                  borderTop: "none",
                                  borderRadius: "0 0 var(--fcw-radius-lg) var(--fcw-radius-lg)",
                                  backgroundColor: "var(--fcw-color-surface-secondary)",
                                  padding: "var(--fcw-space-md)",
                                }}>
                                  <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                                    <div className="fcw-flex fcw-items-end fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                                      <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: "1 1 140px", minWidth: 0 }}>
                                        <label className="fcw-label">{t("business.staff.name")}</label>
                                        <input
                                          className="fcw-input"
                                          placeholder={t("business.staff.name")}
                                          value={(staffForms[b.id] || { displayName: "", email: "", role: "WORKER" }).displayName}
                                          onChange={e => setStaffForms(prev => ({ ...prev, [b.id]: { ...(prev[b.id] || { displayName: "", email: "", role: "WORKER" }), displayName: e.target.value } }))}
                                        />
                                      </div>
                                      <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: "1 1 180px", minWidth: 0 }}>
                                        <label className="fcw-label">{t("business.staff.email")}</label>
                                        <input
                                          className="fcw-input"
                                          placeholder={t("business.staff.email")}
                                          value={(staffForms[b.id] || { displayName: "", email: "", role: "WORKER" }).email}
                                          onChange={e => setStaffForms(prev => ({ ...prev, [b.id]: { ...(prev[b.id] || { displayName: "", email: "", role: "WORKER" }), email: e.target.value } }))}
                                        />
                                      </div>
                                      <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: "0 0 110px" }}>
                                        <label className="fcw-label">{t("business.staff.role")}</label>
                                        <Select
                                          size="sm"
                                          options={(() => {
                                            const items = [{ value: "WORKER", label: t("auth.role.BUSINESS_WORKER") }];
                                            if (isOwner) items.push({ value: "MANAGER", label: t("auth.role.BUSINESS_MANAGER") });
                                            return items;
                                          })()}
                                          value={(staffForms[b.id] || { displayName: "", email: "", role: "WORKER" }).role}
                                          onChange={v => setStaffForms(prev => ({ ...prev, [b.id]: { ...(prev[b.id] || { displayName: "", email: "", role: "WORKER" }), role: v } }))}
                                        />
                                      </div>
                                      <button
                                        className="fcw-btn fcw-btn-primary fcw-btn-sm"
                                        style={{ flexShrink: 0 }}
                                        onClick={() => handleCreateStaff(b.id)}
                                        disabled={staffBusy === b.id}
                                      >
                                        {staffBusy === b.id ? <Loader2 size={14} className="fcw-animate-spin" /> : <Plus size={14} />}
                                        {t("business.staff.add")}
                                      </button>
                                    </div>

                                    {(staffByBranch[b.id] || []).length === 0 && (
                                      <span className="fcw-body-s" style={{ color: "var(--fcw-color-text-tertiary)" }}>{t("business.staff.empty")}</span>
                                    )}

                                    {(staffByBranch[b.id] || []).map(member => (
                                      <div key={member.id} className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                        <div
                                          className="fcw-flex fcw-items-center fcw-flex-wrap"
                                          style={{
                                            gap: "0.5rem",
                                            padding: "0.625rem 0.75rem",
                                            backgroundColor: "var(--fcw-color-surface)",
                                            borderRadius: "var(--fcw-radius-md)",
                                            border: staffEditingId === member.id
                                              ? "var(--fcw-border-width-thin) solid var(--fcw-color-primary)"
                                              : "var(--fcw-border-width-thin) solid transparent",
                                            cursor: "pointer",
                                            transition: "border-color 0.15s ease",
                                          }}
                                          onClick={() => setStaffEditingId(staffEditingId === member.id ? null : member.id)}
                                        >
                                          <UserRound size={14} style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }} />
                                          <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {member.displayName}
                                          </span>
                                          <span className="fcw-label" style={{
                                            color: "var(--fcw-color-text-secondary)",
                                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                            borderRadius: "var(--fcw-radius-full)",
                                            padding: "0.125rem 0.5rem",
                                          }}>
                                            {t(`auth.role.BUSINESS_${member.role}`)}
                                          </span>
                                          <span style={{
                                            fontSize: "var(--fcw-font-size-body-s)",
                                            color: member.status === "ACTIVE" ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)",
                                            display: "flex", alignItems: "center", gap: "0.25rem",
                                          }}>
                                            <span style={{
                                              width: 6, height: 6, borderRadius: "50%",
                                              backgroundColor: member.status === "ACTIVE" ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)",
                                              flexShrink: 0,
                                            }} />
                                            {formatStaffStatus(member.status)}
                                          </span>
                                          <span className="fcw-body-s" style={{ color: "var(--fcw-color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {member.email}
                                          </span>
                                          {member.tempPassword && (
                                            <span className="fcw-label" style={{
                                              color: "var(--fcw-color-primary)",
                                              backgroundColor: "color-mix(in srgb, var(--fcw-color-primary) 8%, transparent)",
                                              padding: "0.125rem 0.5rem",
                                              borderRadius: "var(--fcw-radius-full)",
                                            }}>
                                              {t("business.staff.tempPassword")}: {member.tempPassword}
                                            </span>
                                          )}
                                        </div>

                                        {staffEditingId === member.id && (
                                          <div style={{
                                            padding: "0.75rem",
                                            backgroundColor: "var(--fcw-color-surface)",
                                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-primary)",
                                            borderRadius: "0 0 var(--fcw-radius-md) var(--fcw-radius-md)",
                                            borderTop: "none",
                                            marginTop: "-1px",
                                          }}>
                                            <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                                              <button
                                                className="fcw-btn fcw-btn-sm"
                                                style={{
                                                  backgroundColor: member.status === "ACTIVE" ? "var(--fcw-color-error)" : "var(--fcw-color-accent)",
                                                  color: "#fff", flexShrink: 0,
                                                }}
                                                onClick={async () => {
                                                  if (!businessId || !b.id) return;
                                                  setStaffBusy(member.id);
                                                  try {
                                                    const updated = await updateStaff(businessId, b.id, member.id, {
                                                      status: member.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                                                    });
                                                    setStaffByBranch(current => ({
                                                      ...current,
                                                      [b.id]: (current[b.id] || []).map(item => item.id === member.id ? updated : item),
                                                    }));
                                                  } catch (e) {
                                                    toast.show(e instanceof ApiError ? e.message : t("business.toast.updateError"), "error");
                                                  } finally {
                                                    setStaffBusy("");
                                                  }
                                                }}
                                                disabled={staffBusy === member.id}
                                              >
                                                {staffBusy === member.id ? <Loader2 size={14} className="fcw-animate-spin" /> : null}
                                                {member.status === "ACTIVE" ? t("business.staff.deactivate") : t("business.staff.activate")}
                                              </button>
                                              <button
                                                className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                                                onClick={() => handleResetStaffPassword(b.id, member.id)}
                                                disabled={staffBusy === member.id}
                                                style={{ flexShrink: 0 }}
                                              >
                                                {staffBusy === member.id ? <Loader2 size={14} className="fcw-animate-spin" /> : <RefreshCw size={14} />}
                                                {t("business.staff.resetPassword")}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </section>

                    {/* ═══════ Divider ═══════ */}
                    <div style={{ height: "1px", backgroundColor: "var(--fcw-color-border)", margin: 0 }} />

                    {/* ═══════ Team ═══════ */}
                    <section>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        marginBottom: "var(--fcw-space-md)", gap: "var(--fcw-space-sm)",
                      }}>
                        <div>
                          <h2 style={{
                            fontSize: "var(--fcw-font-size-h3)", fontWeight: "var(--fcw-font-weight-semibold)",
                            margin: 0, letterSpacing: "var(--fcw-tracking-tight)",
                          }}>
                            {t("business.employees")}
                          </h2>
                          <p style={{
                            fontSize: "var(--fcw-font-size-body-s)", color: "var(--fcw-color-text-secondary)",
                            margin: "0.25rem 0 0 0",
                          }}>
                            {employees.length === 0 ? t("business.employee.empty") : `${employees.length} ${t("business.employees").toLowerCase()}`}
                          </p>
                        </div>
                        {(isOwner || isManager) && (
                          <button
                            className="fcw-btn fcw-btn-primary fcw-btn-sm"
                            onClick={() => {
                              setShowEmployeeForm(v => !v);
                              if (!showEmployeeForm) setEmployeeForm({ email: "", role: "WORKER", branchId: "" });
                            }}
                          >
                            <Plus size={16} />{t("business.employee.add")}
                          </button>
                        )}
                      </div>

                      {employeesBusy && <Loading size="sm" />}

                      <AnimatePresence>
                        {showEmployeeForm && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: "hidden", marginBottom: "var(--fcw-space-sm)" }}
                          >
                            <Card padding="md">
                              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <Plus size={18} style={{ color: "var(--fcw-color-primary)" }} />
                                  {t("business.employee.add")}
                                </h3>
                                <div>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.staff.email")}</label>
                                    <input
                                      className="fcw-input"
                                      placeholder={t("business.staff.email")}
                                      value={employeeForm.email}
                                      onChange={e => setEmployeeForm(p => ({ ...p, email: e.target.value }))}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                  <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                    <label className="fcw-label">{t("business.staff.role")}</label>
                                    <Select
                                      options={(() => {
                                        const items = [{ value: "WORKER", label: t("auth.role.BUSINESS_WORKER") }];
                                        if (isOwner) items.push({ value: "MANAGER", label: t("auth.role.BUSINESS_MANAGER") });
                                        return items;
                                      })()}
                                      value={employeeForm.role}
                                      onChange={v => setEmployeeForm(p => ({ ...p, role: v, branchId: v === "MANAGER" ? "" : p.branchId }))}
                                    />
                                  </div>
                                  {employeeForm.role === "WORKER" && (
                                    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                      <label className="fcw-label">{t("business.employee.selectBranch")}</label>
                                      {branches.length > 0 ? (
                                        <Select
                                          options={branches.map(b => ({ value: b.id, label: b.name }))}
                                          value={employeeForm.branchId}
                                          onChange={v => setEmployeeForm(p => ({ ...p, branchId: v }))}
                                          placeholder={t("business.employee.selectBranch")}
                                        />
                                      ) : (
                                        <span className="fcw-body-s fcw-text-tertiary" style={{ padding: "0.5rem 0" }}>
                                          {t("business.employee.noBranchHint")}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleCreateEmployee} disabled={employeesBusy}>
                                    {employeesBusy ? <Loader2 size={14} className="fcw-animate-spin" /> : <Check size={14} />}
                                    {t("business.create")}
                                  </button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => setShowEmployeeForm(false)}>{t("business.cancel")}</button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!employeesBusy && employees.length === 0 && !showEmployeeForm && (
                        <EmptyState
                          title={t("business.employee.empty")}
                          description={t("business.noBranchesDesc")}
                        />
                      )}

                      {!employeesBusy && employees.map(emp => (
                        <div key={emp.id} style={{
                          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                          padding: "var(--fcw-space-sm)",
                          backgroundColor: "var(--fcw-color-surface)",
                          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                          borderRadius: "var(--fcw-radius-lg)",
                          marginBottom: "var(--fcw-space-2xs)",
                        }}>
                          <UserRound size={14} style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }} />
                          <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "80px" }}>
                            {emp.displayName}
                          </span>
                          <span className="fcw-body-s" style={{ color: "var(--fcw-color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {emp.email}
                          </span>
                          {emp.branchName && (
                            <span style={{
                              fontSize: "var(--fcw-font-size-body-s)", color: "var(--fcw-color-text-secondary)",
                              display: "flex", alignItems: "center", gap: "0.25rem",
                            }}>
                              <MapPin size={12} />{emp.branchName}
                            </span>
                          )}
                          <div style={{ flex: 1 }} />
                          <span className="fcw-label" style={{
                            color: "var(--fcw-color-text-secondary)",
                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            borderRadius: "var(--fcw-radius-full)",
                            padding: "0.125rem 0.5rem",
                          }}>
                            {t(`auth.role.BUSINESS_${emp.role}`)}
                          </span>
                          <span style={{
                            fontSize: "var(--fcw-font-size-body-s)",
                            color: emp.status === "ACTIVE" ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)",
                            display: "flex", alignItems: "center", gap: "0.25rem",
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%",
                              backgroundColor: emp.status === "ACTIVE" ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)",
                              flexShrink: 0,
                            }} />
                            {formatStaffStatus(emp.status)}
                          </span>
                          {emp.tempPassword && (
                            <span className="fcw-label" style={{
                              color: "var(--fcw-color-primary)",
                              backgroundColor: "color-mix(in srgb, var(--fcw-color-primary) 8%, transparent)",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "var(--fcw-radius-full)",
                            }}>
                              {t("business.staff.tempPassword")}: {emp.tempPassword}
                            </span>
                          )}
                        </div>
                      ))}
                    </section>
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
                    onBackToProducts={() => setSection(importMode === "SERVICE" ? "services" : "products")}
                    onImported={handleImportCompleted}
                    importMode={importMode}
                  />
                )}

                {/* Business Card Builder */}
                {section === "business-card" && (
                  <BusinessCardBuilder />
                )}

              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
