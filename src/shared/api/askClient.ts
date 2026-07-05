import { API_BASE_URL, apiRequest, getStoredToken, transformKeys, ApiError } from "./httpClient";
import { mapSearchResult, mapSupplierTask } from "./mappers";
import type {
  BusinessProductDto, BusinessProductListDto,
  BusinessServiceDto, BusinessServiceListDto,
  BrandDropDto,
  BrandProfileDto,
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
      language: "ru",
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
  return apiRequest<SearchV2ResponseDto>("/api/v1/search/v2", {
    method: "POST",
    body: {
      rawQuery: params.rawQuery,
      scope: params.scope,
      selectedCategory: params.selectedCategory || "",
      city: params.city || "Астана",
      sort: params.sort || "intent_match",
      userLocation: getStoredUserLocation(),
      language: "ru",
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

export function createProduct(branchId: string, data: { categoryId: string; name: string; description?: string; sku?: string; price?: number; enabled?: boolean; tags?: string[] }) {
  return apiRequest<BusinessProductDto>(`/api/v1/business-admin/branches/${branchId}/products`, { method: "POST", auth: true, body: data });
}

export function updateProduct(branchId: string, productId: string, data: { categoryId?: string; name?: string; description?: string; sku?: string; price?: number; enabled?: boolean; tags?: string[] }) {
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

export function createService(branchId: string, data: { categoryId: string; name: string; description?: string; basePrice?: number; durationMinutes?: number; scheduleText?: string; active?: boolean }) {
  return apiRequest<BusinessServiceDto>(`/api/v1/business-admin/branches/${branchId}/services`, { method: "POST", auth: true, body: data });
}

export function updateService(branchId: string, serviceOfferingId: string, data: { categoryId?: string; name?: string; description?: string; basePrice?: number; durationMinutes?: number; scheduleText?: string; active?: boolean }) {
  return apiRequest<BusinessServiceDto>(`/api/v1/business-admin/branches/${branchId}/services/${serviceOfferingId}`, { method: "PATCH", auth: true, body: data });
}

export function listStaff(businessId: string, branchId: string) {
  return apiRequest<StaffDto[]>(`/api/v1/businesses/${businessId}/branches/${branchId}/staff`, { auth: true });
}

export function createStaff(businessId: string, branchId: string, data: { email: string; displayName: string }) {
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

export async function uploadProductImport(branchId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
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
  return transformKeys(await response.json()) as { importId?: string; catalogImportId?: string; sessionId?: string; status?: string; totalRows?: number; draftsCreated?: number };
}

export function listBranches(businessId: string) {
  return apiRequest<Array<{ id: string; businessId: string; cityId: string; cityName: string; name: string; address: string; onlineOnly: boolean; status: string }>>(`/api/v1/businesses/${businessId}/branches`, { auth: true });
}

export function createBranch(businessId: string, data: { name: string; address?: string; cityId?: string; onlineOnly?: boolean }) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/businesses/${businessId}/branches`, { method: "POST", auth: true, body: data });
}

export function updateBranch(businessId: string, branchId: string, data: { name?: string; address?: string; cityId?: string; onlineOnly?: boolean }) {
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
