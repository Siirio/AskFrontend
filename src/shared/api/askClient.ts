import { API_BASE_URL, apiRequest, getAuthHeaders, transformKeys, ApiError } from "./httpClient";
import i18n from "../i18n/i18n";
import { mapSupplierTask } from "./mappers";
import type {
  BusinessProductDto, BusinessProductListDto,
  BusinessServiceDto, BusinessServiceListDto,
  BrandDropDto,
  BrandProfileDto,
  ChatConversationDto, ChatConversationListResponse,
  ChatMessageDto, ChatMessageListResponse,
  ClarificationResponseDto,
  CompareResponseDto,
  ContactResolveDto,
  CustomerRequestDetailDto, CustomerRequestHistoryDto,
  DecisionContextDto,
  PurchaseDestinationDto,
  SearchV2ResponseDto,
  StaffDto,
  SupplierTaskDetailDto,
  SupplierTaskDto
} from "./dto";
import type {
  BranchDto,
  CreateBranchData,
  UpdateBranchData,
} from "./domainTypes";

export type ProductImportTargetField =
  | "NAME"
  | "CATEGORY_LABEL"
  | "DESCRIPTION"
  | "SKU"
  | "PRICE"
  | "TAGS"
  | "IGNORE"
  | "APPEND_TO_DESCRIPTION"
  | "CHARACTERISTIC";

export interface ProductImportColumnInfo {
  sourceColumn: string;
  suggestedTargetField: ProductImportTargetField;
  confidence: number;
}

export interface ProductImportUploadResponse {
  importId: string;
  originalFileName: string;
  status: string;
  totalRows: number;
  columns: ProductImportColumnInfo[];
  sampleRows: Record<string, string>[];
}

export interface ProductImportMappingEntry {
  sourceColumn: string;
  targetField: ProductImportTargetField;
  characteristicName?: string;
}

export interface ProductImportPreviewRow {
  rowId: string;
  rowNumber: number;
  status: string;
  normalizedData: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface ProductImportPreviewResponse {
  importId: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  mappings: ProductImportMappingEntry[];
  rows: ProductImportPreviewRow[];
}

export interface ProductImportApproveResponse {
  importId: string;
  status: string;
  productsCreated: number;
  offersCreated: number;
  rowsSkipped: number;
}

export interface AutodumpDraftDto {
  id: string;
  itemType?: string;
  status?: string;
  title?: string;
  normalizedTitle?: string;
  categoryLabel?: string;
  subcategoryLabel?: string;
  description?: string;
  price?: number;
  priceText?: string;
  brand?: string;
  tagsJson?: string;
  customAttributesJson?: string;
  confidenceNotes?: string;
  needsReview?: boolean;
}

export interface AutodumpSessionStatusResponse {
  sessionId: string;
  status: string;
  totalDraftCount: number;
  approvedCount: number;
  rejectedCount: number;
  errorCount: number;
  drafts: AutodumpDraftDto[];
}

export interface AutodumpPublishResponse {
  sessionId: string;
  sessionStatus: string;
  published: number;
  skipped: number;
}

function getStoredUserLocation() {
  try {
    const raw = window.localStorage.getItem("ask.geo");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return undefined;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return undefined;
  }
}

export type SearchMapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type SearchExplicitFilters = {
  category?: string;
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  radiusMeters?: number;
  businessIds?: string[];
  mapArea?: SearchMapBounds;
};

export type SearchFilters = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  radiusMeters?: number;
  businessIds?: string[];
  mapBounds?: SearchMapBounds;
};

export function searchAskV2(params: {
  rawQuery: string;
  mode: "ITEM" | "SERVICE";
  sort?: "relevance" | "price_asc" | "price_desc" | "distance" | "unique_offers";
  page?: number;
  pageSize?: number;
  explicitFilters?: SearchExplicitFilters;
  decisionContext?: DecisionContextDto;
}) {
  return apiRequest<SearchV2ResponseDto>("/api/v1/search", {
    method: "POST",
    body: {
      rawQuery: params.rawQuery,
      mode: params.mode,
      sort: params.sort || "relevance",
      page: params.page ?? 0,
      pageSize: params.pageSize,
      explicitFilters: params.explicitFilters,
      decisionContext: params.decisionContext || undefined,
      userLocation: getStoredUserLocation(),
      locale: i18n.language || "ru",
    },
  });
}

