import { API_BASE_URL, apiRequest, getStoredToken, transformKeys, ApiError } from "./httpClient";
import i18n from "../i18n/i18n";
import { mapSearchResult, mapSupplierTask } from "./mappers";
import type {
  BusinessProductDto, BusinessProductListDto,
  BusinessServiceDto, BusinessServiceListDto,
  BrandDropDto,
  BrandProfileDto,
  ChatConversationDto, ChatConversationListResponse,
  ChatMessageDto, ChatMessageListResponse,
  ContactResolveDto,
  CustomerRequestDetailDto, CustomerRequestHistoryDto,
  SearchResultDto,
  SearchV2ResponseDto,
  StaffDto,
  StorefrontPageDto,
  StructuredSearchDto,
  SupplierTaskDetailDto,
  SupplierTaskDto
} from "./dto";

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
    if (!raw) return { lat: null, lng: null };
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    return {
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
    };
  } catch {
    return { lat: null, lng: null };
  }
}

export async function searchAsk(query: string, scope: "all" | "product" | "service", city?: string, category?: string) {
  const response = await apiRequest<StructuredSearchDto>("/api/v1/search", {
    method: "POST",
    body: {
      rawQuery: query,
      selectedMode: scope === "all" ? "AUTO" : scope.toUpperCase(),
      selectedCategory: category || "",
      city: city || "Астана",
      userLocation: getStoredUserLocation(),
      language: i18n.language || "ru",
      sort: "intent_match",
    },
  });
  return response.results.map(mapSearchResult);
}

export function searchAskV2(params: {
  rawQuery: string;
  scope: "all" | "product" | "service";
  city?: string;
  selectedCategory?: string;
  sort?: "intent_match" | "price_asc" | "price_desc" | "distance" | "active_events";
}) {
  return apiRequest<SearchV2ResponseDto>("/api/v1/search", {
    method: "POST",
    body: {
      rawQuery: params.rawQuery,
      scope: params.scope,
      selectedCategory: params.selectedCategory || "",
      city: params.city || "Астана",
      sort: params.sort || "intent_match",
      userLocation: getStoredUserLocation(),
      language: i18n.language || "ru",
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

export function listProducts(branchId: string, params?: { categoryId?: string; enabled?: boolean; query?: string; page?: number; size?: number }) {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.enabled !== undefined) qs.set("enabled", String(params.enabled));
  if (params?.query) qs.set("query", params.query);
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.size !== undefined) qs.set("size", String(params.size));
  const q = qs.toString();
  return apiRequest<BusinessProductListDto>(`/api/v1/business-admin/branches/${branchId}/products${q ? "?" + q : ""}`, { auth: true });
}

export function createProduct(branchId: string, data: { categoryId: string; name: string; description?: string; sku?: string; price?: number; enabled?: boolean; tags?: string[]; imageUrl?: string }) {
  return apiRequest<BusinessProductDto>(`/api/v1/business-admin/branches/${branchId}/products`, { method: "POST", auth: true, body: data });
}

export function updateProduct(branchId: string, productId: string, data: { categoryId?: string; name?: string; description?: string; sku?: string; price?: number; enabled?: boolean; tags?: string[]; imageUrl?: string }) {
  return apiRequest<BusinessProductDto>(`/api/v1/business-admin/branches/${branchId}/products/${productId}`, { method: "PATCH", auth: true, body: data });
}

export function deleteProduct(branchId: string, productId: string) {
  return apiRequest<BusinessProductDto>(`/api/v1/business-admin/branches/${branchId}/products/${productId}`, { method: "DELETE", auth: true });
}

export function listServices(branchId: string, params?: { categoryId?: string; active?: boolean; query?: string; page?: number; size?: number }) {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.active !== undefined) qs.set("active", String(params.active));
  if (params?.query) qs.set("query", params.query);
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.size !== undefined) qs.set("size", String(params.size));
  const q = qs.toString();
  return apiRequest<BusinessServiceListDto>(`/api/v1/business-admin/branches/${branchId}/services${q ? "?" + q : ""}`, { auth: true });
}

export function createService(branchId: string, data: { categoryId: string; name: string; description?: string; basePrice?: number; scheduleText?: string; active?: boolean; imageUrl?: string }) {
  return apiRequest<BusinessServiceDto>(`/api/v1/business-admin/branches/${branchId}/services`, { method: "POST", auth: true, body: data });
}

