/**
 * AskBackend `search/basic` calls for the search slice — the ONLY place these
 * endpoints are named (P1.2, §7). Built on shared/api/httpClient, which
 * attaches the Bearer token automatically when one is stored; the search
 * endpoint itself is anonymous (permitAll, contracts.md).
 *
 * Importable from server AND client (D7): plain functions, no React, no DOM.
 * Platform-neutral (D5). The Catalog Page route file calls `search()` directly
 * during SSR; the client-side suggestion hooks (hooks.ts) call the reference
 * endpoints for the filter comboboxes.
 */
import { httpClient } from "@/shared/api/httpClient";

import type {
  CityResolveResponse,
  CitySuggestion,
  SearchRequest,
  SearchResponse,
} from "./model";

const SEARCH_BASE = "/api/v1/search";

/** Anonymous — creates nothing (no requests, chats, or notifications). */
export function search(request: SearchRequest): Promise<SearchResponse> {
  return httpClient.post<SearchResponse>(SEARCH_BASE, { body: request });
}

/** City suggestions for the location filter's combobox (public). */
export function getCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  return httpClient.get<CitySuggestion[]>("/api/v1/cities", {
    query: { q: query },
    signal,
  });
}

/** Resolve a city from coordinates (public) — used once a location fix is
 *  granted, so the radius filter can show which city it is centred on. */
export function resolveCity(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<CityResolveResponse> {
  return httpClient.get<CityResolveResponse>("/api/v1/cities/resolve", {
    query: { lat, lng },
    signal,
  });
}
