import { apiRequest } from "./httpClient";
import type {
  ChatConversationDto,
  ChatConversationListResponse,
  ChatMessageDto,
  ChatMessageListResponse,
} from "./dto";

export function requestAiEnrichment(documentType: "PRODUCT" | "SERVICE", aggregateIds: string[]) {
  return apiRequest<{ queuedCount: number }>("/api/v1/platform/ai-enrichment", {
    method: "POST",
    auth: true,
    body: { documentType, aggregateIds },
  });
}

export type PlatformMembershipItem = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MODERATOR";
  status: string;
  permissions: string[];
};

export type ContentReportItem = {
  id: string;
  targetType: "PRODUCT" | "BUSINESS" | "MESSAGE" | "USER";
  targetId: string;
  reasonCode: string;
  details?: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  reporterUserId: string;
  reporterName?: string;
  createdAt: string;
};

export type CatalogReviewItem = {
  businessId: string;
  businessName: string;
  catalogStatus: "REVIEW_REQUIRED";
};

export function listPlatformConversations() {
  return apiRequest<ChatConversationListResponse>("/api/v1/platform/chat/conversations", { auth: true });
}

export function getPlatformChatMessages(conversationId: string) {
  return apiRequest<ChatMessageListResponse>(`/api/v1/platform/chat/conversations/${conversationId}/messages`, { auth: true });
}