export function updateService(branchId: string, serviceOfferingId: string, data: { categoryId?: string; name?: string; description?: string; basePrice?: number; scheduleText?: string; active?: boolean; imageUrl?: string }) {
  return apiRequest<BusinessServiceDto>(`/api/v1/business-admin/branches/${branchId}/services/${serviceOfferingId}`, { method: "PATCH", auth: true, body: data });
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

export function listCities() {
  return apiRequest<Array<{ id: string; name: string }>>("/api/v1/cities");
}

export function listCategories() {
  return apiRequest<Array<{ id: string; name: string; slug: string; parentId: string | null; children: Array<{ id: string; name: string; slug: string; parentId: string | null }> }>>("/api/v1/categories");
}

export async function uploadProductImport(branchId: string, file: File, mode: "PRODUCT" | "SERVICE" = "PRODUCT") {
  const form = new FormData();
  form.append("file", file);
  form.append("type", mode);
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isAutodumpFile = /\.(txt|md|pdf)$/i.test(file.name);
  const path = isAutodumpFile
    ? `/api/v1/business-admin/branches/${branchId}/autodump-sessions/files`
    : `/api/v1/business-admin/branches/${branchId}/product-imports`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
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

export function mapProductImport(branchId: string, importId: string, mappings: ProductImportMappingEntry[]) {
  return apiRequest<ProductImportPreviewResponse>(`/api/v1/business-admin/branches/${branchId}/product-imports/${importId}/mapping`, {
    method: "POST",
    auth: true,
    body: { mappings },
  });
}

export function getProductImportPreview(branchId: string, importId: string) {
  return apiRequest<ProductImportPreviewResponse>(`/api/v1/business-admin/branches/${branchId}/product-imports/${importId}/preview`, {
    auth: true,
  });
}

export function approveProductImport(branchId: string, importId: string) {
  return apiRequest<ProductImportApproveResponse>(`/api/v1/business-admin/branches/${branchId}/product-imports/${importId}/approve`, {
    method: "POST",
    auth: true,
  });
}

export function cancelProductImport(branchId: string, importId: string) {
  return apiRequest<{ importId: string; status: string }>(`/api/v1/business-admin/branches/${branchId}/product-imports/${importId}/cancel`, {
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

export function listBranches(businessId: string) {
  return apiRequest<Array<{ id: string; businessId: string; cityId: string; cityName: string; name: string; address: string; onlineOnly: boolean; status: string; latitude: number; longitude: number }>>(`/api/v1/businesses/${businessId}/branches`, { auth: true });
}

export function createBranch(businessId: string, data: { name: string; address?: string; cityId?: string; onlineOnly?: boolean; latitude: number; longitude: number }) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/businesses/${businessId}/branches`, { method: "POST", auth: true, body: data });
}

export function updateBranch(businessId: string, branchId: string, data: { name?: string; address?: string; cityId?: string; onlineOnly?: boolean; latitude?: number; longitude?: number }) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/businesses/${businessId}/branches/${branchId}`, { method: "PATCH", auth: true, body: data });
}

export function getBrandProfile(businessId: string) {
  return apiRequest<BrandProfileDto>(`/api/v1/businesses/${businessId}/brand-profile`);
}

export function updateBrandProfile(businessId: string, data: Partial<BrandProfileDto>) {
  return apiRequest<BrandProfileDto>(`/api/v1/businesses/${businessId}/brand-profile`, {
    method: "PUT",
    auth: true,
    body: data,
  });
}

export function getStorefront(businessId: string) {
  return apiRequest<StorefrontPageDto>(`/api/v1/businesses/${businessId}/storefront`);
}

export function getStorefrontDraft(businessId: string) {
  return apiRequest<StorefrontPageDto>(`/api/v1/businesses/${businessId}/storefront/draft`, { auth: true });
}

export function saveStorefrontDraft(businessId: string, blocks: StorefrontPageDto["blocks"]) {
  return apiRequest<StorefrontPageDto>(`/api/v1/businesses/${businessId}/storefront/draft`, {
    method: "PUT",
    auth: true,
    body: { blocks },
  });
}

export function publishStorefront(businessId: string) {
  return apiRequest<StorefrontPageDto>(`/api/v1/businesses/${businessId}/storefront/publish`, {
    method: "POST",
    auth: true,
  });
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

export function updateDrop(businessId: string, dropId: string, data: Partial<BrandDropDto>) {
  return apiRequest<BrandDropDto>(`/api/v1/businesses/${businessId}/drops/${dropId}`, {
    method: "PATCH",
    auth: true,
    body: data,
  });
}

export function cancelDrop(businessId: string, dropId: string) {
  return apiRequest<BrandDropDto>(`/api/v1/businesses/${businessId}/drops/${dropId}/cancel`, {
    method: "POST",
    auth: true,
  });
}

export function deleteDrop(businessId: string, dropId: string) {
  return apiRequest<void>(`/api/v1/businesses/${businessId}/drops/${dropId}`, {
    method: "DELETE",
    auth: true,
  });
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

export async function uploadChatFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/upload`, {
    method: "POST",
    headers,
    body: form,
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

export function sendBusinessChatMessage(conversationId: string, businessId: string, text: string) {
  return apiRequest<ChatMessageDto>(`/api/v1/business-admin/chats/${conversationId}/messages?businessId=${encodeURIComponent(businessId)}`, {
    method: "POST",
    auth: true,
    body: { text },
  });
}

export function markBusinessChatRead(conversationId: string, businessId: string) {
  return apiRequest<void>(`/api/v1/business-admin/chats/${conversationId}/read?businessId=${encodeURIComponent(businessId)}`, { method: "POST", auth: true });
}

export function updateChatStatus(conversationId: string, businessId: string, status: string) {
  return apiRequest<void>(`/api/v1/business-admin/chats/${conversationId}/status?businessId=${encodeURIComponent(businessId)}&status=${encodeURIComponent(status)}`, { method: "PATCH", auth: true });
}

export function notifyBusinesses(searchQuery: string, businessIds: string[]) {
  return apiRequest<void>("/api/v1/chat/system-notify", {
    method: "POST",
    auth: true,
    body: { searchQuery, businessIds },
  });
}
