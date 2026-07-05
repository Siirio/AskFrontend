export type SearchResultDto = {
  id: string;
  type: "PRODUCT" | "SERVICE" | "BUSINESS";
  name: string;
  supplier_name?: string;
  supplierName?: string;
  brand_id?: string;
  brandId?: string;
  business_name?: string;
  businessName?: string;
  brand_color?: string;
  brandColor?: string;
  brand_logo_url?: string;
  brandLogoUrl?: string;
  brand_cover_url?: string;
  brandCoverUrl?: string;
  brand_descriptor?: string;
  brandDescriptor?: string;
  branch_address?: string;
  branchAddress?: string;
  branch_context?: string;
  branchContext?: string;
  category_name?: string;
  categoryName?: string;
  price_text?: string;
  priceText?: string;
  availability_status?: "NEEDS_CONFIRMATION" | "UNKNOWN" | "CONFIRMED";
  availabilityStatus?: "NEEDS_CONFIRMATION" | "UNKNOWN" | "CONFIRMED";
  confirmation_status?: "NOT_CONFIRMED" | "BUSINESS_CONFIRMED" | "DATA_UPDATED" | "SUPPLIER_CHECK_CONFIRMED";
  confirmationStatus?: "NOT_CONFIRMED" | "BUSINESS_CONFIRMED" | "DATA_UPDATED" | "SUPPLIER_CHECK_CONFIRMED";
  pickup_options?: Array<"PICKUP" | "ONLINE">;
  pickupOptions?: Array<"PICKUP" | "ONLINE">;
  distance_text?: string;
  distanceText?: string;
  confidence_code?: "HIGH" | "MEDIUM" | "LOW";
  confidenceCode?: "HIGH" | "MEDIUM" | "LOW";
  source: "CATALOG" | "SUPPLIER_REPLY" | "MANUAL_PROFILE" | "SERVICE_PROFILE";
  source_type?: string;
  sourceType?: string;
  public_note?: string;
  publicNote?: string;
  section_type?: "EXACT" | "OVER_BUDGET" | "WRONG_CITY" | "SIMILAR";
  sectionType?: "EXACT" | "OVER_BUDGET" | "WRONG_CITY" | "SIMILAR";
  score?: number;
  match_reasons?: string[];
  matchReasons?: string[];
  badges?: string[];
  warnings?: string[];
  requires_supplier_check?: boolean;
  requiresSupplierCheck?: boolean;
  contact_actions?: Array<"CALL" | "MAP" | "CHAT" | "REQUEST">;
  contactActions?: Array<"CALL" | "MAP" | "CHAT" | "REQUEST">;
  available_actions?: Array<"CALL" | "MAP" | "CHAT" | "REQUEST">;
  availableActions?: Array<"CALL" | "MAP" | "CHAT" | "REQUEST">;
};

export type ContactActionDto = {
  contactActionId: string;
  provider: string;
  label: string;
};

export type ContactResolveDto = {
  actionType: "REDIRECT" | "DISPLAY" | "DEEP_LINK" | "CHAT";
  redirectUrl?: string | null;
  deepLink?: string | null;
  displayValue?: string | null;
  provider: string;
  label: string;
  expiresAt: string;
};

export type SearchV2CardDto = {
  component: "ProductCard" | "ServiceCard" | "DropCard" | "BusinessCandidateCard";
  resultId: string;
  businessId?: string | null;
  businessName?: string | null;
  brandColor?: string | null;
  brandLogoUrl?: string | null;
  title: string;
  price?: number | null;
  availability?: "IN_STOCK" | "NEEDS_CONFIRMATION" | "UNKNOWN" | string;
  matchReasons?: string[];
  badges?: string[];
  distanceMeters?: number | null;
  branchName?: string | null;
  hasActiveDrop?: boolean;
  contactActions?: ContactActionDto[];
};

