import i18n from "../i18n/i18n";
import type { SearchResult } from "../../entities/search-result/model";
import type { SupplierTask } from "../../entities/supplier/model";
import type { SearchResultDto, SupplierTaskDto } from "./dto";

const confidenceMap = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

const kindMap = {
  ITEM: "item",
  SERVICE: "service",
  BUSINESS: "business",
} as const;

const actionMap = {
  CALL: "call",
  MAP: "map",
  CHAT: "chat",
  REQUEST: "request",
} as const;

function sourceLabel(key: string): string | undefined {
  const translated = i18n.t(`source.${key}`);
  return translated !== `source.${key}` ? translated : undefined;
}

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
    badges: dto.badges ?? [],
    warnings: dto.warnings ?? [],
    sourceLabel: sourceLabel(dto.source) ?? "",
    sourceType: dto.source_type ?? dto.sourceType ?? dto.source,
    note: dto.public_note ?? dto.publicNote ?? "",
    requiresSupplierCheck: dto.requires_supplier_check ?? dto.requiresSupplierCheck ?? false,
    actions: contactActions.map((action) => actionMap[action]),
  };
}

function formatRelativeTime(minutes: number): string {
  if (minutes < 1) return i18n.t("time.justNow");
  if (minutes < 60) return i18n.t("time.minAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t("time.hourAgo", { count: hours });
  const days = Math.floor(minutes / (60 * 24));
  return i18n.t("time.dayAgo", { count: days });
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