export function getSearchClarification(params: {
  rawQuery: string;
  mode: "ITEM" | "SERVICE";
  category?: string;
  city?: string;
  language?: string;
}) {
  return apiRequest<ClarificationResponseDto>("/api/v1/search/clarification", {
    method: "POST",
    body: {
      rawQuery: params.rawQuery,
      mode: params.mode,
      category: params.category || "",
      city: params.city || "",
      language: params.language || i18n.language || "ru",
    },
  });
}

export function compareSearchResults(params: {
  mode: "ITEM" | "SERVICE";
  resultIds: string[];
  decisionContext?: DecisionContextDto;
  locale?: string;
}) {
  return apiRequest<CompareResponseDto>("/api/v1/search/compare", {
    method: "POST",
    body: {
      mode: params.mode,
      resultIds: params.resultIds,
      decisionContext: params.decisionContext || undefined,
      locale: params.locale || i18n.language || "ru",
    },
  });
}

export function resolveContactAction(contactActionId: string) {
  return apiRequest<ContactResolveDto>(`/api/v1/contacts/${encodeURIComponent(contactActionId)}/resolve`, {
    method: "POST",
    auth: true,
  });
}

export async function createFallbackRequest(query: string, scope: "product" | "service", city: string) {
  const response = await apiRequest<{
    id: string;
    query: string;
    scope: string;
    city: string;
    status: string;
    matchedSuppliers: number;
  }>("/api/v1/customer-requests", {
    method: "POST",
    auth: true,
    body: { queryText: query, scope, cityName: city },
  });

  return {
    id: response.id,
    query: response.query,
    scope,
    city: response.city,
    status: response.status as "draft" | "dispatching" | "waiting" | "answered",
    matchedSuppliers: response.matchedSuppliers,
  };
}

export async function getSupplierTasks(branchId: string) {
  const dtos = await apiRequest<SupplierTaskDto[]>(`/api/v1/business-admin/branches/${branchId}/tasks`, {
    auth: true,
  });
  return dtos.map(mapSupplierTask);
}

export function getCustomerHistory() {
  return apiRequest<CustomerRequestHistoryDto[]>("/api/v1/customer-requests", { auth: true });
}

export function getCustomerRequestDetail(requestId: string) {
  return apiRequest<CustomerRequestDetailDto>(`/api/v1/customer-requests/${requestId}`, { auth: true });
}

export function getSupplierTaskDetail(branchId: string, taskId: string) {
  return apiRequest<SupplierTaskDetailDto>(`/api/v1/business-admin/branches/${branchId}/tasks/${taskId}`, { auth: true });
}

export function respondToTask(branchId: string, taskId: string, data: { status: string; price?: number; productHint?: string; comment?: string }) {
  return apiRequest<SupplierTaskDetailDto>(`/api/v1/business-admin/branches/${branchId}/tasks/${taskId}/respond`, {
    method: "POST",
    auth: true,
    body: data,
  });
}

export function listProducts(businessId: string, params?: { branchId?: string; categoryId?: string; enabled?: boolean; query?: string; page?: number; size?: number }) {
  const qs = new URLSearchParams();
  if (params?.branchId) qs.set("branchId", params.branchId);
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.enabled !== undefined) qs.set("enabled", String(params.enabled));
  if (params?.query) qs.set("query", params.query);
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.size !== undefined) qs.set("size", String(params.size));
  const q = qs.toString();
  return apiRequest<BusinessProductListDto>(`/api/v1/businesses/${businessId}/items${q ? "?" + q : ""}`, { auth: true });
}

