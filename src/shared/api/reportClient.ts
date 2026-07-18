import { apiRequest } from "./httpClient";

export type ReportTargetType = "PRODUCT" | "BUSINESS" | "MESSAGE" | "USER";

export function createContentReport(data: {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: string;
  details?: string;
}) {
  return apiRequest<{ id: string; status: string }>("/api/v1/reports", {
    method: "POST",
    auth: true,
    body: data,
  });
}
