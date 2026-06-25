import { apiRequest } from "./httpClient";
import { mapSearchResult, mapSupplierTask } from "./mappers";
import type {
  BusinessProductDto, BusinessProductListDto,
  BusinessServiceDto, BusinessServiceListDto,
  CustomerRequestDetailDto, CustomerRequestHistoryDto,
  SearchResultDto, StaffDto, SupplierTaskDetailDto, SupplierTaskDto
} from "./dto";

export async function searchAsk(query: string, scope: "all" | "product" | "service") {
  const params = new URLSearchParams({ q: query, scope });
  const dtos = await apiRequest<SearchResultDto[]>(`/api/v1/search?${params.toString()}`);
  return dtos.map(mapSearchResult);
}

export async function createFallbackRequest(query: string, scope: "product" | "service", city: string) {
  const response = await apiRequest<{
    id: string;
    query: string;
    scope: string;
    city: string;
    status: string;
    matched_suppliers: number;
  }>("/api/v1/customer-requests", {
    method: "POST",
    auth: true,
    body: { query_text: query, scope, city_name: city },
  });

  return {
    id: response.id,
    query: response.query,
    scope,
    city: response.city,
    status: response.status as "draft" | "dispatching" | "waiting" | "answered",
    matchedSuppliers: response.matched_suppliers,
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

export function updateStaff(businessId: string, branchId: string, staffId: string, data: { email?: string; displayName?: string }) {
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

export function listBranches(businessId: string) {
  return apiRequest<Array<{ id: string; businessId: string; cityId: string; cityName: string; name: string; address: string; onlineOnly: boolean; status: string }>>(`/api/v1/businesses/${businessId}/branches`, { auth: true });
}

export function createBranch(businessId: string, data: { name: string; address?: string; cityId?: string; onlineOnly?: boolean }) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/businesses/${businessId}/branches`, { method: "POST", auth: true, body: data });
}

export function updateBranch(businessId: string, branchId: string, data: { name?: string; address?: string; cityId?: string; onlineOnly?: boolean }) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/businesses/${businessId}/branches/${branchId}`, { method: "PATCH", auth: true, body: data });
}
