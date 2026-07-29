import { apiRequest } from "./httpClient";
import type {
  ChatConversationDto,
  ChatConversationListResponse,
  ChatMessageDto,
  ChatMessageListResponse,
  BusinessProductListDto,
  BusinessServiceListDto,
} from "./dto";
import type { PlatformEventCounts } from "../../widgets/PlatformShell/platformTypes";

export function requestAiEnrichment(targetType: "PRODUCT" | "SERVICE" | "UNIQUE_OFFER", aggregateIds: string[]) {
  return apiRequest<{ enrichedCount: number }>("/api/v1/platform/ai-enrichment", {
    method: "POST",
    auth: true,
    body: { targetType, aggregateIds },
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
  targetType: "PRODUCT" | "SERVICE" | "UNIQUE_OFFER" | "BUSINESS" | "MESSAGE" | "USER";
  targetId: string;
  reasonCode: string;
  details?: string;
  severity?: "REVIEW" | "CRITICAL";
  status: "BEING_DISCUSSED" | "VALID" | "BANNED";
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

export function deletePlatformUser(membershipId: string) {
  return apiRequest<void>(`/api/v1/platform/users/${membershipId}`, {
    method: "DELETE",
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
  status: "VALID" | "BANNED",
  resolution: string,
) {
  const params = new URLSearchParams({ status });
  return apiRequest<ContentReportItem>(`/api/v1/platform/reports/${reportId}?${params}`, {
    method: "PATCH",
    auth: true,
    body: resolution,
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

export type PlatformCatalogType = "items" | "services" | "drops";

export type PlatformCatalogEntry = {
  id: string;
  type: "ITEM" | "SERVICE" | "DROP";
  name: string;
  businessId: string;
  businessName: string;
  categoryLabel?: string | null;
  price?: number | null;
  status: string;
  isActive: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

export type PlatformCatalogPage = {
  items: PlatformCatalogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function listPlatformCatalog(type: PlatformCatalogType, page = 0, size = 50) {
  return apiRequest<PlatformCatalogPage>(
    `/api/v1/platform/catalog/${type}?page=${page}&size=${size}`,
    { auth: true },
  );
}

export async function getPlatformEventCounts(): Promise<PlatformEventCounts> {
  const [reports, moderationQueue] = await Promise.all([
    listOpenReports(),
    listModerationQueue(0, 100),
  ]);
  const counts: PlatformEventCounts = {
    summary: { review: 0, critical: 0 },
    businesses: { review: moderationQueue.totalElements, critical: 0 },
    chats: { review: 0, critical: 0 },
    accounts: { review: 0, critical: 0 },
    team: { review: 0, critical: 0 },
  };

  for (const report of reports) {
    const section = report.targetType === "MESSAGE"
      ? "chats"
      : report.targetType === "USER"
        ? "accounts"
        : "businesses";
    const level = report.severity === "CRITICAL" ? "critical" : "review";
    counts[section][level] += 1;
    counts.summary[level] += 1;
  }

  counts.summary.review += moderationQueue.totalElements;
  return counts;
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
};

export type PlatformBusinessDetailResponse = {
  businessId: string;
  name: string;
  legalName: string;
  bin: string;
  countryCode: string;
  catalogStatus: string;
  businessScope: "ITEM" | "SERVICE" | "BOTH";
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

export function listPlatformBusinessItems(businessId: string, page = 0, size = 50) {
  return apiRequest<BusinessProductListDto>(
    `/api/v1/platform/businesses/${businessId}/products?page=${page}&size=${size}`,
    { auth: true },
  );
}

export function listPlatformBusinessServices(businessId: string, page = 0, size = 50) {
  return apiRequest<BusinessServiceListDto>(
    `/api/v1/platform/businesses/${businessId}/services?page=${page}&size=${size}`,
    { auth: true },
  );
}

export type PlatformModerationTarget = "PRODUCT" | "SERVICE" | "UNIQUE_OFFER" | "BUSINESS" | "USER" | "MESSAGE";
export type PlatformModerationAction = "BLOCK" | "UNBLOCK" | "FLAG" | "APPROVE" | "REJECT";

export function applyPlatformModerationAction(data: {
  targetType: PlatformModerationTarget;
  targetId: string;
  action: PlatformModerationAction;
  reasonCode?: string;
  note?: string;
  expiresAt?: string;
}) {
  return apiRequest<void>("/api/v1/platform/moderation-actions", {
    method: "POST",
    auth: true,
    body: data,
  });
}

export type PlatformAccountItem = {
  userId: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  businessNames: string[];
  createdAt: string;
};

export type PlatformAccountListResponse = {
  items: PlatformAccountItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function listPlatformAccounts(page = 0, size = 30, query?: string, status?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (query) params.set("query", query);
  if (status) params.set("status", status);
  return apiRequest<PlatformAccountListResponse>(`/api/v1/platform/accounts?${params}`, { auth: true });
}

export function deletePlatformAccount(userId: string, reason: string) {
  return apiRequest<void>(`/api/v1/platform/accounts/${userId}`, {
    method: "DELETE",
    auth: true,
    body: { reason },
  });
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

export type VerificationStatus = "PENDING" | "NEEDS_INFO" | "APPROVED" | "REJECTED";
export type VerificationPriority = "STANDARD" | "EXPEDITED";

export type VerificationListResponse = {
  businessId: string;
  businessName: string;
  status: VerificationStatus;
  priority: VerificationPriority;
  createdAt: string;
  updatedAt: string;
};

export type VerificationHistoryItem = {
  fromStatus: VerificationStatus | null;
  toStatus: VerificationStatus;
  toPriority: VerificationPriority | null;
  changedBy: string;
  comment: string;
  createdAt: string;
};

export type VerificationDetailResponse = {
  businessId: string;
  businessName: string;
  status: VerificationStatus;
  priority: VerificationPriority;
  binIin: string;
  twoGisUrl: string;
  kaspiUrl: string;
  ozonUrl: string;
  wildberriesUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  telegramUrl: string;
  phone: string;
  corporateEmail: string;
  createdAt: string;
  updatedAt: string;
  history: VerificationHistoryItem[];
};

export function listPendingVerifications(priority?: VerificationPriority) {
  const qs = priority ? `?priority=${encodeURIComponent(priority)}` : "";
  return apiRequest<VerificationListResponse[]>(`/api/v1/platform/verifications${qs}`, { auth: true });
}

export function getVerificationDetail(businessId: string) {
  return apiRequest<VerificationDetailResponse>(`/api/v1/platform/verifications/${businessId}`, { auth: true });
}

export function reviewVerification(
  businessId: string,
  data: { status: VerificationStatus; comment: string },
) {
  return apiRequest<VerificationDetailResponse>(`/api/v1/platform/verifications/${businessId}/review`, {
    method: "POST",
    auth: true,
    body: data,
  });
}
