import type { SearchResult } from "../../entities/search-result/model";
import type { SupplierTask } from "../../entities/supplier/model";
import type { SearchResultDto, SupplierTaskDto } from "./dto";

const confidenceMap = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

const kindMap = {
  PRODUCT: "product",
  SERVICE: "service",
  BUSINESS: "business",
} as const;

const actionMap = {
  CALL: "call",
  MAP: "map",
  CHAT: "chat",
  REQUEST: "request",
} as const;

const sourceMap = {
  CATALOG: "Каталог поставщика",
  SUPPLIER_REPLY: "Ручной ответ",
  MANUAL_PROFILE: "Профиль поставщика",
  SERVICE_PROFILE: "Профиль услуги",
} as const;

export function mapSearchResult(dto: SearchResultDto): SearchResult {
  return {
    id: dto.id,
    kind: kindMap[dto.type],
    title: dto.name,
    supplierName: dto.supplier_name,
    branch: dto.branch_address,
    category: dto.category_name,
    priceLabel: dto.price_text,
    confidence: confidenceMap[dto.confidence_code],
    sourceLabel: sourceMap[dto.source],
    note: dto.public_note,
    actions: dto.contact_actions.map((action) => actionMap[action]),
  };
}

export function mapSupplierTask(dto: SupplierTaskDto): SupplierTask {
  const ageLabel = dto.age_minutes < 60 ? `${dto.age_minutes} мин` : `${Math.floor(dto.age_minutes / 60)} ч`;

  return {
    id: dto.id,
    query: dto.query,
    customerArea: dto.customer_area,
    category: dto.category_name,
    ageLabel,
    confidenceLabel: confidenceMap[dto.confidence_code],
    status: dto.status === "NEW" ? "new" : dto.status === "NEEDS_REPLY" ? "needs_reply" : "answered",
  };
}
