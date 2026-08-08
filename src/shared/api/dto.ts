export type SearchResultDto = {
  id: string;
  type: "ITEM" | "SERVICE" | "BUSINESS";
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
  component: "ItemCard" | "ServiceCard";
  resultId: string;
  businessId: string;
  businessName: string;
  resultType: "ITEM" | "SERVICE";
  brandColor?: string | null;
  brandLogoUrl?: string | null;
  title: string;
  summary?: string | null;
  images?: CatalogImageDto[];
  purchaseDestinations?: PurchaseDestinationDto[];
  categoryLabel?: string | null;
  price?: number | null;
  currency?: string | null;
  businessProfile?: BrandProfileDto | null;
  availability?: string | null;
  availabilityWarning?: string | null;
  matchReasons?: string[];
  badges?: string[];
  distanceMeters?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  hasActiveOffer?: boolean | null;
  branchName?: string | null;
  branchAddress?: string | null;
  branchCity?: string | null;
  decisionLabel?: string | null;
  criterionAssessments?: CriterionAssessmentDto[];
  advantages?: string[];
  tradeoffs?: string[];
  unknowns?: string[];
  comparisonFacts?: CriterionEvidenceDto[];
};

export type PurchaseDestinationDto = {
  label: string;
  url: string;
};

export type CatalogImageDto = {
  id: string;
  url: string;
};

export type DecisionCriterionDto = {
  key: string;
  label: string;
  operator: string;
  values: string[];
  unit?: string | null;
  source?: string;
};

export type DecisionUseCaseDto = {
  key: string;
  label: string;
  source?: string;
};

export type DecisionContextDto = {
  hardConstraints: DecisionCriterionDto[];
  preferences: DecisionCriterionDto[];
  useCases: DecisionUseCaseDto[];
  exclusions: DecisionCriterionDto[];
  customText?: string;
};

export type ClarificationFieldDto = {
  id: string;
  criterionKey: string;
  label: string;
  type: "RANGE" | "SINGLE_SELECT" | "MULTI_SELECT";
  required: boolean;
  options: string[];
  min?: number | null;
  max?: number | null;
  unit?: string | null;
};

export type ClarificationResponseDto = {
  rawQuery: string;
  understoodQuery: string;
  clarificationRequired: boolean;
  fields: ClarificationFieldDto[];
  prefilledDecisionContext?: DecisionContextDto | null;
};

export type CriterionEvidenceDto = {
  source: string;
  key: string;
  value: string;
};

export type CriterionAssessmentDto = {
  criterionKey: string;
  label: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "UNKNOWN";
  displayValue?: string | null;
  consequence?: string | null;
  evidence: CriterionEvidenceDto[];
};

export type CompareValueDto = {
  resultId: string;
  value: string;
  status: "BEST" | "PARTIAL" | "UNKNOWN" | "FAIL";
  highlight?: string | null;
};

export type CompareRowDto = {
  key: string;
  label: string;
  isDifferent: boolean;
  values: CompareValueDto[];
};

export type CompareGroupDto = {
  key: string;
  label: string;
  rows: CompareRowDto[];
};

export type CompareItemDto = {
  resultId: string;
  title: string;
  image?: string | null;
  price?: number | null;
  currency?: string | null;
  verdict?: string | null;
};

export type CompareResponseDto = {
  mode: string;
  items: CompareItemDto[];
  groups: CompareGroupDto[];
};

export type SearchV2SectionDto = {
  type: "exact" | "alternatives" | string;
  title: string;
  kind: "EXACT" | "ALTERNATIVE" | string;
  relaxedConstraints?: string[];
  reason?: string | null;
  cards: SearchV2CardDto[];
};

export type SearchConstraintDto = {
  key: string;
  value: string;
  source: string;
};

export type SearchCompanyFacetDto = {
  businessId: string;
  businessName: string;
  resultCount: number;
};

export type SearchV2ResponseDto = {
  rawQuery: string;
  mode: "ITEM" | "SERVICE";
  understoodQuery: string;
  sections: SearchV2SectionDto[];
  companyFacets: SearchCompanyFacetDto[];
  interpretedConstraints: SearchConstraintDto[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  decisionContext?: DecisionContextDto | null;
  ambiguity?: string;
  suggestions?: string[];
};

export type BrandProfileDto = {
  id?: string;
  businessId?: string;
  businessName?: string;
  brandColor?: string;
  logoUrl?: string;
  coverUrl?: string;
  toneOfVoice?: string;
  description?: string;
  instagramUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  number?: string;
  email?: string;
  deliveryCoverage?: "NO_DELIVERY" | "SELECTED_CITIES" | "KAZAKHSTAN" | "WORLDWIDE";
  deliveryCities?: string[];
  pickupAvailable?: boolean;
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
  discountPercent?: number;
  discountAmount?: number;
  isActive?: boolean;
  currency?: string;
  productCount?: number;
  tags?: string[];
  itemIds?: string[];
  serviceIds?: string[];
  branchIds?: string[];
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
  branchId: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  name: string;
  description: string;
  images: CatalogImageDto[];
  purchaseDestinations: PurchaseDestinationDto[];
  tags: string[];
  attributes?: Record<string, unknown> | null;
  price: number;
  isActive: boolean;
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
  branchId: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  name: string;
  description: string;
  images: CatalogImageDto[];
  purchaseDestinations: PurchaseDestinationDto[];
  serviceMode: "ON_DEMAND" | "SCHEDULED";
  basePrice: number;
  scheduleText: string;
  attributes?: Record<string, unknown> | null;
  isActive: boolean;
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
  branchName?: string;
  status: string;
  tempPassword?: string;
  activatedAt?: string;
  businessName?: string;
  businessId?: string;
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

export type ChatConversationDto = {
  conversationId: string;
  businessId: string | null;
  customerId: string | null;
  customerName?: string;
  subject: string;
  conversationType: "GENERAL_SUPPORT" | "PLATFORM_SUPPORT" | "MANAGED_IMPORT";
  conversationStatus: "PENDING" | "IN_CHAT" | "CLOSED";
  managedImportRequestId?: string | null;
  customerUnreadCount: number;
  businessUnreadCount: number;
  lastMessageAt: string;
  createdAt: string;
};

export type ChatMessageDto = {
  messageId: string;
  conversationId: string;
  senderType: "SYSTEM" | "CUSTOMER" | "BUSINESS" | "PLATFORM";
  text: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
};

export type ChatConversationListResponse = {
  items: ChatConversationDto[];
};

export type ChatMessageListResponse = {
  items: ChatMessageDto[];
};
