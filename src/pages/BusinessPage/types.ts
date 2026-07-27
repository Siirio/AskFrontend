import type { ReactNode } from "react";
import type { BrandProfileDto, BrandDropDto, BusinessProductDto, BusinessServiceDto, StaffDto, ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
import type { BranchDto } from "../../shared/api/domainTypes";
import type { ManagedImportItem } from "../../shared/api/managedImportClient";
import type { BusinessCatalogStatus } from "../../shared/api/sellerOnboardingClient";

export type BusinessSection = "overview" | "products" | "services" | "drops" | "organization" | "events" | "business-card" | "import";

export type BranchFormState = {
  name: string;
  address: string;
  addressDetails: string;
  cityId: string;
  latitude: number | null;
  longitude: number | null;
  timeZoneId: string;
  weeklyHours: Array<{ dayOfWeek: string; opensAt: string; closesAt: string }>;
  specialHours: Array<{ date: string; closed: boolean; opensAt: string; closesAt: string }>;
  pickupAvailable: boolean;
};

export interface OverviewTabProps {
  profile: BrandProfileDto;
  drops: BrandDropDto[];
  branches: BranchDto[];
  catalogStatus: BusinessCatalogStatus | null;
  productsTotal: number;
  products: BusinessProductDto[];
  services: BusinessServiceDto[];
  productsBusy: boolean;
  servicesBusy: boolean;
  selectedBranchId: string;
  managedImportItems: Record<string, ManagedImportItem>;
  dropComposerRequest: number;
  quickRailOpen: boolean;
  setQuickRailOpen: (v: boolean) => void;
  setSection: (s: BusinessSection) => void;
  setSelectedBranchId: (id: string) => void;
  setDropComposerRequest: (v: number) => void;
  setManagedImportDialogScope: (s: "ITEM" | "SERVICE" | "BOTH" | null) => void;
  setManagedImportChat: (item: ManagedImportItem | null) => void;
  isOwner: boolean;
  isManager: boolean;
  isPlatformWorkspace: boolean;
  reduced: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export interface ProductsTabProps {
  businessId: string;
  products: BusinessProductDto[];
  productsTotal: number;
  productsPage: number;
  productsLoadingPage: boolean;
  showProductForm: boolean;
  editProduct: BusinessProductDto | null;
  productForm: {
    name: string; description: string; deepLink: string; price: string;
    categoryId: string; categoryLabel: string; tags: string; attributesText: string; isActive: boolean;
  };
  activeBranchId: string;
  branches: BranchDto[];
  selectedProductOfferIds: Set<string>;
  managedImportItems: Record<string, ManagedImportItem>;
  aiEnrichmentBusy: boolean;
  isWorker: boolean;
  isOwner: boolean;
  isManager: boolean;
  isPlatformWorkspace: boolean;
  reduced: boolean;
  setProductsPage: (p: number) => void;
  setShowProductForm: (v: boolean) => void;
  setProductForm: React.Dispatch<React.SetStateAction<{
    name: string; description: string; deepLink: string; price: string;
    categoryId: string; categoryLabel: string; tags: string; attributesText: string; isActive: boolean;
  }>>;
  setSelectedProductOfferIds: (s: Set<string>) => void;
  setManagedImportDialogScope: (s: "ITEM" | "SERVICE" | "BOTH" | null) => void;
  setManagedImportChat: (item: ManagedImportItem | null) => void;
  setEditProduct: (p: BusinessProductDto | null) => void;
  setImportMode: (m: "ITEM" | "SERVICE") => void;
  setSection: (s: BusinessSection) => void;
  handleCreateProduct: () => Promise<void>;
  handleUpdateProduct: () => Promise<void>;
  handleDeleteProduct: (product: BusinessProductDto) => Promise<void>;
  resetProductForm: () => void;
  handleAiEnrichment: (type: "PRODUCT" | "SERVICE" | "UNIQUE_OFFER", ids: string[]) => Promise<void>;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export interface ServicesTabProps {
  businessId: string;
  services: BusinessServiceDto[];
  servicesBusy: boolean;
  showServiceForm: boolean;
  editService: BusinessServiceDto | null;
  serviceForm: {
    name: string; description: string; basePrice: string; categoryId: string; categoryLabel: string;
    serviceMode: "ON_DEMAND" | "SCHEDULED"; scheduleText: string; attributesText: string; isActive: boolean;
  };
  managedImportItems: Record<string, ManagedImportItem>;
  aiEnrichmentBusy: boolean;
  isWorker: boolean;
  isOwner: boolean;
  isManager: boolean;
  isPlatformWorkspace: boolean;
  reduced: boolean;
  setShowServiceForm: (v: boolean) => void;
  setServiceForm: React.Dispatch<React.SetStateAction<{
    name: string; description: string; basePrice: string; categoryId: string; categoryLabel: string;
    serviceMode: "ON_DEMAND" | "SCHEDULED"; scheduleText: string; attributesText: string; isActive: boolean;
  }>>;
  setManagedImportDialogScope: (s: "ITEM" | "SERVICE" | "BOTH" | null) => void;
  setManagedImportChat: (item: ManagedImportItem | null) => void;
  setEditService: (s: BusinessServiceDto | null) => void;
  setImportMode: (m: "ITEM" | "SERVICE") => void;
  setSection: (s: BusinessSection) => void;
  handleCreateService: () => Promise<void>;
  handleUpdateService: () => Promise<void>;
  resetServiceForm: () => void;
  handleAiEnrichment: (type: "PRODUCT" | "SERVICE" | "UNIQUE_OFFER", ids: string[]) => Promise<void>;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export interface OrganizationTabProps {
  businessId: string;
  branches: BranchDto[];
  branchesBusy: boolean;
  showBranchForm: boolean;
  showOnlineOnlyConfirm: boolean;
  editBranchId: string | null;
  branchForm: BranchFormState;
  cities: Array<{ id: string; name: string }>;
  staffByBranch: Record<string, StaffDto[]>;
  staffForms: Record<string, { displayName: string; email: string; role: string }>;
  staffBusy: string;
  selectedStaffBranchId: string | null;
  staffEditingId: string | null;
  employees: StaffDto[];
  employeesBusy: boolean;
  showEmployeeForm: boolean;
  employeeForm: { displayName: string; email: string; role: string; branchId: string };
  businessOnlineOnly: boolean;
  isOwner: boolean;
  isManager: boolean;
  isWorker: boolean;
  reduced: boolean;
  setShowBranchForm: (v: boolean) => void;
  setShowOnlineOnlyConfirm: (v: boolean) => void;
  setEditBranchId: (id: string | null) => void;
  setBranchForm: React.Dispatch<React.SetStateAction<BranchFormState>>;
  setStaffForms: React.Dispatch<React.SetStateAction<Record<string, { displayName: string; email: string; role: string }>>>;
  setStaffBusy: (v: string) => void;
  setSelectedStaffBranchId: (id: string | null) => void;
  setStaffEditingId: (id: string | null) => void;
  setShowEmployeeForm: (v: boolean) => void;
  setEmployeeForm: React.Dispatch<React.SetStateAction<{ displayName: string; email: string; role: string; branchId: string }>>;
  loadBranches: () => Promise<void>;
  loadStaffForBranch: (branchId: string) => Promise<void>;
  loadEmployees: () => Promise<void>;
  handleCreateBranch: () => Promise<void>;
  handleUpdateBranch: () => Promise<void>;
  handleCreateStaff: (branchId: string) => Promise<void>;
  handleUpdateStaff: (staffId: string) => Promise<void>;
  handleResetPassword: (staffId: string) => Promise<void>;
  handleCreateEmployee: () => Promise<void>;
  handleDeletePendingEmployee: (employee: StaffDto) => Promise<void>;
  emptyBranchForm: () => BranchFormState;
  formatStaffStatus: (status: string) => string;
  formatOpeningLabel: (summary: { state: string; timeZoneId?: string; nextOpensAt?: string; nextClosesAt?: string } | undefined, t: (key: string) => string) => string;
  t: (key: string, params?: Record<string, unknown>) => string;
}
