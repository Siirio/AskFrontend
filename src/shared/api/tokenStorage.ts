/**
 * Token access goes through this interface ONLY (P5.2) — components and slice
 * logic never touch localStorage directly. The interface swaps for a
 * SecureStore implementation when React Native arrives (D5).
 */
export interface TokenStorage {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

/** Cross-app contract (D6): the ONE storage key for the access token. */
export const ACCESS_TOKEN_STORAGE_KEY = "ask.accessToken";

/**
 * Web implementation. On the server there is no token storage — get() returns
 * null and writes are no-ops — which keeps httpClient callable from server and
 * client code alike (D7).
 */
export const tokenStorage: TokenStorage = {
  get() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  },
  set(token) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  },
};
