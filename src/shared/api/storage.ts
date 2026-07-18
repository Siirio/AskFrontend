/**
 * The ONE browser key-value door (P5.2): components and slice logic never call
 * `localStorage` directly — persistent flags go through this helper (and the
 * token through `tokenStorage`, which is built on it). On the server every read
 * is null and every write a no-op, so callers stay importable from code that
 * renders during SSR (D7); the implementation swaps for a native one when
 * React Native arrives (D5). Keys stay with their owners — this module knows
 * no key names and no business meaning.
 *
 * Storage can be UNAVAILABLE in a real browser too — disabled site data,
 * sandboxed iframes and some private modes throw on ACCESS, not just on write
 * (the pre-paint theme script guards the same way). A dropped write falls back
 * to an in-memory copy scoped to this page load, and get() prefers that copy —
 * so within the session a caller always reads back what it wrote (the session
 * keeps working: the token authorizes requests, the toggle shows the chosen
 * theme), and only PERSISTENCE across loads is lost — the correct behavior
 * when the user's browser refuses persistence. The fallback lives HERE so
 * every caller inherits it; no consumer re-implements it (2026-07-18, was
 * locale-only as `sessionLocale`).
 */

/** Keys whose most recent write failed to persist → their in-session value
 *  (null = removed). Empty whenever localStorage is accepting writes. */
const memoryFallback = new Map<string, string | null>();

export const storage = {
  get(key: string): string | null {
    if (typeof window === "undefined") return null;
    if (memoryFallback.has(key)) return memoryFallback.get(key) ?? null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
      memoryFallback.delete(key);
    } catch {
      // Quota / disabled storage — keep the value for THIS page load.
      memoryFallback.set(key, value);
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      memoryFallback.delete(key);
    } catch {
      // Same degradation as set(): reads see the removal in-session.
      memoryFallback.set(key, null);
    }
  },
  /**
   * Cross-tab change notification for one key — the native `storage` event
   * behind the same door (P5.2), so token/theme/locale changes made in another
   * tab propagate instead of leaving this tab stale. The event only fires when
   * localStorage actually changed in ANOTHER tab; same-tab writes notify
   * through each consumer's own listener set.
   */
  subscribe(key: string, listener: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (event: StorageEvent) => {
      // key === null means localStorage.clear() — every key may have changed.
      if (event.key === key || event.key === null) listener();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};
