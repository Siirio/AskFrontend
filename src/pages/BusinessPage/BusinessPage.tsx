import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MapLocationPicker from "../../widgets/MapLocationPicker/MapLocationPicker";
import {
  Package, Briefcase, Building2, UserRound,
  Sparkles, Plus, RefreshCw, Loader2,
  ChevronDown, Menu, X, MapPin, Trash2, Edit3, Check, Layout,
  Upload, ChevronLeft, ChevronRight, MessageCircle, Zap, Tags, Store, ExternalLink
} from "lucide-react";
import { buildRoute, ROUTES } from "../../app/routes";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Loading } from "../../shared/ui/Loading/Loading";
import { useToast } from "../../shared/ui/Toast/Toast";
import { Select } from "../../shared/ui/Select/Select";
import { CategoryAutocomplete } from "../../shared/ui/CategoryAutocomplete/CategoryAutocomplete";
import { DropsEditor } from "../../widgets/DropsEditor/DropsEditor";
import { ProfileEditor } from "../../widgets/ProfileEditor/ProfileEditor";
import { BusinessCardBuilder } from "../../widgets/BusinessCardBuilder/BusinessCardBuilder";
import { ProductImportWizard } from "../../widgets/ProductImportWizard/ProductImportWizard";
import { ProductsTab } from "./ProductsTab";
import { ServicesTab } from "./ServicesTab";
import { BranchEditor } from "./BranchEditor";
import { ManagedImportRequestDialog, type LinkSourceType } from "../../widgets/ManagedImportRequestDialog/ManagedImportRequestDialog";
import { ManagedImportChatDrawer } from "../../widgets/ManagedImportChatDrawer/ManagedImportChatDrawer";
import { BusinessChatDrawer } from "../../widgets/BusinessChatDrawer/BusinessChatDrawer";
import {
  getBrandProfile, listDrops,
  updateBrandProfile,
  createDrop, cancelDrop, deleteDrop, uploadDropCover,
  listProducts, createProduct, updateProduct, deleteProduct,
  listServices, createService, updateService,
  listBranches, createBranch, updateBranch,
  listStaff, createStaff, updateStaff, resetStaffPassword,
  listEmployees, createEmployee, deletePendingEmployee,
  listCities, getBusiness,
  listBusinessChats,
} from "../../shared/api/askClient";
import type {
  BrandProfileDto, BrandDropDto,
  BusinessProductDto, BusinessServiceDto, StaffDto,
  ChatConversationDto,
} from "../../shared/api/dto";
import type { BranchDto } from "../../shared/api/domainTypes";
import { getManagedImportCatalogAccess, listBusinessManagedImports, type ManagedImportItem } from "../../shared/api/managedImportClient";
import { requestAiEnrichment } from "../../shared/api/platformClient";
import {
  getBusinessCatalogStatus,
  type BusinessCatalogStatus,
} from "../../shared/api/sellerOnboardingClient";

import { ApiError } from "../../shared/api/httpClient";
import { isValidEmail } from "../../shared/utils/validation";

type BusinessSection = "overview" | "products" | "services" | "drops" | "profile" | "organization" | "events" | "business-card" | "import";


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
    deliveryCoverage: "NO_DELIVERY",
    deliveryCities: [],
    pickupAvailable: false,
  };
}

