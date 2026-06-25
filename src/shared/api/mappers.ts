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
  return {
    id: dto.id,
    query: dto.query,
    customerArea: dto.customer_area,
    category: dto.category_name,
    ageMinutes: dto.age_minutes,
    ageLabel: formatRelativeTime(dto.age_minutes),
    confidenceLabel: confidenceMap[dto.confidence_code],
    status: dto.status === "NEW" ? "new" : dto.status === "NEEDS_REPLY" ? "needs_reply" : "answered",
  };
}