export function createProduct(businessId: string, data: { branchId?: string; categoryId?: string; categoryName?: string; name: string; description?: string; purchaseDestinations?: PurchaseDestinationDto[]; price?: number; isActive?: boolean; tags?: string[]; attributes?: Record<string, unknown> }) {
  return apiRequest<BusinessProductDto>(`/api/v1/businesses/${businessId}/items`, { method: "POST", auth: true, body: data });
}

export function updateProduct(productId: string, data: { branchId?: string; categoryId?: string; categoryName?: string; name?: string; description?: string; purchaseDestinations?: PurchaseDestinationDto[]; price?: number; isActive?: boolean; tags?: string[]; attributes?: Record<string, unknown> }) {
  return apiRequest<BusinessProductDto>(`/api/v1/items/${productId}`, { method: "PATCH", auth: true, body: data });
}

async function syncCatalogImages<T>(path: string, images: import("../lib/catalogImages").CatalogImageDraft[]) {
  const form = new FormData();
  let newIndex = 0;
  images.forEach(image => {
    if (image.file) {
      form.append("files", image.file);
      form.append("order", `new:${newIndex}`);
      newIndex += 1;
    } else if (image.persistedId) {
      form.append("order", image.persistedId);
    }
  });
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new ApiError(response.status, message, null);
  }
  return transformKeys(await response.json()) as T;
}

export function syncProductImages(productId: string, images: import("../lib/catalogImages").CatalogImageDraft[]) {
  return syncCatalogImages<BusinessProductDto>(`/api/v1/items/${productId}/images`, images);
}

export function deleteProduct(productId: string) {
  return apiRequest<void>(`/api/v1/items/${productId}`, { method: "DELETE", auth: true });
}

export function listServices(businessId: string, params?: { branchId?: string; categoryName?: string; active?: boolean; query?: string; page?: number; size?: number }) {
  const qs = new URLSearchParams();
  if (params?.branchId) qs.set("branchId", params.branchId);
  if (params?.categoryName) qs.set("categoryName", params.categoryName);
  if (params?.active !== undefined) qs.set("active", String(params.active));
  if (params?.query) qs.set("query", params.query);
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.size !== undefined) qs.set("size", String(params.size));
  const q = qs.toString();
  return apiRequest<BusinessServiceListDto>(`/api/v1/businesses/${businessId}/services${q ? "?" + q : ""}`, { auth: true });
}

export function createService(businessId: string, data: { branchId?: string; categoryId?: string; categoryName?: string; name: string; description?: string; purchaseDestinations?: PurchaseDestinationDto[]; serviceMode: "ON_DEMAND" | "SCHEDULED"; basePrice?: number; scheduleText?: string; isActive?: boolean; attributes?: Record<string, unknown> }) {
  return apiRequest<BusinessServiceDto>(`/api/v1/businesses/${businessId}/services`, { method: "POST", auth: true, body: data });
}

export function updateService(businessId: string, serviceOfferingId: string, data: { branchId?: string; categoryId?: string; categoryName?: string; name?: string; description?: string; purchaseDestinations?: PurchaseDestinationDto[]; serviceMode?: "ON_DEMAND" | "SCHEDULED"; basePrice?: number; scheduleText?: string; isActive?: boolean; attributes?: Record<string, unknown> }) {
  return apiRequest<BusinessServiceDto>(`/api/v1/businesses/${businessId}/services/${serviceOfferingId}`, { method: "PATCH", auth: true, body: data });
}

export function syncServiceImages(businessId: string, serviceOfferingId: string, images: import("../lib/catalogImages").CatalogImageDraft[]) {
  return syncCatalogImages<BusinessServiceDto>(`/api/v1/businesses/${businessId}/services/${serviceOfferingId}/images`, images);
}

export function listStaff(businessId: string, branchId: string) {
  return apiRequest<StaffDto[]>(`/api/v1/businesses/${businessId}/branches/${branchId}/staff`, { auth: true });
}

export function createStaff(businessId: string, branchId: string, data: { email: string; displayName: string; role?: string }) {
  return apiRequest<StaffDto>(`/api/v1/businesses/${businessId}/branches/${branchId}/staff`, { method: "POST", auth: true, body: data });
}

