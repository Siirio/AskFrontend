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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useStore } from "zustand";

import * as api from "./api";
import type {
  CatalogSearchParams,
  CitySuggestion,
  SearchResponse,
  SearchSectionResponse,
} from "./model";
import { toSearchRequest } from "./model";
import { createSearchResultsStore } from "./store";

// ── City autocomplete ────────────────────────────────────────────────────────

/** Below this the suggestion list is noise — same floor as business-cabinet's
 *  category combobox (P6.2 — one convention for "too short to search yet"). */
const MIN_QUERY_LENGTH = 2;
// `DEBOUNCE_MS` went with the per-keystroke request (2026-08-02, AUDIT_1 S1):
// the list is fetched once and filtered in memory, so there is no longer a
// request for a keystroke to debounce.

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
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);

  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_QUERY_LENGTH;

  // ONE fetch for the whole table, and only once the field is actually being
  // used. `GET /cities` has no query parameter (CityController.listAll), so
  // there is nothing a keystroke could narrow server-side — re-requesting per
  // keystroke would re-download every city to show a subset of it. Reference
  // data, cached for the page's life; the search slice's "never filter
  // client-side" lock is about RESULTS, not about a picker's own option list.
  useEffect(() => {
    if (!ready || requested.current) return;
    requested.current = true;

    const controller = new AbortController();
    setLoading(true);
    api
      .getCities(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCities(result);
      })
      .catch(() => {
        // The field still accepts free text, so an outage degrades to "type
        // the city yourself" rather than a dead end. Allow a later retry.
        if (!controller.signal.aborted) {
          requested.current = false;
          setCities([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      // Cleared so a remount can retry. Not currently reachable — this effect is
      // gated on a typed query, so it first fires AFTER mount, where React
      // StrictMode does not double-invoke. The cabinet's copy runs on mount and
      // WAS bitten by exactly this: cleanup aborted the request, the guard
      // blocked the retry, and the list stayed empty with one `(canceled)` row
      // as the only evidence. Hardened here so the difference stays luck-free.
      requested.current = false;
    };
  }, [ready]);

  const suggestions = useMemo(() => {
    if (!ready) return [];
    const needle = trimmed.toLocaleLowerCase();
    return cities.filter((city) =>
      city.name.toLocaleLowerCase().includes(needle),
    );
  }, [cities, ready, trimmed]);

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

// ── Catalog pagination (infinite scroll) ─────────────────────────────────────

/**
 * Accumulated result pages for the Catalog Page, and the request that extends
 * them (PRODUCT_VISION §4 — infinite scroll replaced pagination, owner
 * 2026-08-02).
 *
 * **The premise this file opened with no longer holds, deliberately.** The
 * header above says nothing in search needs to outlive one render because the
 * URL is the single source of truth. That is still true of query/mode/sort/
 * filters — every one of them still travels in the URL and still triggers a
 * fresh server render. What it is no longer true of is the RESULTS, because
 * pages 1..n arrive after the render that produced page 0. See `store.ts` for
 * why holding them does not weaken the server-capability lock: the store
 * concatenates honest server answers, it never refines them.
 *
 * Page 0 is NOT fetched here — the route file already has it (D7). This hook
 * only ever asks for the next one, using the SAME params, so an appended page
 * is the same query the user is already looking at.
 */
export function useCatalogPagination(
  initial: SearchResponse,
  params: CatalogSearchParams,
  locale: string,
): {
  sections: SearchSectionResponse[];
  hasNext: boolean;
  loading: boolean;
  error: boolean;
  loadMore: () => void;
  retry: () => void;
} {
  // Created once per mount. `CatalogPage` remounts this whole island under a
  // key derived from the params, so a changed filter or sort gets a NEW store
  // rather than a reset — the vision's "changing any filter or sort resets the
  // list" is then structural rather than a call someone can forget.
  const [store] = useState(() =>
    createSearchResultsStore({
      sections: initial.sections,
      hasNext: initial.hasNext,
    }),
  );
  const state = useStore(store);

  // The request is keyed off the store's own page counter rather than a local
  // one, so there is exactly one notion of "which page are we on".
  const request = useCallback(async () => {
    const { page, loading, hasNext } = store.getState();
    if (loading || !hasNext) return;
    store.getState().setLoading(true);
    try {
      const next = await api.search({
        ...toSearchRequest(params, locale),
        page: page + 1,
      });
      store.getState().appendPage(next.sections, next.hasNext);
    } catch {
      // Kept soft on purpose: the results already on screen stay, and the UI
      // offers a retry. Throwing here would replace a working list with an
      // error page because one continuation failed.
      store.getState().setError(true);
    }
  }, [store, params, locale]);

  const retry = useCallback(() => {
    store.getState().setError(false);
    void request();
  }, [store, request]);

  return {
    sections: state.sections,
    hasNext: state.hasNext,
    loading: state.loading,
    // Nothing may load while an error is showing — otherwise the sentinel, which
    // is still on screen, would immediately re-fire the request that just failed
    // and spin. The retry button is the only way forward from here.
    error: state.error,
    loadMore: () => {
      if (store.getState().error) return;
      void request();
    },
    retry,
  };
}
