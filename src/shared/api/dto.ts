export type SearchResultDto = {
  id: string;
  type: "PRODUCT" | "SERVICE" | "BUSINESS";
  name: string;
  supplier_name: string;
  branch_address: string;
  category_name: string;
  price_text?: string;
  confidence_code: "HIGH" | "MEDIUM" | "LOW";
  source: "CATALOG" | "SUPPLIER_REPLY" | "MANUAL_PROFILE" | "SERVICE_PROFILE";
  public_note: string;
  contact_actions: Array<"CALL" | "MAP" | "CHAT" | "REQUEST">;
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
  categoryId: string;
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
  categoryId: string;
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
