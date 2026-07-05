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
  const confidenceCode = dto.confidence_code ?? dto.confidenceCode ?? "MEDIUM";
  const contactActions = dto.available_actions ?? dto.availableActions ?? dto.contact_actions ?? dto.contactActions ?? [];
  return {
    id: dto.id,
    kind: kindMap[dto.type],
    title: dto.name,
    supplierName: dto.supplier_name ?? dto.supplierName ?? "",
    brandId: dto.brand_id ?? dto.brandId,
    businessName: dto.business_name ?? dto.businessName ?? dto.supplier_name ?? dto.supplierName ?? "",
    brandColor: dto.brand_color ?? dto.brandColor ?? "#0d9b7c",
    brandLogoUrl: dto.brand_logo_url ?? dto.brandLogoUrl,
    brandCoverUrl: dto.brand_cover_url ?? dto.brandCoverUrl,
    brandDescriptor: dto.brand_descriptor ?? dto.brandDescriptor,
    branch: dto.branch_address ?? dto.branchAddress ?? "",
    branchContext: dto.branch_context ?? dto.branchContext ?? dto.branch_address ?? dto.branchAddress ?? "",
    category: dto.category_name ?? dto.categoryName ?? "",
    priceLabel: dto.price_text ?? dto.priceText,
    availabilityStatus: dto.availability_status ?? dto.availabilityStatus ?? "NEEDS_CONFIRMATION",
    confirmationStatus: dto.confirmation_status ?? dto.confirmationStatus ?? "NOT_CONFIRMED",
    pickupOptions: dto.pickup_options ?? dto.pickupOptions ?? [],
    distanceText: dto.distance_text ?? dto.distanceText,
    confidence: confidenceMap[confidenceCode],
    section: dto.section_type ?? dto.sectionType,
    score: dto.score,
    matchReasons: dto.match_reasons ?? dto.matchReasons ?? [],
    badges: dto.badges ?? [],
    warnings: dto.warnings ?? [],
    sourceLabel: sourceMap[dto.source],
    sourceType: dto.source_type ?? dto.sourceType ?? dto.source,
    note: dto.public_note ?? dto.publicNote ?? "",
    requiresSupplierCheck: dto.requires_supplier_check ?? dto.requiresSupplierCheck ?? false,
    actions: contactActions.map((action) => actionMap[action]),
  };
}

function formatRelativeTime(minutes: number): string {
  if (minutes < 1) return "только что";
  if (minutes < 60) return formatMinutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatHours(hours);
  const days = Math.floor(minutes / (60 * 24));
  if (days === 1) return "1 день назад";
  if (days < 7) return formatDays(days);
  return `${days} дн. назад`;
}

function formatMinutes(m: number): string {
  if (m % 10 === 1 && m % 100 !== 11) return `${m} минуту назад`;
  if ([2, 3, 4].includes(m % 10) && ![12, 13, 14].includes(m % 100)) return `${m} минуты назад`;
  return `${m} минут назад`;
}

function formatHours(h: number): string {
  if (h % 10 === 1 && h % 100 !== 11) return `${h} час назад`;
  if ([2, 3, 4].includes(h % 10) && ![12, 13, 14].includes(h % 100)) return `${h} часа назад`;
  return `${h} часов назад`;
}

function formatDays(d: number): string {
  if (d % 10 === 1 && d % 100 !== 11) return `${d} день назад`;
  if ([2, 3, 4].includes(d % 10) && ![12, 13, 14].includes(d % 100)) return `${d} дня назад`;
  return `${d} дней назад`;
}

export function mapSupplierTask(dto: SupplierTaskDto): SupplierTask {
  const normalized = dto as SupplierTaskDto & {
    customerArea?: string;
    categoryName?: string;
    ageMinutes?: number;
    confidenceCode?: "HIGH" | "MEDIUM" | "LOW";
  };
  const ageMinutes = normalized.age_minutes ?? normalized.ageMinutes ?? 0;
  const confidenceCode = normalized.confidence_code ?? normalized.confidenceCode ?? "MEDIUM";
  return {
    id: normalized.id,
    query: normalized.query,
    customerArea: normalized.customer_area ?? normalized.customerArea ?? "",
    category: normalized.category_name ?? normalized.categoryName ?? "",
    ageMinutes,
    ageLabel: formatRelativeTime(ageMinutes),
    confidenceLabel: confidenceMap[confidenceCode],
    status: dto.status === "NEW" ? "new" : dto.status === "NEEDS_REPLY" ? "needs_reply" : "answered",
  };
}