export function updateStaff(businessId: string, branchId: string, staffId: string, data: { status?: string }) {
  return apiRequest<StaffDto>(`/api/v1/businesses/${businessId}/branches/${branchId}/staff/${staffId}/update`, { method: "POST", auth: true, body: data });
}

export function resetStaffPassword(businessId: string, branchId: string, staffId: string) {
  return apiRequest<StaffDto>(`/api/v1/businesses/${businessId}/branches/${branchId}/staff/${staffId}/reset-password`, { method: "POST", auth: true });
}

export function createEmployee(businessId: string, data: { email: string; displayName: string; role?: string; branchId?: string }) {
  return apiRequest<StaffDto>(`/api/v1/businesses/${businessId}/staff`, { method: "POST", auth: true, body: data });
}

export function listEmployees(businessId: string) {
  return apiRequest<StaffDto[]>(`/api/v1/businesses/${businessId}/staff`, { auth: true });
}

export function deletePendingEmployee(businessId: string, staffId: string) {
  return apiRequest<void>(`/api/v1/businesses/${businessId}/staff/${staffId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function listCities() {
  return apiRequest<Array<{ id: string; name: string }>>("/api/v1/cities");
}

export function listCategories() {
  return apiRequest<Array<{ id: string; name: string; slug: string; parentId: string | null; children: Array<{ id: string; name: string; slug: string; parentId: string | null }> }>>("/api/v1/categories");
}

export type CategorySuggestion = { label: string; categoryId: string | null; source: "SYSTEM" | "USER" };
export type CategoryType = "BUSINESS" | "ITEM" | "SERVICE";
export type CategoryAutocompleteResponse = { suggestions: CategorySuggestion[] };

export function autocompleteCategories(query: string, type: CategoryType) {
  const qs = new URLSearchParams();
  if (query) qs.set("q", query);
  qs.set("type", type);
  return apiRequest<CategoryAutocompleteResponse>(`/api/v1/categories?${qs.toString()}`);
}

export function createCategory(name: string, type: CategoryType) {
  return apiRequest<{ id: string; name: string; slug: string; type: CategoryType; source: "USER" }>(
    "/api/v1/categories",
    { method: "POST", auth: true, body: { name, type } },
  );
}

export async function uploadProductImport(businessId: string, branchId: string | undefined, file: File, mode: "ITEM" | "SERVICE" = "ITEM") {
  const form = new FormData();
  form.append("file", file);
  form.append("type", mode);
  if (branchId) form.append("branchId", branchId);
  const headers = getAuthHeaders();
  const isAutodumpFile = /\.(txt|md|pdf)$/i.test(file.name);
  const path = isAutodumpFile
    ? `/api/v1/business-admin/branches/${branchId}/autodump-sessions/files`
    : `/api/v1/businesses/${businessId}/item-imports`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text;
    let errorCode: string | null = null;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;
      errorCode = json.error_code || json.errorCode || null;
    } catch {}
    throw new ApiError(response.status, message, errorCode);
  }
  return transformKeys(await response.json()) as ProductImportUploadResponse | { sessionId?: string; status?: string; draftsCreated?: number };
}

export function mapProductImport(businessId: string, importId: string, mappings: ProductImportMappingEntry[]) {
  return apiRequest<ProductImportPreviewResponse>(`/api/v1/businesses/${businessId}/item-imports/${importId}/mapping`, {
    method: "POST",
    auth: true,
    body: { mappings },
  });
}

export function getProductImportPreview(businessId: string, importId: string) {
  return apiRequest<ProductImportPreviewResponse>(`/api/v1/businesses/${businessId}/item-imports/${importId}/preview`, {
    auth: true,
  });
}

export function approveProductImport(businessId: string, importId: string) {
  return apiRequest<ProductImportApproveResponse>(`/api/v1/businesses/${businessId}/item-imports/${importId}/approve`, {
    method: "POST",
    auth: true,
  });
}

export function cancelProductImport(businessId: string, importId: string) {
  return apiRequest<{ importId: string; status: string }>(`/api/v1/businesses/${businessId}/item-imports/${importId}/cancel`, {
    method: "POST",
    auth: true,
  });
}

export function getAutodumpSession(branchId: string, sessionId: string) {
  return apiRequest<AutodumpSessionStatusResponse>(`/api/v1/business-admin/branches/${branchId}/autodump-sessions/${sessionId}`, {
    auth: true,
  });
}

export function approveAutodumpDraft(branchId: string, sessionId: string, draftId: string) {
  return apiRequest<void>(`/api/v1/business-admin/branches/${branchId}/autodump-sessions/${sessionId}/drafts/${draftId}/approve`, {
    method: "POST",
    auth: true,
  });
}

export function rejectAutodumpDraft(branchId: string, sessionId: string, draftId: string) {
  return apiRequest<void>(`/api/v1/business-admin/branches/${branchId}/autodump-sessions/${sessionId}/drafts/${draftId}/reject`, {
    method: "POST",
    auth: true,
  });
}

export function publishAutodumpSession(branchId: string, sessionId: string) {
  return apiRequest<AutodumpPublishResponse>(`/api/v1/business-admin/branches/${branchId}/autodump-sessions/${sessionId}/publish`, {
    method: "POST",
    auth: true,
  });
}

export async function listBranches(businessId: string) {
  const res = await apiRequest<{ branches: BranchDto[] }>(`/api/v1/businesses/${businessId}/branches`, { auth: true });
  return res.branches;
}

export function createBranch(businessId: string, data: CreateBranchData) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/businesses/${businessId}/branches`, { method: "POST", auth: true, body: data });
}

