import { createStore } from "zustand/vanilla";

import type { SearchSectionResponse } from "./model";

/**
 * The Catalog Page's accumulated result pages — a zustand FACTORY consumed via
 * a context provider (project lock), never a module-scope singleton, which
 * would leak one visitor's results into another's SSR request.
 *
 * ── WHY THIS SLICE NOW HAS A STORE ──────────────────────────────────────────
 * `hooks.ts` used to state that nothing in search needed to outlive one render,
 * because the URL was the single source of truth. Infinite scroll (owner
 * decision 2026-08-02, PRODUCT_VISION §4) reverses exactly that premise: pages
 * 1..n are fetched after the render that produced page 0, and they have to
 * accumulate somewhere.
 *
 * **This does not weaken the server-capability lock, and the distinction is the
 * whole point.** The lock forbids REFINING results client-side — re-sorting or
 * re-filtering the cards already on screen to fake a server capability. This
 * store never refines: every section in it came from a `POST /api/v1/search`
 * the server answered, with the same filters and sort as page 0. It concatenates
 * honest server pages; it does not reinterpret them.
 *
 * ── RESETTING IS NOT THIS STORE'S JOB ──────────────────────────────────────
 * The vision requires that changing any filter or sort DISCARDS the list and
 * re-queries. That is handled by remounting the provider under a key derived
 * from the URL params, so a new query gets a genuinely new store rather than a
 * `reset()` someone can forget to call. Hence no reset action here — the
 * absence is deliberate.
 *
 * Pure state and state-mutating actions only: no DOM, no fetch (D5 lock). The
 * request itself lives in `hooks.ts`, which composes this with `api.ts`.
 */
export type SearchResultsState = {
  /** Every page's sections, in arrival order. Page 0 comes from the server
   *  render; the rest are appended here. */
  sections: SearchSectionResponse[];
  /** Zero-based index of the newest page held. */
  page: number;
  /** The server's own answer for "is there more" — never inferred from
   *  counting what we hold (contracts.md: drive paging off `hasNext`). */
  hasNext: boolean;
  /** A page request is in flight. */
  loading: boolean;
  /** The LAST append failed. Page 0 failing is a different thing entirely —
   *  the route file turns that into the page's error state (P9.3). This is the
   *  softer case: results are on screen and only the continuation broke, so the
   *  UI keeps what it has and offers a retry rather than discarding it. */
  error: boolean;
  appendPage: (sections: SearchSectionResponse[], hasNext: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: boolean) => void;
};

export function createSearchResultsStore(initial: {
  sections: SearchSectionResponse[];
  hasNext: boolean;
}) {
  return createStore<SearchResultsState>((set) => ({
    sections: initial.sections,
    page: 0,
    hasNext: initial.hasNext,
    loading: false,
    error: false,
    appendPage: (sections, hasNext) =>
      set((state) => ({
        // Concatenated, never merged by `kind`: the backend sections a page
        // independently, so page 1 can carry its own EXACT and ALTERNATIVE
        // blocks. Merging them into page 0's would reorder cards the server
        // ranked — a client-side reinterpretation, which is the one thing the
        // lock forbids.
        sections: [...state.sections, ...sections],
        page: state.page + 1,
        hasNext,
        loading: false,
        error: false,
      })),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
  }));
}

export type SearchResultsStore = ReturnType<typeof createSearchResultsStore>;
