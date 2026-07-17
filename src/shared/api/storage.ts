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
 * (the pre-paint theme script guards the same way). Every method degrades to
 * the no-preference path instead of crashing the caller: null read, dropped
 * write. The preference then simply does not persist — the correct behavior
 * when the user's browser refuses persistence.
 */
export const storage = {
  get(key: string): string | null {
    if (typeof window === "undefined") return null;
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
    } catch {
      // Quota / disabled storage — the preference just does not persist.
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Same degradation as set().
    }
  },
};
