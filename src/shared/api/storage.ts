/**
 * The ONE browser key-value door (P5.2): components and slice logic never call
 * `localStorage` directly — persistent flags go through this helper (and the
 * token through `tokenStorage`, which is built on it). On the server every read
 * is null and every write a no-op, so callers stay importable from code that
 * renders during SSR (D7); the implementation swaps for a native one when
 * React Native arrives (D5). Keys stay with their owners — this module knows
 * no key names and no business meaning.
 */
export const storage = {
  get(key: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  set(key: string, value: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};
