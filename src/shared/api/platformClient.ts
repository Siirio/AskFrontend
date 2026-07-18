import { apiRequest } from "./httpClient";
import type {
  ChatConversationDto,
  ChatConversationListResponse,
  ChatMessageDto,
  ChatMessageListResponse,
} from "./dto";

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

export function resolveReport(reportId: string, status: "RESOLVED" | "REJECTED") {
  return apiRequest<ContentReportItem>(`/api/v1/platform/reports/${reportId}?status=${status}`, {
    method: "PATCH",
    auth: true,
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