export function updateBranch(branchId: string, data: UpdateBranchData) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/branches/${branchId}`, { method: "PATCH", auth: true, body: data });
}

export function getBusiness(businessId: string) {
  return apiRequest<import("./domainTypes").BusinessDto>(`/api/v1/businesses/${businessId}`, { auth: true });
}

export function getBrandProfile(businessId: string) {
  return apiRequest<BrandProfileDto>(`/api/v1/businesses/${businessId}/business-profile`);
}

export function updateBrandProfile(businessId: string, data: Partial<BrandProfileDto>) {
  return apiRequest<BrandProfileDto>(`/api/v1/businesses/${businessId}/business-profile`, {
    method: "PATCH",
    auth: true,
    body: {
      brandColor: data.brandColor,
      description: data.description,
      number: data.number,
      email: data.email,
      instagramUrl: data.instagramUrl,
      telegramUrl: data.telegramUrl,
      websiteUrl: data.websiteUrl,
      deliveryCoverage: data.deliveryCoverage,
      deliveryCities: data.deliveryCities,
      pickupAvailable: data.pickupAvailable,
    },
  });
}

async function uploadBusinessProfileMedia(businessId: string, kind: "logo" | "cover", file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}/business-profile/${kind}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new ApiError(response.status, message, null);
  }
  return response.json() as Promise<BrandProfileDto>;
}

export function uploadBusinessProfileLogo(businessId: string, file: File) {
  return uploadBusinessProfileMedia(businessId, "logo", file);
}

export function uploadBusinessProfileCover(businessId: string, file: File) {
  return uploadBusinessProfileMedia(businessId, "cover", file);
}

export function listDrops(businessId: string) {
  return apiRequest<BrandDropDto[]>(`/api/v1/businesses/${businessId}/drops`);
}

export function createDrop(businessId: string, data: Partial<BrandDropDto>) {
  return apiRequest<BrandDropDto>(`/api/v1/businesses/${businessId}/drops`, {
    method: "POST",
    auth: true,
    body: data,
  });
}

export function updateDrop(dropId: string, data: Partial<BrandDropDto>) {
  return apiRequest<BrandDropDto>(`/api/v1/drops/${dropId}`, {
    method: "PATCH",
    auth: true,
    body: data,
  });
}

export function cancelDrop(dropId: string) {
  return apiRequest<void>(`/api/v1/drops/${dropId}/cancel`, {
    method: "POST",
    auth: true,
  });
}

export function deleteDrop(dropId: string) {
  return apiRequest<void>(`/api/v1/drops/${dropId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function uploadDropCover(dropId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/v1/drops/${dropId}/cover`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new ApiError(response.status, message, null);
  }
  return transformKeys(await response.json()) as BrandDropDto;
}

export function getBusinessCard(businessId: string) {
  return apiRequest<import("./dto").BusinessCardDto>(`/api/v1/businesses/${businessId}/business-card`, { auth: true });
}

export function getPublicBusinessCard(businessId: string) {
  return apiRequest<import("./dto").BusinessCardDto>(`/api/v1/businesses/${businessId}/business-card`);
}

export function saveBusinessCard(businessId: string, blocks: import("./dto").BusinessCardBlockDto[]) {
  return apiRequest<import("./dto").BusinessCardDto>(`/api/v1/businesses/${businessId}/business-card/draft`, {
    method: "PUT",
    auth: true,
    body: { blocks },
  });
}

export function publishBusinessCard(businessId: string) {
  return apiRequest<import("./dto").BusinessCardDto>(`/api/v1/businesses/${businessId}/business-card/publish`, {
    method: "POST",
    auth: true,
  });
}

export function startChatConversation(businessId: string, subject: string, searchQuery?: string) {
  const qs = new URLSearchParams({ businessId, subject });
  if (searchQuery) qs.set("searchQuery", searchQuery);
  return apiRequest<ChatConversationDto>(`/api/v1/chat/conversations?${qs.toString()}`, { method: "POST", auth: true });
}

export function listChatConversations() {
  return apiRequest<ChatConversationListResponse>("/api/v1/chat/conversations", { auth: true });
}

export function openPlatformSupportConversation(businessId?: string) {
  const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
  return apiRequest<ChatConversationDto>(`/api/v1/chat/support${query}`, { method: "POST", auth: true });
}

export function getChatMessages(conversationId: string) {
  return apiRequest<ChatMessageListResponse>(`/api/v1/chat/conversations/${conversationId}/messages`, { auth: true });
}

export function sendChatMessage(conversationId: string, text: string, attachmentUrl?: string) {
  return apiRequest<ChatMessageDto>(`/api/v1/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    auth: true,
    body: { text, attachmentUrl },
  });
}

