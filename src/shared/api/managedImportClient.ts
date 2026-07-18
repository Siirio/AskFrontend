import { apiRequest } from "./httpClient";

export type ManagedImportItem = {
  id: string;
  businessId: string;
  businessName: string;
  requestedByUserId: string;
  requestedByName: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  sourceTypes: string[];
  preferredContactChannel: string;
  preferredContactValue: string;
  sourceLinks?: string;
  sourceNotes?: string;
  conversationId?: string;
  responsiblePlatformUserId?: string;
  createdAt: string;
  activatedAt?: string;
  completedAt?: string;
};

export function listPlatformManagedImports() {
  return apiRequest<ManagedImportItem[]>("/api/v1/platform/managed-imports", { auth: true });
}

export function activateManagedImport(requestId: string) {
  return apiRequest<ManagedImportItem>(`/api/v1/platform/managed-imports/${requestId}/activate`, {
    method: "POST",
    auth: true,
  });
}

export function completeManagedImport(requestId: string, productsPublishedCount = 0) {
  return apiRequest<ManagedImportItem>(`/api/v1/platform/managed-imports/${requestId}/complete`, {
    method: "POST",
    auth: true,
    body: { productsPublishedCount },
  });
}

export function getManagedImportCatalogAccess(businessId: string) {
  return apiRequest<{ allowed: boolean }>(
    `/api/v1/platform/managed-imports/businesses/${businessId}/catalog-access`,
    { auth: true },
  );
}