function normalizeCityName(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/^(\u0433\.?|\u0433\u043e\u0440\u043e\u0434)\s*/u, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function parseAttributes(value: string) {
  if (!value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed == null || Array.isArray(parsed) || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function formatAttributes(value?: Record<string, unknown> | null) {
  return value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : "";
}

function emptyBranchForm() {
  return { name: "", address: "", addressDetails: "", cityId: "", latitude: null as number | null, longitude: null as number | null, timeZoneId: "", weeklyHours: [] as Array<{ dayOfWeek: string; opensAt: string; closesAt: string }>, specialHours: [] as Array<{ date: string; closed: boolean; opensAt: string; closesAt: string }>, pickupAvailable: false };
}

function formatOpeningTime(iso?: string, timeZoneId?: string) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    if (timeZoneId) options.timeZone = timeZoneId;
    return date.toLocaleTimeString("ru-KZ", options);
  } catch {
    return "";
  }
}

function formatOpeningLabel(summary: { state: string; timeZoneId?: string; nextOpensAt?: string; nextClosesAt?: string } | undefined, t: (key: string) => string) {
  if (!summary) return "";
  if (summary.state === "OPEN") {
    const closeTime = formatOpeningTime(summary.nextClosesAt, summary.timeZoneId);
    return closeTime ? `${t("business.branch.openNow")} до ${closeTime}` : t("business.branch.openNow");
  }
  if (summary.state === "CLOSED") {
    const openTime = formatOpeningTime(summary.nextOpensAt, summary.timeZoneId);
    return openTime ? `${t("business.branch.closedNow")} до ${openTime}` : t("business.branch.closedNow");
  }
  return "";
}

export function BusinessPage() {
  const navigate = useNavigate();
  const { state, actions } = useAuth();
  const { selectBusiness } = actions;
  const { businessId = "" } = useParams<{ businessId: string }>();
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get("conversationId");
  const { reduced } = useMotion();
  const { t } = useTranslation();
  const [section, setSection] = useState<BusinessSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const membership = state.session?.businessMemberships?.find(
    item => item.businessId === businessId,
  );
  const isPlatformCandidate = Boolean(state.session?.platformMembership);
  const [platformWorkspaceAccess, setPlatformWorkspaceAccess] = useState<boolean | null>(
    isPlatformCandidate ? null : false,
  );
  const [platformBusinessScope, setPlatformBusinessScope] = useState<"ITEM" | "SERVICE" | "BOTH" | null>(null);
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
        .then(result => {
          setPlatformWorkspaceAccess(result.allowed);
          setPlatformBusinessScope(result.businessScope);
        })
        .catch(() => {
          setPlatformWorkspaceAccess(false);
          setPlatformBusinessScope(null);
        });
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
  const [profileFieldErrors, setProfileFieldErrors] = useState<{ field: string; message: string }[]>([]);
  const [drops, setDrops] = useState<BrandDropDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Products
  const [products, setProducts] = useState<BusinessProductDto[]>([]);
  const [productsPage, setProductsPage] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<BusinessProductDto | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", deepLink: "", price: "", categoryId: "", categoryLabel: "", tags: "", attributesText: "", isActive: true });
  const [productsBusy, setProductsBusy] = useState(false);
  const [selectedProductOfferIds, setSelectedProductOfferIds] = useState<Set<string>>(new Set());
  const [aiEnrichmentBusy, setAiEnrichmentBusy] = useState(false);
  const [managedImportItems, setManagedImportItems] = useState<Record<string, ManagedImportItem>>({});
  const [managedImportDialogScope, setManagedImportDialogScope] = useState<"ITEM" | "SERVICE" | "BOTH" | null>(() => {
    const scope = searchParams.get("managedImport");
    return scope === "ITEM" || scope === "SERVICE" || scope === "BOTH" ? scope : null;
  });
  const [onboardingSourceLinks] = useState<Partial<Record<LinkSourceType, string>>>(() => {
    if (!businessId) return {};
    const key = `ask.managedImportSources.${businessId}`;
    try {
      const stored = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      return stored ? JSON.parse(stored) as Partial<Record<LinkSourceType, string>> : {};
    } catch {
      return {};
    }
  });
  const [managedImportChat, setManagedImportChat] = useState<ManagedImportItem | null>(null);
  const [productsLoadingPage, setProductsLoadingPage] = useState(false);
  const [newProductIds, setNewProductIds] = useState<Set<string>>(new Set());
  const prevProductIdsRef = useRef<Set<string>>(new Set());
  const productsCacheRef = useRef<Map<number, { items: BusinessProductDto[]; totalElements: number }>>(new Map());

  useEffect(() => {
    prevProductIdsRef.current = new Set(products.map(p => p.productId));
  }, [products]);

  // Services
  const [services, setServices] = useState<BusinessServiceDto[]>([]);
  const [servicesBusy, setServicesBusy] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editService, setEditService] = useState<BusinessServiceDto | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", basePrice: "", categoryId: "", categoryLabel: "", serviceMode: "ON_DEMAND" as "ON_DEMAND" | "SCHEDULED", scheduleText: "", attributesText: "", isActive: true });

  // Branches
  const [branchesBusy, setBranchesBusy] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showOnlineOnlyConfirm, setShowOnlineOnlyConfirm] = useState(false);
  const [editBranchId, setEditBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", addressDetails: "", cityId: "", latitude: null as number | null, longitude: null as number | null, timeZoneId: "", weeklyHours: [] as Array<{ dayOfWeek: string; opensAt: string; closesAt: string }>, specialHours: [] as Array<{ date: string; closed: boolean; opensAt: string; closesAt: string }>, pickupAvailable: false });
  const [staffByBranch, setStaffByBranch] = useState<Record<string, StaffDto[]>>({});
  const [staffForms, setStaffForms] = useState<Record<string, { displayName: string; email: string; role: string }>>({});
  const [staffBusy, setStaffBusy] = useState("");
  const [selectedStaffBranchId, setSelectedStaffBranchId] = useState<string | null>(null);
  const [staffEditingId, setStaffEditingId] = useState<string | null>(null);

  // Employees (business-level)
  const [employees, setEmployees] = useState<StaffDto[]>([]);
  const [employeesBusy, setEmployeesBusy] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ displayName: "", email: "", role: "MANAGER", branchId: "" });

  // Overview
  const [importBranchId, setImportBranchId] = useState("");
  const [importMode, setImportMode] = useState<"ITEM" | "SERVICE">("ITEM");
  const [quickRailOpen, setQuickRailOpen] = useState(false);
  const [dropComposerRequest, setDropComposerRequest] = useState(0);

  // Catalog setup deadline
  const [catalogStatus, setCatalogStatus] = useState<BusinessCatalogStatus | null>(null);
  const [businessOnlineOnly, setBusinessOnlineOnly] = useState(false);
  // Chats
  const [chatConversations, setChatConversations] = useState<ChatConversationDto[]>([]);
  const [chatsBusy, setChatsBusy] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const activeBranchId = selectedBranchId || branches[0]?.id || "";

  useEffect(() => {
    if (!membership) return;
    listBusinessManagedImports(membership.businessId)
      .then(items => {
        const map: Record<string, ManagedImportItem> = {};
        items
          .filter(item => item.status === "PENDING" || item.status === "ACTIVE")
          .forEach(item => {
            if (item.businessScope === "ITEM" || item.businessScope === "BOTH") map.ITEM = item;
            if (item.businessScope === "SERVICE" || item.businessScope === "BOTH") map.SERVICE = item;
          });
        setManagedImportItems(map);
      })
      .catch(() => setManagedImportItems({}));
  }, [membership?.businessId]);

  const businessSidebarItems: { key: BusinessSection; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("business.overview"), icon: <Layout size={18} /> },
    { key: "products", label: t("business.products"), icon: <Package size={18} /> },
    { key: "services", label: t("business.services"), icon: <Briefcase size={18} /> },
    { key: "drops", label: t("business.events"), icon: <Tags size={18} /> },
    { key: "business-card", label: t("business.businessCard"), icon: <Sparkles size={18} /> },
    ...(isWorker || isPlatformWorkspace || businessOnlineOnly ? [] : [
      { key: "organization" as BusinessSection, label: t("business.organization"), icon: <Building2 size={18} /> },
    ]),
  ];
  const sidebarItems = isPlatformWorkspace
    ? businessSidebarItems.filter(item =>
        (item.key === "products" && platformBusinessScope !== "SERVICE")
        || (item.key === "services" && platformBusinessScope !== "ITEM"))
    : businessSidebarItems;

  useEffect(() => {
    if (!isPlatformWorkspace) return;
    const allowedSections: BusinessSection[] = platformBusinessScope === "SERVICE"
      ? ["services"]
      : platformBusinessScope === "BOTH"
        ? ["products", "services"]
        : ["products"];
    if (!allowedSections.includes(section)) {
      setSection(allowedSections[0]);
    }
  }, [isPlatformWorkspace, platformBusinessScope, section]);

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
    {
      label: t("business.product.add"),
      icon: <Package size={16} />,
      onClick: () => {
        setEditProduct(null);
        setProductForm({ name: "", description: "", deepLink: "", price: "", categoryId: "", categoryLabel: "", tags: "", attributesText: "", isActive: true });
        setShowProductForm(true);
        setSection("products");
      },
    },
    {
      label: t("business.service.add"),
      icon: <Briefcase size={16} />,
      onClick: () => {
        setEditService(null);
        setServiceForm({ name: "", description: "", basePrice: "", categoryId: "", categoryLabel: "", serviceMode: "ON_DEMAND", scheduleText: "", attributesText: "", isActive: true });
        setShowServiceForm(true);
        setSection("services");
      },
    },
    { label: t("drops.create"), icon: <Zap size={16} />, onClick: () => setSection("drops") },
    { label: t("business.importData"), icon: <Upload size={16} />, onClick: () => setSection("import") },
  ];

  const loadCoreData = useCallback(async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      const [profileRes, dropsRes, branchesRes, businessRes] = await Promise.allSettled([
        getBrandProfile(businessId),
        listDrops(businessId),
        listBranches(businessId),
        getBusiness(businessId).catch(() => null),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (dropsRes.status === "fulfilled") setDrops(dropsRes.value);
      if (branchesRes.status === "fulfilled") {
        setBranches(branchesRes.value);
        setSelectedBranchId(current => current || branchesRes.value[0]?.id || "");
        setImportBranchId(current => current || branchesRes.value[0]?.id || "");
      }
      if (businessRes.status === "fulfilled" && businessRes.value) {
        setBusinessOnlineOnly(Boolean(businessRes.value.onlineOnly));
      }
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.loadError"), "error");
    } finally {
      setBusy(false);
    }
  }, [businessId]);

  const loadProducts = useCallback(async () => {
    if (!businessId) return;
    const cached = productsCacheRef.current.get(productsPage);
    if (cached) {
      setProducts(cached.items);
      setProductsTotal(cached.totalElements);
      return;
    }
    setProductsLoadingPage(true);
    try {
      const res = await listProducts(businessId, { branchId: selectedBranchId || undefined, page: productsPage, size: 10 });
      productsCacheRef.current.set(productsPage, { items: res.items, totalElements: res.totalElements });
      setProducts(res.items);
      setProductsTotal(res.totalElements);
    } catch (e) {
      console.error("loadProducts failed", e);
    } finally {
      setProductsLoadingPage(false);
    }
  }, [businessId, selectedBranchId, productsPage]);

  const reloadFirstProductPage = useCallback(async () => {
    productsCacheRef.current.clear();
    setProductsLoadingPage(true);
    try {
      const res = await listProducts(businessId, { branchId: selectedBranchId || undefined, page: 0, size: 10 });
      const newItems = res.items.filter(p => !prevProductIdsRef.current.has(p.productId));
      setProducts(res.items);
      setProductsTotal(res.totalElements);
      setProductsPage(0);
      if (newItems.length > 0) {
        setNewProductIds(new Set(newItems.map(p => p.productId)));
        setTimeout(() => setNewProductIds(new Set()), 5000);
      }
      setSection("products");
    } catch { /* empty */ } finally {
      setProductsLoadingPage(false);
    }
  }, [businessId, selectedBranchId]);

  const loadServices = useCallback(async () => {
    if (!businessId) return;
    setServicesBusy(true);
    try {
      const res = await listServices(businessId, { branchId: selectedBranchId || undefined, page: 0, size: 20 });
      setServices(res.items);
    } catch (e) {
      console.error("loadServices failed", e);
    } finally {
      setServicesBusy(false);
    }
  }, [businessId, selectedBranchId]);

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
    if (!businessId || !employeeForm.displayName.trim() || !employeeForm.email) return;
    if (!isValidEmail(employeeForm.email)) {
      toast.show(t("business.validation.emailInvalid"), "error");
      return;
    }
    setEmployeesBusy(true);
    try {
      const created = await createEmployee(businessId, {
        email: employeeForm.email,
        displayName: employeeForm.displayName.trim(),
        role: employeeForm.role,
        branchId: undefined,
      });
      setEmployees(current => [created, ...current.filter(item => item.id !== created.id)]);
      setEmployeeForm({ displayName: "", email: "", role: "MANAGER", branchId: "" });
      setShowEmployeeForm(false);
      toast.show(t("business.toast.staffAdded"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.staffAddError"), "error");
    } finally {
      setEmployeesBusy(false);
    }
  };

  const handleDeletePendingEmployee = async (employee: StaffDto) => {
    if (!businessId || employee.status !== "PENDING_ACTIVATION") return;
    setEmployeesBusy(true);
    try {
      await deletePendingEmployee(businessId, employee.id);
      setEmployees(current => current.filter(item => item.id !== employee.id));
      await loadBranches();
      toast.show(t("business.toast.pendingEmployeeDeleted"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.pendingEmployeeDeleteError"), "error");
    } finally {
      setEmployeesBusy(false);
    }
  };

  useEffect(() => { if (hasBusinessAccess) loadCoreData(); }, [hasBusinessAccess, loadCoreData]);
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

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
  }, []);

  useEffect(() => {
    if (hasBusinessAccess
        && initialConversationId
        && selectedConversationId !== initialConversationId) {
      setSection("overview");
      handleSelectConversation(initialConversationId);
    }
  }, [
    handleSelectConversation,
    hasBusinessAccess,
    initialConversationId,
    selectedConversationId,
  ]);

  useEffect(() => { if (hasBusinessAccess) { loadChats(); } }, [hasBusinessAccess, loadChats]);

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!membership && isPlatformCandidate && platformWorkspaceAccess === null) {
    return <Loading />;
  }

  if (!hasBusinessAccess) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const handleSaveProfile = async () => {
    if (!businessId) return;
    setBusy(true);
    setProfileFieldErrors([]);
    try {
      const saved = await updateBrandProfile(businessId, profile);
      setProfile(saved);
      toast.show(t("business.toast.profileSaved"), "success");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fieldErrors?.length) {
          setProfileFieldErrors(e.fieldErrors);
        }
        toast.show(e.message, "error");
      } else {
        toast.show(t("business.toast.saveError"), "error");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDrop = async (data: Partial<BrandDropDto>, coverFile: File | null) => {
    if (!businessId) {
      toast.show(t("business.toast.sessionNotFound"), "error");
      return;
    }
    try {
      const created = await createDrop(businessId, data);
      const completed = coverFile ? await uploadDropCover(created.id, coverFile) : created;
      setDrops(current => [completed, ...current]);
      toast.show(t("business.toast.dropCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.dropCreateError"), "error");
      throw e;
    }
  };

  const handleCancelDrop = async (drop: BrandDropDto) => {
    if (!businessId) return;
    await cancelDrop(drop.id);
    setDrops(drops.map(d => d.id === drop.id ? { ...d, isActive: !d.isActive } : d));
  };

  const handleDeleteDrop = async (drop: BrandDropDto) => {
    if (!businessId) return;
    await deleteDrop(drop.id);
    setDrops(drops.filter(d => d.id !== drop.id));
  };

  // Product CRUD
  const resetProductForm = () => {
    setProductForm({ name: "", description: "", deepLink: "", price: "", categoryId: "", categoryLabel: "", tags: "", attributesText: "", isActive: true });
    setEditProduct(null);
    setShowProductForm(false);
  };

  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      toast.show(t("business.toast.productNameRequired"), "error");
      return;
    }
    const catLabel = productForm.categoryLabel.trim();
    const catId = productForm.categoryId || undefined;
    if (!catId && !catLabel) {
      toast.show(t("business.toast.selectCategory"), "error");
      return;
    }
    try {
      const created = await createProduct(businessId, {
        branchId: selectedBranchId || undefined,
        name: productForm.name,
        description: productForm.description,
        deepLink: productForm.deepLink.trim() || undefined,
        price: productForm.price !== "" ? Number(productForm.price) : undefined,
        categoryId: catId,
        categoryName: catLabel || undefined,
        tags: productForm.tags.split(",").map(value => value.trim()).filter(Boolean),
        attributes: parseAttributes(productForm.attributesText) ?? {},
        isActive: true,
      });
      productsCacheRef.current.clear();
      setProducts(current => [created, ...current.filter(item => item.productId !== created.productId)]);
      setProductsTotal(current => current + 1);
      setProductsPage(0);
      resetProductForm();
      toast.show(t("business.toast.productCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.productCreateError"), "error");
    }
  };

  const handleUpdateProduct = async () => {
    if (!businessId || !editProduct) return;
    try {
      await updateProduct(editProduct.productId, {
        name: productForm.name || undefined,
        description: productForm.description,
        deepLink: productForm.deepLink.trim() || undefined,
        price: productForm.price !== "" ? Number(productForm.price) : undefined,
        categoryId: productForm.categoryId || undefined,
        categoryName: productForm.categoryLabel.trim() || undefined,
        tags: productForm.tags.split(",").map(value => value.trim()).filter(Boolean),
        attributes: parseAttributes(productForm.attributesText) ?? {},
        isActive: productForm.isActive,
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
    if (!businessId) return;
    try {
      productsCacheRef.current.clear();
      await deleteProduct(product.productId);
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
      deepLink: p.deepLink || "",
      price: p.price != null ? String(p.price) : "",
      categoryId: p.categoryId || "",
      categoryLabel: p.categoryLabel || "",
      tags: (p.tags || []).join(", "),
      attributesText: formatAttributes(p.attributes),
      isActive: p.isActive,
    });
    setShowProductForm(false);
  };

  const handleAiEnrichment = async (targetType: "PRODUCT" | "SERVICE" | "UNIQUE_OFFER", aggregateIds: string[]) => {
    if (!isPlatformWorkspace || aggregateIds.length === 0) return;
    setAiEnrichmentBusy(true);
    try {
      const result = await requestAiEnrichment(targetType, aggregateIds);
      setSelectedProductOfferIds(new Set());
      if (targetType === "PRODUCT") {
        productsCacheRef.current.clear();
        await loadProducts();
      }
      if (targetType === "SERVICE") {
        await loadServices();
      }
      if (targetType === "UNIQUE_OFFER" && businessId) {
        setDrops(await listDrops(businessId));
      }
      toast.show(`AI enrichment: ${result.enrichedCount}`, "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.updateError"), "error");
    } finally {
      setAiEnrichmentBusy(false);
    }
  };

  // Service CRUD
  const resetServiceForm = () => {
    setServiceForm({ name: "", description: "", basePrice: "", categoryId: "", categoryLabel: "", serviceMode: "ON_DEMAND", scheduleText: "", attributesText: "", isActive: true });
    setEditService(null);
    setShowServiceForm(false);
  };

  const handleCreateService = async () => {
    if (!serviceForm.name.trim()) {
      toast.show(t("business.toast.serviceNameRequired"), "error");
      return;
    }
    const catLabel = serviceForm.categoryLabel.trim();
    const catId = serviceForm.categoryId || undefined;
    if (!catId && !catLabel) {
      toast.show(t("business.toast.selectServiceCategory"), "error");
      return;
    }
    try {
      const created = await createService(businessId, {
        branchId: selectedBranchId || undefined,
        categoryId: catId,
        categoryName: catLabel || undefined,
        name: serviceForm.name,
        description: serviceForm.description,
        basePrice: serviceForm.basePrice !== "" ? Number(serviceForm.basePrice) : undefined,
        serviceMode: serviceForm.serviceMode,
        scheduleText: serviceForm.scheduleText,
        attributes: parseAttributes(serviceForm.attributesText) ?? {},
        isActive: true,
      });
      setServices(current => [created, ...current.filter(item => item.serviceOfferingId !== created.serviceOfferingId)]);
      resetServiceForm();
      toast.show(t("business.toast.serviceCreated"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.serviceCreateError"), "error");
    }
  };

  const handleUpdateService = async () => {
    if (!businessId || !editService) return;
    try {
      await updateService(businessId, editService.serviceOfferingId, {
        name: serviceForm.name || undefined,
        description: serviceForm.description,
        basePrice: serviceForm.basePrice !== "" ? Number(serviceForm.basePrice) : undefined,
        serviceMode: serviceForm.serviceMode,
        scheduleText: serviceForm.scheduleText,
        categoryId: serviceForm.categoryId || undefined,
        categoryName: serviceForm.categoryLabel.trim() || undefined,
        attributes: parseAttributes(serviceForm.attributesText) ?? {},
        isActive: serviceForm.isActive,
      });
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
      basePrice: s.basePrice != null ? String(s.basePrice) : "",
      categoryId: s.categoryId || "",
      categoryLabel: s.categoryLabel || "",
      serviceMode: s.serviceMode,
      scheduleText: s.scheduleText || "",
      attributesText: formatAttributes(s.attributes),
      isActive: s.isActive,
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
    if (!branchForm.address || !branchForm.cityId) {
      toast.show(t("business.toast.branchLocationRequired"), "error");
      return;
    }
    try {
      const created = await createBranch(businessId, {
        name: branchForm.name.trim(),
        address: branchForm.address || undefined,
        addressDetails: branchForm.addressDetails || undefined,
        cityId: branchForm.cityId || undefined,
        latitude: branchForm.latitude,
        longitude: branchForm.longitude,
        timeZoneId: branchForm.timeZoneId || undefined,
        weeklyHours: branchForm.weeklyHours.length > 0 ? branchForm.weeklyHours : undefined,
        specialHours: branchForm.specialHours.length > 0 ? branchForm.specialHours : undefined,
        pickupAvailable: branchForm.pickupAvailable,
      });
      setBranchForm(emptyBranchForm());
      setShowBranchForm(false);
      setSelectedBranchId(created.id);
      setImportBranchId(created.id);
      loadBranches();
      toast.show(t("business.toast.branchCreated"), "success");
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === "BRANCH_NOT_ALLOWED_ONLINE_ONLY") {
        setBusinessOnlineOnly(true);
      }
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
      await updateBranch(editBranchId, {
        name: branchForm.name.trim() || undefined,
        address: branchForm.address || undefined,
        addressDetails: branchForm.addressDetails || undefined,
        cityId: branchForm.cityId || undefined,
        latitude: branchForm.latitude ?? undefined,
        longitude: branchForm.longitude ?? undefined,
        timeZoneId: branchForm.timeZoneId || undefined,
        weeklyHours: branchForm.weeklyHours.length > 0 ? branchForm.weeklyHours : undefined,
        specialHours: branchForm.specialHours.length > 0 ? branchForm.specialHours : undefined,
        pickupAvailable: branchForm.pickupAvailable,
      });
      setBranchForm(emptyBranchForm());
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
      const created = await createStaff(businessId, branchId, {
        email: form.email,
        displayName: form.displayName.trim(),
        role: form.role || "WORKER",
      });
      setStaffByBranch(current => ({
        ...current,
        [branchId]: [created, ...(current[branchId] || []).filter(item => item.id !== created.id)],
      }));
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
    <div className="ask-business-sidebar__inner">
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
      {!isPlatformWorkspace && (
        <button
          type="button"
          className={`ask-business-profile-card${section === "profile" ? " is-active" : ""}`}
          onClick={() => { setSection("profile"); setSidebarOpen(false); }}
        >
          <span
            className="ask-business-profile-card__logo"
            style={{
              backgroundColor: profile.brandColor || DEFAULT_BRAND_COLOR,
              backgroundImage: profile.logoUrl ? `url(${profile.logoUrl})` : undefined,
            }}
          >
            {!profile.logoUrl && <Store size={22} />}
          </span>
          <span className="ask-business-profile-card__copy">
            <strong>{profile.businessName || membership?.businessName || t("business.companyCabinet")}</strong>
            <small>
              {[branches[0]?.address, branches[0]?.cityName].filter(Boolean).join(", ") || t("business.businessProfile")}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );

  return (
    <main id="main-content" className="ask-business-page">
      <div className="ask-business-shell" style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* Desktop sidebar */}
        <aside
          className="fcw-hidden-mobile ask-business-sidebar"
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
            <button
              className="fcw-hidden-mobile"
              type="button"
              onClick={() => setQuickRailOpen(open => !open)}
              aria-expanded={quickRailOpen}
              aria-label={t("business.quickActions")}
              style={{
                position: "fixed",
                right: 0,
                top: 96,
                width: 38,
                height: 42,
                zIndex: 21,
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                borderRight: "none",
                borderRadius: "var(--fcw-radius-md) 0 0 var(--fcw-radius-md)",
                backgroundColor: "var(--fcw-color-surface)",
                color: "var(--fcw-color-primary)",
                cursor: "pointer",
              }}
            >
              {quickRailOpen ? <X size={17} /> : <Zap size={17} />}
            </button>
            <motion.aside
              className="fcw-hidden-mobile"
              initial={false}
              animate={{ x: quickRailOpen ? 0 : 200 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                right: 0,
                top: 144,
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
        <div className="ask-business-content" style={{ flex: 1, minWidth: 0 }}>
          <div className="fcw-container ask-business-container" style={{ paddingTop: "var(--fcw-space-md)", paddingBottom: "var(--fcw-space-section)" }}>
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
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                    onClick={() => setSection(item.key)}
                  >
                    {item.icon}
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
              <div className="ask-business-header" style={{
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
                  {membership?.businessName || t("business.companyCabinet")}
                </span>
                <span className="fcw-label" style={{
                  color: isStaff ? "var(--fcw-color-text-tertiary)" : "var(--fcw-color-primary)",
                  backgroundColor: isStaff ? "var(--fcw-color-surface-secondary)" : "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "var(--fcw-radius-full)",
                  flexShrink: 0,
                }}>
                  {isPlatformWorkspace
                    ? t("platform.managed.title")
                    : isManager
                      ? t("business.employee.manager")
                      : isWorker
                        ? t("business.employee.worker")
                        : isStaff
                          ? ""
                          : t("business.owner")}
                </span>
                <div style={{ flex: 1 }} />
                {branches.length > 0 && (
                  <Select
                    size="sm"
                    options={[{ value: "", label: t("business.allBranches") }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                    value={selectedBranchId}
                    onChange={(v) => { setSelectedBranchId(v); setImportBranchId(v); }}
                  />
                )}
              </div>

              {catalogStatus && catalogStatus.verificationStatus && catalogStatus.verificationStatus !== "APPROVED" && (
                <Card padding="md" style={{
                  marginBottom: "var(--fcw-space-md)",
                  borderColor: catalogStatus.verificationStatus === "REJECTED" ? "var(--fcw-color-error)" : "var(--fcw-amber-500)",
                  backgroundColor: catalogStatus.verificationStatus === "REJECTED"
                    ? "color-mix(in srgb, var(--fcw-color-error) 6%, transparent)"
                    : "color-mix(in srgb, var(--fcw-amber-500) 8%, transparent)",
                }}>
                  <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", alignItems: "center" }}>
                    <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 0 }}>
                      <span className="fcw-body fcw-weight-semibold">
                        {t(`business.verification.status.${catalogStatus.verificationStatus}`)}
                      </span>
                      <span className="fcw-body-s fcw-text-secondary">
                        {t(`business.verification.description.${catalogStatus.verificationStatus}`)}
                      </span>
                    </div>
                  </div>
                </Card>
              )}
              {catalogStatus && catalogStatus.catalogStatus !== "COMPLETED" && (
                <Card padding="md" style={{
                  marginBottom: "var(--fcw-space-md)",
                  borderColor: catalogStatus.catalogStatus === "RESTRICTED" ? "var(--fcw-color-error)" : "var(--fcw-amber-500)",
                  backgroundColor: catalogStatus.catalogStatus === "RESTRICTED"
                    ? "color-mix(in srgb, var(--fcw-color-error) 6%, transparent)"
                    : "color-mix(in srgb, var(--fcw-amber-500) 8%, transparent)",
                }}>
                  <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", alignItems: "center" }}>
                    <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 0 }}>
                      <span className="fcw-body fcw-weight-semibold">
                        {catalogStatus.catalogStatus === "RESTRICTED"
                          ? t("business.catalogSetup.restrictedTitle")
                          : catalogStatus.catalogStatus === "REVIEW_REQUIRED"
                            ? t("business.catalogSetup.reviewTitle")
                          : t("business.catalogSetup.deadlineTitle", {
                              days: Math.max(0, Math.ceil((new Date(catalogStatus.catalogSetupDeadlineAt ?? catalogStatus.catalogSetupStartedAt ?? "").getTime() - Date.now()) / 86400000)),
                            })}
                      </span>
                      <span className="fcw-body-s fcw-text-secondary">
                        {catalogStatus.catalogStatus === "RESTRICTED"
                          ? t("business.catalogSetup.restrictedDescription")
                          : catalogStatus.catalogStatus === "REVIEW_REQUIRED"
                            ? t("business.catalogSetup.reviewDescription")
                          : t("business.catalogSetup.deadlineDescription")}
                      </span>
                    </div>
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
                  <div className="fcw-flex-col ask-business-overview" style={{ gap: "var(--fcw-space-md)" }}>
                    <div className="ask-business-welcome">
                      <h1>{t("business.overview")}</h1>
                      <p>{membership?.businessName || t("business.companyCabinet")}</p>
                    </div>
                    <div className="ask-business-metrics">
                      <button type="button" onClick={() => setSection("products")}>
                        <span><Package size={25} /></span>
                        <span><small>{t("business.products")}</small><strong>{productsTotal}</strong><em>Всего товаров</em></span>
                      </button>
                      <button type="button" onClick={() => setSection("services")}>
                        <span><Briefcase size={25} /></span>
                        <span><small>{t("business.services")}</small><strong>{services.length}</strong><em>Активные услуги</em></span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const conversation = chatConversations.find(item => item.businessUnreadCount > 0) ?? chatConversations[0];
                          if (conversation) handleSelectConversation(conversation.conversationId);
                        }}
                      >
                        <span><MessageCircle size={25} /></span>
                        <span>
                          <small>{t("business.chats.title")}</small>
                          <strong>{chatConversations.reduce((count, item) => count + item.businessUnreadCount, 0)}</strong>
                          <em>Непрочитанные</em>
                        </span>
                      </button>
                    </div>
                    <div className="ask-business-inbox" style={{ display: "flex", gap: "var(--fcw-space-md)", alignItems: "flex-start" }}>
                    <Card padding="lg" className="ask-business-inbox-card" style={{ flex: 1, minWidth: 0 }}>
                      <div className="ask-business-inbox-card__heading">
                        <h2>{t("business.chats.title")}</h2>
                        <span>{chatConversations.length}</span>
                      </div>
                      {chatConversations.length === 0 && (
                        <EmptyState title={t("business.chats.empty")} description={t("business.chats.emptyDesc")} />
                      )}

                      {chatConversations.length > 0 && (
                        <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                          {chatConversations.map(conv => (
                            <div
                              key={conv.conversationId}
                              className="fcw-flex-between fcw-items-center ask-business-inbox-row"
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

                  </div>
                  </div>
                )}

                {/* Products */}
                {section === "products" && (
                  <ProductsTab
                    businessId={businessId}
                    products={products}
                    productsTotal={productsTotal}
                    productsPage={productsPage}
                    productsLoadingPage={productsLoadingPage}
                    showProductForm={showProductForm}
                    editProduct={editProduct}
                    productForm={productForm}
                    activeBranchId={activeBranchId}
                    branches={branches}
                    selectedProductOfferIds={selectedProductOfferIds}
                    managedImportItems={managedImportItems}
                    aiEnrichmentBusy={aiEnrichmentBusy}
                    isWorker={isWorker}
                    isOwner={isOwner}
                    isManager={isManager}
                    isPlatformWorkspace={isPlatformWorkspace}
                    reduced={reduced}
                    setProductsPage={setProductsPage}
                    setShowProductForm={setShowProductForm}
                    setProductForm={setProductForm}
                    setSelectedProductOfferIds={setSelectedProductOfferIds}
                    setManagedImportDialogScope={setManagedImportDialogScope}
                    setManagedImportChat={setManagedImportChat}
                    setEditProduct={setEditProduct}
                    setImportMode={setImportMode}
                    setSection={setSection}
                    handleCreateProduct={handleCreateProduct}
                    handleUpdateProduct={handleUpdateProduct}
                    handleDeleteProduct={handleDeleteProduct}
                    resetProductForm={resetProductForm}
                    handleAiEnrichment={handleAiEnrichment}
                    t={t}
                  />
                )}

                {/* Services */}
                {section === "services" && (
                  <ServicesTab
                    businessId={businessId}
                    services={services}
                    servicesBusy={servicesBusy}
                    showServiceForm={showServiceForm}
                    editService={editService}
                    serviceForm={serviceForm}
                    managedImportItems={managedImportItems}
                    aiEnrichmentBusy={aiEnrichmentBusy}
                    isWorker={isWorker}
                    isOwner={isOwner}
                    isManager={isManager}
                    isPlatformWorkspace={isPlatformWorkspace}
                    reduced={reduced}
                    setShowServiceForm={setShowServiceForm}
                    setServiceForm={setServiceForm}
                    setManagedImportDialogScope={setManagedImportDialogScope}
                    setManagedImportChat={setManagedImportChat}
                    setEditService={setEditService}
                    setImportMode={setImportMode}
                    setSection={setSection}
                    handleCreateService={handleCreateService}
                    handleUpdateService={handleUpdateService}
                    resetServiceForm={resetServiceForm}
                    handleAiEnrichment={handleAiEnrichment}
                    t={t}
                  />
                )}

                {/* Drops / Unique Offers */}
                {section === "drops" && (
                  <div>
                    <DropsEditor
                      drops={drops}
                      onCreate={handleCreateDrop}
                      onCancel={handleCancelDrop}
                      onDelete={handleDeleteDrop}
                      busy={busy}
                      onAiEnrichment={isPlatformWorkspace
                        ? drop => handleAiEnrichment("UNIQUE_OFFER", [drop.id])
                        : undefined}
                      aiEnrichmentBusy={aiEnrichmentBusy}
                    />
                  </div>
                )}

                {section === "profile" && (
                  <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                    <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "var(--fcw-space-sm)", alignItems: "center" }}>
                      <div>
                        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("business.businessProfile")}</h1>
                        <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0" }}>
                          {t("business.businessProfileDescription")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="fcw-btn fcw-btn-secondary"
                        onClick={() => navigate(buildRoute(ROUTES.storefront, { businessId }))}
                      >
                        <ExternalLink size={16} />
                        {t("business.viewBusinessProfile")}
                      </button>
                    </div>
                    <ProfileEditor
                      profile={profile}
                      onChange={setProfile}
                      onSave={handleSaveProfile}
                      busy={busy}
                      readOnly={isWorker}
                      fieldErrors={profileFieldErrors}
                    />
                  </div>
                )}

                {/* Organization — Branches + Team */}
                {section === "organization" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--fcw-space-xl)" }}>

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
                            {(() => {
                              const team = employees.filter(e => e.role !== "WORKER");
                              return team.length === 0 ? t("business.noEmployees") : `${team.length} ${t("business.employeeCount")}`;
                            })()}
                          </p>
                        </div>
                        {(isOwner || isManager) && (
                          <button
                            className="fcw-btn fcw-btn-primary fcw-btn-sm"
                            onClick={() => setShowEmployeeForm(v => !v)}
                          >
                            <Plus size={16} />{t("business.employee.add")}
                          </button>
                        )}
                      </div>

                      {employeesBusy && <Loading size="sm" />}

                      {!employeesBusy && employees.filter(e => e.role !== "WORKER").length === 0 && !showEmployeeForm && (
                        <EmptyState
                          title={t("business.noEmployees")}
                          description={t("business.noEmployeesDesc")}
                        />
                      )}

                      {showEmployeeForm && (isOwner || isManager) && (
                        <Card padding="md" style={{ marginBottom: "var(--fcw-space-sm)" }}>
                          <div className="fcw-flex fcw-items-end fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                            <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: "1 1 140px", minWidth: 0 }}>
                              <label className="fcw-label">{t("business.staff.name")}</label>
                              <input
                                className="fcw-input"
                                placeholder={t("business.staff.name")}
                                value={employeeForm.displayName}
                                onChange={e => setEmployeeForm(p => ({ ...p, displayName: e.target.value }))}
                              />
                            </div>
                            <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: "1 1 180px", minWidth: 0 }}>
                              <label className="fcw-label">{t("business.staff.email")}</label>
                              <input
                                className="fcw-input"
                                placeholder={t("business.staff.email")}
                                value={employeeForm.email}
                                onChange={e => setEmployeeForm(p => ({ ...p, email: e.target.value }))}
                              />
                            </div>
                            <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: "0 0 110px" }}>
                              <label className="fcw-label">{t("business.staff.role")}</label>
                              <Select
                                size="sm"
                                options={[{ value: "MANAGER", label: t("auth.role.BUSINESS_MANAGER") }]}
                                value={employeeForm.role}
                                onChange={v => setEmployeeForm(p => ({ ...p, role: v }))}
                              />
                            </div>
                            <button
                              className="fcw-btn fcw-btn-primary fcw-btn-sm"
                              style={{ flexShrink: 0 }}
                              onClick={handleCreateEmployee}
                              disabled={employeesBusy}
                            >
                              {employeesBusy ? <Loader2 size={14} className="fcw-animate-spin" /> : <Plus size={14} />}
                              {t("business.staff.add")}
                            </button>
                          </div>
                        </Card>
                      )}

                      {!employeesBusy && employees.filter(e => e.role !== "WORKER").map(member => (
                        <div key={member.id} style={{
                          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                          padding: "var(--fcw-space-sm) var(--fcw-space-sm)",
                          backgroundColor: "var(--fcw-color-surface)",
                          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                          borderRadius: "var(--fcw-radius-lg)",
                          marginBottom: "var(--fcw-space-2xs)",
                        }}>
                          <UserRound size={16} style={{ color: "var(--fcw-color-primary)", flexShrink: 0 }} />
                          <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {member.displayName}
                          </span>
                          <span className="fcw-label" style={{
                            color: "var(--fcw-color-text-secondary)",
                            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                            borderRadius: "var(--fcw-radius-full)",
                            padding: "0.125rem 0.5rem",
                          }}>
                            {t(member.role === "OWNER" ? "business.employee.owner" : "business.employee.manager")}
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
                          <div style={{ flex: 1 }} />
                          {member.status === "PENDING_ACTIVATION" && (isOwner || isManager) && (
                            <button
                              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                              style={{ color: "var(--fcw-color-error)", flexShrink: 0 }}
                              onClick={() => handleDeletePendingEmployee(member)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </section>

                    {/* ═══════ Divider ═══════ */}
                    <div style={{ height: "1px", backgroundColor: "var(--fcw-color-border)", margin: 0 }} />

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
                        {(isOwner || isManager) && (
                          <button
                            className="fcw-btn fcw-btn-primary fcw-btn-sm"
                            onClick={() => {
                              if (businessOnlineOnly) {
                                setShowOnlineOnlyConfirm(true);
                                return;
                              }
                              setEditBranchId(null);
                              setBranchForm(emptyBranchForm());
                              setShowBranchForm(v => !v);
                            }}
                          >
                            <Plus size={16} />{t("business.branch.add")}
                          </button>
                        )}
                      </div>

                      {branchesBusy && <Loading size="sm" />}

                      {!branchesBusy && branches.length === 0 && !showBranchForm && !showOnlineOnlyConfirm && (
                        <EmptyState
                          title={t("business.noBranches")}
                          description={t("business.noBranchesDesc")}
                        />
                      )}

                      <AnimatePresence>
                        {showOnlineOnlyConfirm && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                              position: "fixed", inset: 0, zIndex: 1000,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              backgroundColor: "rgba(0,0,0,0.5)",
                            }}
                            onClick={() => setShowOnlineOnlyConfirm(false)}
                          >
                            <Card padding="lg" style={{ maxWidth: 480, margin: "1rem" }} onClick={e => e.stopPropagation()}>
                              <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                                <h3 className="fcw-h3" style={{ margin: 0 }}>{t("business.branch.onlineOnlyConfirmTitle")}</h3>
                                <p className="fcw-body" style={{ color: "var(--fcw-color-text-secondary)" }}>{t("business.branch.onlineOnlyConfirmDesc")}</p>
                                <div className="fcw-flex fcw-justify-end" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-ghost" onClick={() => setShowOnlineOnlyConfirm(false)}>
                                    {t("business.branch.onlineOnlyCancel")}
                                  </button>
                                  <button className="fcw-btn fcw-btn-primary" onClick={() => {
                                    setShowOnlineOnlyConfirm(false);
                                    setEditBranchId(null);
                                    setBranchForm(emptyBranchForm());
                                    setShowBranchForm(true);
                                  }}>
                                    {t("business.branch.onlineOnlyConfirm")}
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <BranchEditor
                        open={showBranchForm && !editBranchId}
                        form={branchForm}
                        cities={cities}
                        onChange={setBranchForm}
                        onClose={() => {
                          setShowBranchForm(false);
                          setBranchForm(emptyBranchForm());
                        }}
                        onCreate={handleCreateBranch}
                        t={t}
                      />

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
                                <div className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                                  <span className="fcw-body-s fcw-weight-medium" style={{ color: "var(--fcw-color-text-secondary)" }}>
                                    {t("business.branch.location")}
                                  </span>
                                  <MapLocationPicker
                                    initialLat={branchForm.latitude ?? undefined}
                                    initialLng={branchForm.longitude ?? undefined}
                                    onChange={(lat, lng, address, cityName) => {
                                      const cityId = cities.find(city =>
                                        normalizeCityName(city.name) === normalizeCityName(cityName || "")
                                      )?.id || "";
                                      setBranchForm(p => ({
                                        ...p,
                                        latitude: lat,
                                        longitude: lng,
                                        address: address || "",
                                        cityId,
                                      }));
                                    }}
                                  />
                                  {(branchForm.address || branchForm.cityId) && (
                                    <span className="fcw-body-s fcw-text-secondary">
                                      {[cities.find(city => city.id === branchForm.cityId)?.name, branchForm.address].filter(Boolean).join(", ")}
                                    </span>
                                  )}
                                  <input
                                    className="fcw-input"
                                    placeholder={t("business.branch.addressDetails")}
                                    value={branchForm.addressDetails}
                                    onChange={e => setBranchForm(p => ({ ...p, addressDetails: e.target.value }))}
                                  />
                                  {branchForm.latitude != null && branchForm.longitude != null && (
                                    <a
                                      className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                      style={{ textDecoration: "none", alignSelf: "flex-start" }}
                                      href={`https://www.openstreetmap.org/?mlat=${branchForm.latitude}&mlon=${branchForm.longitude}#map=17/${branchForm.latitude}/${branchForm.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MapPin size={14} />{t("business.branch.openIn2gis")}
                                    </a>
                                  )}
                                </div>
                                <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                                  <span className="fcw-label">{t("business.branch.timeZoneId")}</span>
                                  <input type="text" className="fcw-input" placeholder="Asia/Almaty" value={branchForm.timeZoneId} onChange={e => setBranchForm(form => ({ ...form, timeZoneId: e.target.value }))} />
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={branchForm.pickupAvailable}
                                    onChange={e => setBranchForm(f => ({ ...f, pickupAvailable: e.target.checked }))}
                                  />
                                  <span className="fcw-body-s">{t("business.branch.pickupAvailable")}</span>
                                </label>
                                <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                                  <span className="fcw-label">{t("business.branch.weeklyHours")}</span>
                                  {branchForm.weeklyHours.map((h, i) => (
                                    <div key={i} className="fcw-flex" style={{ gap: "0.375rem", alignItems: "center" }}>
                                      <select className="fcw-input" style={{ width: "80px" }} value={h.dayOfWeek}
                                        onChange={e => setBranchForm(f => ({
                                          ...f,
                                          weeklyHours: f.weeklyHours.map((r, j) => j === i ? { ...r, dayOfWeek: e.target.value } : r),
                                        }))}>
                                        <option value="">—</option>
                                        {["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"].map(d =>
                                          <option key={d} value={d}>{t(`business.branch.day.${d.toLowerCase()}`)}</option>
                                        )}
                                      </select>
                                      <input type="time" className="fcw-input" style={{ width: "110px" }} value={h.opensAt}
                                        onChange={e => setBranchForm(f => ({
                                          ...f,
                                          weeklyHours: f.weeklyHours.map((r, j) => j === i ? { ...r, opensAt: e.target.value } : r),
                                        }))} />
                                      <span className="fcw-body-s">—</span>
                                      <input type="time" className="fcw-input" style={{ width: "110px" }} value={h.closesAt}
                                        onChange={e => setBranchForm(f => ({
                                          ...f,
                                          weeklyHours: f.weeklyHours.map((r, j) => j === i ? { ...r, closesAt: e.target.value } : r),
                                        }))} />
                                      <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" style={{ color: "var(--fcw-color-error)" }}
                                        onClick={() => setBranchForm(f => ({ ...f, weeklyHours: f.weeklyHours.filter((_, j) => j !== i) }))}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                    onClick={() => setBranchForm(f => ({ ...f, weeklyHours: [...f.weeklyHours, { dayOfWeek: "", opensAt: "", closesAt: "" }] }))}>
                                    <Plus size={14} />{t("business.branch.addHoursRow")}
                                  </button>
                                </div>
                                <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                                  <span className="fcw-label">{t("business.branch.specialHours")}</span>
                                  {branchForm.specialHours.map((h, i) => (
                                    <div key={i} className="fcw-flex-col" style={{ gap: "0.375rem" }}>
                                      <div className="fcw-flex" style={{ gap: "0.375rem", alignItems: "center" }}>
                                        <input type="date" className="fcw-input" style={{ width: "140px" }} value={h.date}
                                          onChange={e => setBranchForm(f => ({
                                            ...f,
                                            specialHours: f.specialHours.map((r, j) => j === i ? { ...r, date: e.target.value } : r),
                                          }))} />
                                        <label className="fcw-flex" style={{ gap: "0.25rem", alignItems: "center", fontSize: "var(--fcw-font-size-body-s)" }}>
                                          <input type="checkbox" checked={h.closed}
                                            onChange={e => setBranchForm(f => ({
                                              ...f,
                                              specialHours: f.specialHours.map((r, j) => j === i ? { ...r, closed: e.target.checked } : r),
                                            }))} />
                                          {t("business.branch.closedAllDay")}
                                        </label>
                                        <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" style={{ color: "var(--fcw-color-error)" }}
                                          onClick={() => setBranchForm(f => ({ ...f, specialHours: f.specialHours.filter((_, j) => j !== i) }))}>
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                      {!h.closed && (
                                        <div className="fcw-flex" style={{ gap: "0.375rem", alignItems: "center" }}>
                                          <input type="time" className="fcw-input" style={{ width: "110px" }} value={h.opensAt}
                                            onChange={e => setBranchForm(f => ({
                                              ...f,
                                              specialHours: f.specialHours.map((r, j) => j === i ? { ...r, opensAt: e.target.value } : r),
                                            }))} />
                                          <span className="fcw-body-s">—</span>
                                          <input type="time" className="fcw-input" style={{ width: "110px" }} value={h.closesAt}
                                            onChange={e => setBranchForm(f => ({
                                              ...f,
                                              specialHours: f.specialHours.map((r, j) => j === i ? { ...r, closesAt: e.target.value } : r),
                                            }))} />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                    onClick={() => setBranchForm(f => ({ ...f, specialHours: [...f.specialHours, { date: "", closed: false, opensAt: "", closesAt: "" }] }))}>
                                    <Plus size={14} />{t("business.branch.addHoursRow")}
                                  </button>
                                </div>
                                <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                                  <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleUpdateBranch}>
                                    <Check size={14} />{t("business.save")}
                                  </button>
                                  <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => {
                                    setEditBranchId(null);
                                    setBranchForm(emptyBranchForm());
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
                                    {[b.address, b.addressDetails].filter(Boolean).join(", ")}
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
                                  {b.pickupAvailable && (
                                    <span className="fcw-label" style={{
                                      color: "var(--fcw-color-primary)",
                                      border: "var(--fcw-border-width-thin) solid var(--fcw-color-primary)",
                                      borderRadius: "var(--fcw-radius-full)",
                                      padding: "0.125rem 0.5rem",
                                    }}>
                                      <Store size={12} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />
                                      {t("seller.pickup")}
                                    </span>
                                  )}
                                  {b.openingSummary && (
                                    <span className="fcw-label" style={{
                                      color: b.openingSummary.state === "OPEN" ? "var(--fcw-color-success)" : "var(--fcw-color-text-secondary)",
                                      border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                                      borderRadius: "var(--fcw-radius-full)",
                                      padding: "0.125rem 0.5rem",
                                    }}>
                                      {formatOpeningLabel(b.openingSummary, t)}
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
                                {(isOwner || isManager) && (
                                  <button
                                    className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                                    style={{ flexShrink: 0 }}
                                    onClick={() => {
                                      setEditBranchId(b.id);
                                      setBranchForm({
                                        name: b.name, address: b.address || "", addressDetails: b.addressDetails || "", cityId: b.cityId || "",
                                        latitude: b.latitude ?? null, longitude: b.longitude ?? null,
                                        timeZoneId: b.timeZoneId || "",
                                        weeklyHours: (b.weeklyHours || []).map(h => ({ dayOfWeek: h.dayOfWeek, opensAt: h.opensAt, closesAt: h.closesAt })),
                                        specialHours: (b.specialHours || []).map(h => ({ date: h.date, closed: h.closed ?? false, opensAt: h.opensAt || "", closesAt: h.closesAt || "" })),
                                        pickupAvailable: Boolean(b.pickupAvailable),
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
                  </div>
                )}

                {/* Import data */}
                {section === "import" && (
                  <ProductImportWizard
                    businessId={businessId}
                    branches={branches}
                    activeBranchId={importBranchId || activeBranchId}
                    onBranchChange={setImportBranchId}
                    onBackToProducts={() => setSection(importMode === "SERVICE" ? "services" : "products")}
                    onImported={reloadFirstProductPage}
                    importMode={importMode}
                    allowAiTools={isPlatformWorkspace}
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
      <ManagedImportRequestDialog
        open={managedImportDialogScope !== null}
        businessId={businessId}
        scope={managedImportDialogScope ?? "ITEM"}
        defaultContactValue={state.session?.user?.email ?? ""}
        initialSourceLinks={onboardingSourceLinks}
        onClose={() => setManagedImportDialogScope(null)}
        onSubmitted={item => setManagedImportItems(current => {
          if (item.businessScope !== "BOTH") return { ...current, [item.businessScope]: item };
          return { ...current, ITEM: item, SERVICE: item };
        })}
      />
      <ManagedImportChatDrawer
        open={managedImportChat !== null}
        conversationId={managedImportChat?.conversationId ?? ""}
        businessId={businessId}
        businessName={membership?.businessName}
        onClose={() => setManagedImportChat(null)}
      />
      <BusinessChatDrawer
        businessId={businessId}
        conversation={chatConversations.find(item => item.conversationId === selectedConversationId) ?? null}
        onClose={() => setSelectedConversationId(null)}
        onActivity={loadChats}
      />
    </main>
  );
}
