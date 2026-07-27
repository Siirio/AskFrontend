/**
 * AskBackend `business` calls for the business-cabinet slice — the ONLY place
 * these endpoints are named (P1.2, §7). Built on shared/api/httpClient, which
 * attaches the Bearer token from storage for the authenticated calls and
 * converts the snake_case wire to camelCase at the transport boundary (D20).
 *
 * Importable from server AND client (D7): plain functions, no React, no DOM.
 * Platform-neutral (D5).
 *
 * V1 surface: seller onboarding + the BUSINESS category autocomplete it needs.
 * The rest of the module (branches, staff, invitations, offers, managed import)
 * lands with the cabinet itself, roadmap #7–#9.
 */
import { httpClient } from "@/shared/api/httpClient";

import type {
  CategoryAutocompleteResponse,
  CategorySuggestion,
  SellerOnboardingRequest,
  SellerOnboardingResponse,
} from "./model";

/**
 * The only country ASK registers a business in today, and it is not a
 * placeholder: `BusinessLegalForm` offers KZ_IP and KZ_TOO, so the legal half of
 * this form is Kazakhstan law by construction. Rendering a country picker with
 * one option would be a dead control; a second market needs the backend's legal
 * forms to grow first, and that is gate G4's question, not this form's.
 */
export const REGISTRATION_COUNTRY_CODE = "KZ";

/**
 * Create a business for the CURRENT customer (Bearer). 201 on success. The
 * user's role becomes BUSINESS_OWNER server-side, which the client only learns
 * by re-reading the session — see `useRefreshSession` in @/auth.
 */
export function onboardSeller(
  body: SellerOnboardingRequest,
): Promise<SellerOnboardingResponse> {
  return httpClient.post<SellerOnboardingResponse>(
    "/api/v1/business/onboarding",
    {
      body,
    },
  );
}

/**
 * Suggest BUSINESS categories for the typed query (public — no Bearer needed).
 * Categories are flat: one type, one source, no parents or subcategories.
 *
 * `type` is fixed to BUSINESS here on purpose. ITEM and SERVICE suggestions
 * belong to the product and service forms in their own slices (`catalog`,
 * `services`); a shared "category search" parameterized by type would be one
 * component serving two callers that happen to look alike (P6.3, D8).
 */
export async function suggestBusinessCategories(
  query: string,
  signal?: AbortSignal,
): Promise<CategorySuggestion[]> {
  const response = await httpClient.get<CategoryAutocompleteResponse>(
    "/api/v1/categories",
    { query: { q: query, type: "BUSINESS" }, signal },
  );
  return response.suggestions ?? [];
}
