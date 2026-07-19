import { apiRequest } from "./httpClient";

export type LegalDocument = {
  code: string;
  version: string;
  countryCode: string;
  locale: string;
  publicUrl: string;
  effectiveAt: string;
};

export function listActiveLegalDocuments(locale: string) {
  const params = new URLSearchParams({ countryCode: "KZ", locale });
  return apiRequest<LegalDocument[]>(`/api/v1/legal/documents?${params.toString()}`);
}

export function acceptLegalDocuments(documentCodes: string[], locale: string) {
  return apiRequest<void>("/api/v1/legal/registration-acceptances", {
    method: "POST",
    auth: true,
    body: {
      documentCodes,
      countryCode: "KZ",
      locale,
    },
  });
}
