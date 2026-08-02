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
 * lands with the cabinet itself, roadmap #6–#8.
 */
import { httpClient } from "@/shared/api/httpClient";

import type {
  BranchResponse,
  CategoryAutocompleteResponse,
  CategorySuggestion,
  CreateBranchRequest,
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

/**
 * Create a branch for an existing business (OWNER, Bearer). 201 on success.
 * NOT used during registration — onboarding's drafted branches travel inline
 * as `SellerOnboardingRequest.pickupBranches` instead (model.ts
 * `toOnboardingRequest`), created atomically with the business. This is the
 * cabinet's own Branches-tab "add a branch" call (roadmap #6).
 */
export function createBranch(
  businessId: string,
  body: CreateBranchRequest,
): Promise<BranchResponse> {
  return httpClient.post<BranchResponse>(
    `/api/v1/businesses/${businessId}/branches`,
    { body },
  );
}

// ── OpenStreetMap geocoding (Nominatim) ──────────────────────────────────────
//
// NOT an AskBackend call — the branch map picker's address search and
// reverse-geocode, against OpenStreetMap's free public Nominatim service
// (no key). Kept in this slice's api.ts anyway, alongside the real backend
// calls: components never call `fetch` directly (Data Locks), and this is the
// one place that rule points to regardless of which host answers.

export type GeocodeResult = { label: string; lat: number; lng: number };

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Nominatim is a free public service with no uptime promise — an unbounded
 * `fetch` against it can leave the search box spinning until the tab is closed.
 * Both calls below therefore carry their own deadline, combined with whatever
 * `signal` the caller already passes (the debounce's abort), so the first of
 * the two to fire wins.
 *
 * The deadline deliberately covers the BODY read as well as the headers. A
 * hand-rolled combiner that was released when `fetch` resolved (the first
 * revision of this) left `response.json()` unbounded — and a stalled body is
 * exactly the failure mode a slow public service produces. `AbortSignal.any`
 * keeps one signal live across both awaits and disposes of its own timer.
 */
const NOMINATIM_TIMEOUT_MS = 8000;

function withDeadline(signal: AbortSignal | undefined): AbortSignal {
  const deadline = AbortSignal.timeout(NOMINATIM_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, deadline]) : deadline;
}

/**
 * Free-text address search for the map picker's search box.
 *
 * `accept-language` matters more than it looks: the branch's registry levels
 * are rendered in the reader's language (KATO ru/kk), so a result labelled in
 * OSM's default would put two languages in one address. Nominatim honours the
 * parameter per request, which is exactly the granularity we need — the app
 * locale is switchable at runtime (D18).
 */
export async function searchAddress(
  query: string,
  locale: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=5&countrycodes=kz&accept-language=${encodeURIComponent(locale)}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal: withDeadline(signal) });
  if (!response.ok) return [];
  const results: { display_name: string; lat: string; lon: string }[] =
    await response.json();
  return results.map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

/**
 * Reverse-geocode a dropped/dragged pin into the STREET LINE of the branch
 * form — house number and road only, never the full display name.
 *
 * The narrowing arrived with `AddressSelect` (2026-07-31): the branch's region,
 * district and settlement now come from the KATO registry, so Nominatim's
 * `display_name` ("10, Абая көшесі, Алматы, Қазақстан") would repeat three
 * levels the seller has already answered, in a transliteration that need not
 * even match. `addressdetails=1` returns the parts separately, so the street
 * field gets the one part the cascade cannot supply.
 *
 * Falls back to `display_name` when OSM has no road for the pin — a rural point
 * often does not. The field stays editable either way (item 5: the seller has
 * the last word on what the address text says).
 *
 * `accept-language` is passed for the same reason as in `searchAddress`: this
 * string is concatenated with KATO's ru/kk names, and a road name in a third
 * language would be visible in the final address.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  locale: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&addressdetails=1&accept-language=${encodeURIComponent(locale)}&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, { signal: withDeadline(signal) });
  if (!response.ok) return null;
  const result: {
    display_name?: string;
    address?: { road?: string; house_number?: string };
  } = await response.json();
  const road = result.address?.road?.trim();
  if (!road) return result.display_name ?? null;
  const houseNumber = result.address?.house_number?.trim();
  return houseNumber ? `${road} ${houseNumber}` : road;
}
