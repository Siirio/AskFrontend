import { storage } from "./storage";

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
 * Web implementation, on the shared `storage` door (one server-guard, P6.2).
 * On the server there is no token storage — get() returns null and writes are
 * no-ops — which keeps httpClient callable from server and client code alike
 * (D7).
 */
export const tokenStorage: TokenStorage = {
  get: () => storage.get(ACCESS_TOKEN_STORAGE_KEY),
  set: (token) => storage.set(ACCESS_TOKEN_STORAGE_KEY, token),
  clear: () => storage.remove(ACCESS_TOKEN_STORAGE_KEY),
};
