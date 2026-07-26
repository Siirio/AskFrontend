import { apiRequest } from "./httpClient";
import type { BusinessScope, ContactChannel } from "../utils/validation";

export type ManagedImportItem = {
  id: string;
  businessId: string;
  businessName: string;
  requestedByUserId: string;
  requestedByName: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  businessScope: BusinessScope;
  selectedSourceTypes: string[];
  preferredContactChannel: ContactChannel;
  preferredContactValue: string;
  sourceLinks?: string;
  sourceNotes?: string;
  conversationId?: string;
  responsiblePlatformUserId?: string;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  completedAt?: string;
};

export function listPlatformManagedImports() {
  return apiRequest<ManagedImportItem[]>("/api/v1/platform/managed-imports", { auth: true });
}

export function requestManagedImportHelp(
  businessId: string,
  request: {
    businessScope: BusinessScope;
    selectedSourceTypes: string[];
    preferredContactChannel: ContactChannel;
    preferredContactValue: string;
    sourceLinks: string;
    sourceNotes?: string;
  },
) {
  return apiRequest<ManagedImportItem>(`/api/v1/businesses/${businessId}/managed-imports`, {
    method: "POST",
    auth: true,
    body: request,
  });
}

export function listBusinessManagedImports(businessId: string) {
  return apiRequest<ManagedImportItem[]>(
    `/api/v1/businesses/${businessId}/managed-imports`,
    { auth: true },
  );
}

export function activateManagedImport(requestId: string) {
  return apiRequest<ManagedImportItem>(`/api/v1/platform/managed-imports/${requestId}/activate`, {
    method: "POST",
    auth: true,
  });
}

export function getManagedImportCatalogAccess(businessId: string) {
  return apiRequest<{ allowed: boolean; businessScope: BusinessScope }>(
    `/api/v1/platform/managed-imports/businesses/${businessId}/items-services-access`,
    { auth: true },
  );
}