export type SearchV2SectionDto = {
  type: "exact_products" | "similar_products" | "fresh_drops" | "suitable_storefronts" | "over_budget" | "needs_confirmation";
  title: string;
  cards: SearchV2CardDto[];
};

export type SearchV2ResponseDto = {
  searchSessionId?: string | null;
  rawQuery: string;
  scope: string;
  understoodQuery: string;
  sections: SearchV2SectionDto[];
  supplierCheckCount: number;
};

export type BrandProfileDto = {
  id?: string;
  businessId: string;
  businessName?: string;
  brandColor?: string;
  logoUrl?: string;
  coverUrl?: string;
  toneOfVoice?: string;
  description?: string;
  instagramUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
};

export type StorefrontBlockDto = {
  blockId?: string;
  blockType: string;
  displayOrder: number;
  config: Record<string, unknown>;
  enabled: boolean;
};

export type StorefrontPageDto = {
  businessId: string;
  brandProfile: BrandProfileDto;
  blocks: StorefrontBlockDto[];
  publishedAt?: string | null;
};

export type BrandDropDto = {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  type: string;
  status: string;
  coverUrl?: string;
  productCount?: number;
  tags?: string[];
  productIds?: string[];
};

export type SearchResultSectionDto = {
  type: "EXACT" | "OVER_BUDGET" | "WRONG_CITY" | "SIMILAR";
  title: string;
  items: SearchResultDto[];
};

export type StructuredSearchDto = {
  intentStructure: unknown;
  effectiveScope: string;
  effectiveQueries: string[];
  sections?: SearchResultSectionDto[];
  results: SearchResultDto[];
};

export type SupplierTaskDto = {
  id: string;
  query: string;
  customer_area: string;
  category_name: string;
  age_minutes: number;
  confidence_code: "HIGH" | "MEDIUM" | "LOW";
  status: "NEW" | "NEEDS_REPLY" | "ANSWERED";
};

export type CustomerRequestHistoryDto = {
  id: string;
  query: string;
  scope: string;
  city: string;
  status: string;
  matchedSuppliers: number;
  replyCount: number;
  createdAt: string;
};

export type SupplierReplyItemDto = {
  id: string;
  supplierName: string;
  branchName: string;
  status: string;
  statusLabel: string;
  price: number | null;
  productHint: string;
  comment: string;
  createdAt: string;
};

export type CustomerRequestDetailDto = {
  id: string;
  query: string;
  scope: string;
  city: string;
  status: string;
  matchedSuppliers: number;
  createdAt: string;
  replies: SupplierReplyItemDto[];
};

export type TaskMessageDto = {
  id: string;
  role: string;
  text: string;
  status: string;
  price: string | null;
  createdAt: string;
};

export type SupplierTaskDetailDto = {
  id: string;
  query: string;
  scope: string;
  customerName: string;
  customerContact: string;
  city: string;
  categoryName: string;
  ageMinutes: number;
  confidenceCode: string;
  status: string;
  createdAt: string;
  messages: TaskMessageDto[];
};

export type BusinessProductDto = {
  productId: string;
  productOfferId: string;
  branchId: string;
  categoryId: string | null;
  categoryLabel: string | null;
  name: string;
  description: string;
  sku: string;
  tags: string[];
  price: number;
  enabled: boolean;
  updatedAt: string;
};

export type BusinessProductListDto = {
  items: BusinessProductDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type BusinessServiceDto = {
  serviceOfferingId: string;
  serviceBranchOfferId: string;
  branchId: string;
  categoryId: string | null;
  categoryLabel: string | null;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  scheduleText: string;
  active: boolean;
  updatedAt: string;
};

export type BusinessServiceListDto = {
  items: BusinessServiceDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type StaffDto = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  tempPassword: string;
  activatedAt: string;
};

export type BusinessCardBlockDto = {
  localId: string;
  blockType: string;
  displayOrder: number;
  config: Record<string, unknown>;
};

export type BusinessCardDto = {
  businessId: string;
  blocks: BusinessCardBlockDto[];
  publishedAt?: string | null;
};