export function sendPlatformChatMessage(conversationId: string, text: string, attachmentUrl?: string) {
  return apiRequest<ChatMessageDto>(`/api/v1/platform/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    auth: true,
    body: { text, attachmentUrl },
  });
}

export function markPlatformChatRead(conversationId: string) {
  return apiRequest<void>(`/api/v1/platform/chat/conversations/${conversationId}/read`, { method: "POST", auth: true });
}

export function closePlatformConversation(conversationId: string) {
  return apiRequest<ChatConversationDto>(`/api/v1/platform/chat/conversations/${conversationId}/close`, { method: "POST", auth: true });
}

export function listPlatformUsers() {
  return apiRequest<PlatformMembershipItem[]>("/api/v1/platform/users", { auth: true });
}

export function createPlatformUser(data: { email: string; role: string; permissions: string[] }) {
  return apiRequest<PlatformMembershipItem>("/api/v1/platform/users", {
    method: "POST",
    auth: true,
    body: data,
  });
}

export function updatePlatformUser(membershipId: string, data: { role?: string; permissions?: string[] }) {
  return apiRequest<PlatformMembershipItem>(`/api/v1/platform/users/${membershipId}`, {
    method: "PATCH",
    auth: true,
    body: data,
  });
}

export function deactivatePlatformUser(membershipId: string) {
  return apiRequest<PlatformMembershipItem>(`/api/v1/platform/users/${membershipId}/deactivate`, {
    method: "POST",
    auth: true,
  });
}

export function listOpenReports() {
  return apiRequest<ContentReportItem[]>("/api/v1/platform/reports", { auth: true });
}

export function listCatalogReviews() {
  return apiRequest<CatalogReviewItem[]>("/api/v1/platform/catalog-reviews", { auth: true });
}

export function reviewCatalog(businessId: string, approved: boolean) {
  return apiRequest<void>(`/api/v1/platform/catalog-reviews/${businessId}`, {
    method: "PATCH",
    auth: true,
    body: { approved },
  });
}

export function resolveReport(
  reportId: string,
  status: "RESOLVED" | "REJECTED",
  resolution: string,
) {
  return apiRequest<ContentReportItem>(`/api/v1/platform/reports/${reportId}`, {
    method: "PATCH",
    auth: true,
    body: {
      status,
      resolution,
    },
  });
}

export function moderateBusiness(businessId: string, status: "ACTIVE" | "SUSPENDED" | "BANNED") {
  return apiRequest<void>(`/api/v1/platform/businesses/${businessId}/moderation`, {
    method: "PATCH",
    auth: true,
    body: { status },
  });
}

export function moderateProduct(productId: string, hidden: boolean) {
  return apiRequest<void>(`/api/v1/platform/products/${productId}/moderation`, {
    method: "PATCH",
    auth: true,
    body: { hidden },
  });
}

export type CustomerRequestItem = {
  id: string;
  query: string;
  scope: string;
  city: string;
  status: string;
  matchedSuppliers: number;
  replyCount: number;
  createdAt: string;
};

export function listAllCustomerRequests() {
  return apiRequest<CustomerRequestItem[]>("/api/v1/platform/customer-requests", { auth: true });
}

export type PlatformDashboardResponse = {
  totalBusinesses: number;
  totalActiveProducts: number;
  totalActiveServices: number;
  totalActiveDrops: number;
  openSupportConversations: number;
  pendingModerationItems: number;
  totalUsers: number;
};

export function getPlatformDashboard() {
  return apiRequest<PlatformDashboardResponse>("/api/v1/platform/dashboard", { auth: true });
}

export type PlatformBusinessRowResponse = {
  businessId: string;
  name: string;
  legalName: string;
  contactEmail: string;
  branchCount: number;
  memberCount: number;
  productCount: number;
  serviceCount: number;
  dropCount: number;
  moderationStatus: string;
  catalogStatus: string;
};

export type PlatformBusinessListResponse = {
  items: PlatformBusinessRowResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function listPlatformBusinesses(page = 0, size = 20, query?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (query) params.set("query", query);
  return apiRequest<PlatformBusinessListResponse>(`/api/v1/platform/businesses?${params}`, { auth: true });
}

export type PlatformBusinessBranchDto = {
  branchId: string;
  name: string;
  address: string;
  onlineOnly: boolean;
};

export type PlatformBusinessDetailResponse = {
  businessId: string;
  name: string;
  legalName: string;
  bin: string;
  countryCode: string;
  preferredContactChannel: string;
  preferredContactValue: string;
  moderationStatus: string;
  catalogStatus: string;
  catalogScope: string;
  branchCount: number;
  memberCount: number;
  productCount: number;
  serviceCount: number;
  dropCount: number;
  branches: PlatformBusinessBranchDto[];
};

export function getPlatformBusinessDetail(businessId: string) {
  return apiRequest<PlatformBusinessDetailResponse>(`/api/v1/platform/businesses/${businessId}`, { auth: true });
}

export function createPlatformBusinessProduct(businessId: string, data: {
  name: string;
  categoryLabel?: string;
  description?: string;
  sku?: string;
  tags?: string[];
  characteristics?: Record<string, string>;
}) {
  return apiRequest(`/api/v1/platform/businesses/${businessId}/products`, {
    method: "POST",
    auth: true,
    body: data,
  });
}

export function deletePlatformProduct(productId: string) {
  return apiRequest<void>(`/api/v1/platform/products/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function listPlatformSupportConversations() {
  return apiRequest<ChatConversationListResponse>("/api/v1/platform/support/conversations", { auth: true });
}

export function getPlatformSupportMessages(conversationId: string) {
  return apiRequest<ChatMessageListResponse>(`/api/v1/platform/support/conversations/${conversationId}/messages`, { auth: true });
}

export function sendPlatformSupportMessage(conversationId: string, text: string, attachmentUrl?: string) {
  return apiRequest<ChatMessageDto>(`/api/v1/platform/support/conversations/${conversationId}/messages`, {
    method: "POST",
    auth: true,
    body: { text, attachmentUrl },
  });
}

export function closePlatformSupportConversation(conversationId: string) {
  return apiRequest<ChatConversationDto>(`/api/v1/platform/support/conversations/${conversationId}/close`, { method: "POST", auth: true });
}

export type ProductModerationItem = {
  productId: string;
  productName: string;
  businessId: string;
  businessName: string;
  imageUrl: string;
  createdAt: string;
  moderationNote: string;
  moderationStatus: string;
};

export type ModerationQueuePage = {
  content: ProductModerationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export function listModerationQueue(page = 0, size = 20) {
  return apiRequest<ModerationQueuePage>(`/api/v1/platform/moderation/queue?page=${page}&size=${size}`, { auth: true });
}

export function approveModerationItem(productId: string) {
  return apiRequest<void>(`/api/v1/platform/moderation/queue/${productId}/approve`, { method: "POST", auth: true });
}

export function rejectModerationItem(productId: string, reason: string) {
  return apiRequest<void>(`/api/v1/platform/moderation/queue/${productId}/reject`, {
    method: "POST",
    auth: true,
    body: { reason },
  });
}
