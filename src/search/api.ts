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

import type { CitySuggestion, SearchRequest, SearchResponse } from "./model";

const SEARCH_BASE = "/api/v1/search";

/** Anonymous — creates nothing (no requests, chats, or notifications). */
export function search(request: SearchRequest): Promise<SearchResponse> {
  return httpClient.post<SearchResponse>(SEARCH_BASE, { body: request });
}

/**
 * The FULL city list for the location filter's combobox (public).
 *
 * `CityController.listAll()` takes **no parameters** and returns every row as
 * `CityDto {id, name}` — so there is nothing to send and nothing to page. The
 * caller filters locally; see `useCitySuggestions`.
 *
 * Corrected 2026-08-02 (AUDIT_1 S1): this used to send `?q=<typed>`, which the
 * controller ignores. Every keystroke therefore pulled the entire city table
 * and then rendered it as blank rows, because the response was read as
 * `{ city }` — a shape that exists nowhere on the backend.
 *
 * `resolveCity()` was DELETED in the same change. It sent `?lat=&lng=` to
 * `GET /cities/resolve`, whose `@RequestParam String name` is required, so it
 * would have 400'd — and it was exported but called from nowhere (P8.1). The
 * real endpoint resolves a NAME to a city id; `business-cabinet` will add that
 * call when B3 gives it a caller, rather than keeping a broken one warm here.
 */
export function getCities(signal?: AbortSignal): Promise<CitySuggestion[]> {
  return httpClient.get<CitySuggestion[]>("/api/v1/cities", { signal });
}