export async function uploadChatFile(conversationId: string, file: File) {
  const form = new FormData();
  form.append("conversationId", conversationId);
  form.append("file", file);
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/upload`, {
    method: "POST",
    headers,
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;
    } catch {}
    throw new ApiError(response.status, message, null);
  }
  const data = await response.json();
  return (data as { url: string }).url;
}

export function markChatRead(conversationId: string) {
  return apiRequest<void>(`/api/v1/chat/conversations/${conversationId}/read`, { method: "POST", auth: true });
}

export function listBusinessChats(businessId: string) {
  return apiRequest<ChatConversationListResponse>(`/api/v1/business-admin/chats?businessId=${encodeURIComponent(businessId)}`, { auth: true });
}

export function getBusinessChatMessages(conversationId: string, businessId: string) {
  return apiRequest<ChatMessageListResponse>(`/api/v1/business-admin/chats/${conversationId}/messages?businessId=${encodeURIComponent(businessId)}`, { auth: true });
}

export function sendBusinessChatMessage(conversationId: string, businessId: string, text: string, attachmentUrl?: string) {
  return apiRequest<ChatMessageDto>(`/api/v1/business-admin/chats/${conversationId}/messages?businessId=${encodeURIComponent(businessId)}`, {
    method: "POST",
    auth: true,
    body: { text, attachmentUrl },
  });
}

export function markBusinessChatRead(conversationId: string, businessId: string) {
  return apiRequest<void>(`/api/v1/business-admin/chats/${conversationId}/read?businessId=${encodeURIComponent(businessId)}`, { method: "POST", auth: true });
}
