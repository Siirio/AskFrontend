import { apiRequest } from "./httpClient";

export type SellerOnboardingData = {
  businessName: string;
  countryCode: "KZ";
  legalForm: "KZ_IP" | "KZ_TOO" | "NONE";
  legalIdentifier: string;
  legalName: string;
  preferredContactChannel: "WHATSAPP" | "TELEGRAM" | "EMAIL";
  preferredContactValue: string;
  pickupAvailable: boolean;
  deliveryScope: "NO_DELIVERY" | "SELECTED_CITIES" | "KAZAKHSTAN" | "WORLDWIDE" | "CONTACT_SELLER";
  selectedCityIds: string[];
  deliveryTermsRu: string;
  deliveryTermsKk: string;
  deliveryTermsEn: string;
  catalogSetupMode: "MANUAL" | "ASK_MANAGED_IMPORT";
  catalogScope: "PRODUCTS" | "SERVICES" | "BOTH";
  catalogSources: string[];
  sourceLinks: string;
  sourceNotes: string;
  locale: string;
  legalAccepted: boolean;
};

export type SellerOnboardingResult = {
  businessId: string;
  catalogSetupMode: "MANUAL" | "ASK_MANAGED_IMPORT";
  catalogDeadlineAt: string;
  conversationId?: string;
  startRoute: "BUSINESS_CABINET" | "MANAGED_IMPORT";
};

export function completeSellerOnboarding(data: SellerOnboardingData) {
  return apiRequest<SellerOnboardingResult>("/api/v1/seller/onboarding", {
    method: "POST",
    auth: true,
    body: data,
  });
}

export type BusinessCatalogStatus = {
  businessId: string;
  status: "IN_PROGRESS" | "REVIEW_REQUIRED" | "COMPLETED" | "RESTRICTED";
  deadlineAt: string;
};

export function getBusinessCatalogStatus(businessId: string) {
  return apiRequest<BusinessCatalogStatus>(
    `/api/v1/businesses/${businessId}/catalog-setup`,
    { auth: true },
  );
}
