import { apiRequest } from "./httpClient";
import type { BusinessScope } from "../utils/validation";

export type SellerOnboardingData = {
  businessName: string;
  categoryId: string;
  categoryName: string;
  countryCode: "KZ";
  legalForm: "KZ_IP" | "KZ_TOO" | "NONE";
  legalIdentifier: string;
  legalName: string;
  catalogSetupMode: "MANUAL" | "ASK_MANAGED_IMPORT";
  businessScope: BusinessScope;
  onlineOnly: boolean;
  deliveryCoverage: "NO_DELIVERY" | "SELECTED_CITIES" | "KAZAKHSTAN" | "WORLDWIDE";
  deliveryCities: string[];
  pickupAvailable: boolean;
  locale: string;
  twoGisUrl: string;
  kaspiUrl: string;
  ozonUrl: string;
  wildberriesUrl: string;
  websiteUrl: string;
  instagramUrl: string;
  telegramUrl: string;
};

export type SellerOnboardingBranchData = {
  name: string;
  address: string;
  addressDetails?: string;
  cityId?: string;
  cityName?: string;
  latitude: number;
  longitude: number;
  pickupAvailable: true;
};

export type SellerOnboardingResult = {
  businessId: string;
  catalogSetupMode: "MANUAL" | "ASK_MANAGED_IMPORT";
  startRoute: "BUSINESS_CABINET" | "MANAGED_IMPORT";
};

export function completeSellerOnboarding(
  data: SellerOnboardingData,
  pickupBranches: SellerOnboardingBranchData[],
) {
  const {
    legalIdentifier,
    locale: _locale,
    twoGisUrl,
    kaspiUrl,
    ozonUrl,
    wildberriesUrl,
    websiteUrl,
    instagramUrl,
    telegramUrl,
    ...base
  } = data;
  const sourceLinks = {
    twoGisUrl,
    kaspiUrl,
    ozonUrl,
    wildberriesUrl,
    websiteUrl,
    instagramUrl,
    telegramUrl,
  };
  const body = data.legalForm === "NONE"
    ? { ...base, pickupBranches, ...Object.fromEntries(Object.entries(sourceLinks).filter(([, value]) => value.trim())) }
    : { ...base, pickupBranches, legalIdentifier };

  return apiRequest<SellerOnboardingResult>("/api/v1/business/onboarding", {
    method: "POST",
    auth: true,
    body,
  });
}

export type BusinessCatalogStatus = {
  businessId: string;
  catalogStatus: "IN_PROGRESS" | "REVIEW_REQUIRED" | "COMPLETED" | "RESTRICTED";
  verificationStatus: "PENDING" | "NEEDS_INFO" | "APPROVED" | "REJECTED" | null;
  verificationPriority: "STANDARD" | "EXPEDITED" | null;
  catalogSetupStartedAt: string | null;
  catalogSetupDeadlineAt: string | null;
  catalogSetupCompletedAt: string | null;
  catalogReady: boolean;
};

export function getBusinessCatalogStatus(businessId: string) {
  return apiRequest<BusinessCatalogStatus>(
    `/api/v1/businesses/${businessId}/catalog-setup`,
    { auth: true },
  );
}
