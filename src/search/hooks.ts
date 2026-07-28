"use client";

/**
 * Search client orchestration (P1.2) — the city-filter combobox's suggestions
 * and the opt-in geolocation fix behind the radius filter. Components consume
 * these and render; they never call the API directly.
 *
 * The Catalog Page's own data (the search results) is fetched SERVER-SIDE by
 * the route file via `api.search()` directly (D7) — there is no client hook
 * for it, and therefore no `store.ts`: the URL is the one source of truth for
 * query/mode/sort/filters, so nothing here needs to outlive one render.
 */
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import * as api from "./api";
import type { CatalogSearchParams, CitySuggestion } from "./model";

// ── City autocomplete ────────────────────────────────────────────────────────

/** Below this the suggestion list is noise — same floor as business-cabinet's
 *  category combobox (P6.2 — one convention for "too short to search yet"). */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

export type CitySuggestions = {
  suggestions: CitySuggestion[];
  loading: boolean;
};

/**
 * Debounced city suggestions for the location filter's combobox. Same shape
 * as `business-cabinet`'s `useCategorySuggestions` (D8 — same LOOK, different
 * owner/data: this hits `/cities`, not `/categories`, and belongs to search's
 * OWN filter, not the seller-onboarding form) — duplicated deliberately, not
 * imported across the slice boundary.
 *
 * The request is ABORTED when the query changes (no autocomplete race), and a
 * failure resolves to an empty list — the field still accepts free text, so a
 * suggestion outage degrades to "type the city yourself", not a dead end.
 */
export function useCitySuggestions(query: string): CitySuggestions {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .getCities(trimmed, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setSuggestions(result);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, loading };
}

// ── Catalog Page URL state ───────────────────────────────────────────────────

/**
 * Update the Catalog Page's URL search params — the ONE piece of client
 * navigation logic every sort/filter control shares (P6.2), so the URL stays
 * the single source of truth (no `store.ts` for this slice — nothing here
 * outlives a render). Setting a value to `undefined`/`""` removes that param
 * rather than writing an empty one. Any change besides `page` itself resets
 * pagination — changing a filter mid-list should not strand the visitor on a
 * page number the new result set may not have.
 */
export function useUpdateCatalogParams(): (
  updates: Partial<CatalogSearchParams>,
) => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (updates: Partial<CatalogSearchParams>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (!("page" in updates)) next.delete("page");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

// ── Geolocation (the radius filter's location fix) ──────────────────────────

export type GeolocationState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" };

/**
 * The radius filter's location fix — EXPLICIT opt-in only. The browser's
 * permission prompt never fires on page load; it fires only when `request` is
 * called from a click, matching the contracts note "never show the radius
 * control as available while location is denied or pending" (never invented,
 * never auto-triggered — P9.4/P9.1 apply to permission UX the same as to a
 * screen).
 */
export function useGeolocation(): {
  state: GeolocationState;
  request: () => void;
} {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "denied" });
      return;
    }
    setState({ status: "pending" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "granted",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setState({ status: "denied" });
      },
      { maximumAge: 5 * 60 * 1000, timeout: 10 * 1000 },
    );
  };

  return { state, request };
}
