import { createStore } from "zustand/vanilla";

import type { AuthUser } from "./model";

/**
 * The auth session store — a zustand FACTORY consumed via a context provider
 * (D7), never a module-scope singleton (which would leak state across SSR
 * requests). `AuthProvider` creates one instance and puts it in context; every
 * slice reads it through `useAuth` (R6).
 *
 * Pure state + state-mutating actions only. No DOM, no browser APIs, no fetch
 * (D5 lock) — token storage and the API calls are orchestrated in hooks.ts,
 * which composes this store with `api.ts` and the shared storage helpers.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  /** A fresh signup's role choice is still unanswered (armed by a
   *  REGISTER-purpose verify, or a Google OAuth callback's `?registration=1`).
   *  Mirrored to localStorage by hooks.ts so it survives navigation and
   *  reload; this store field is the render-facing copy. */
  pendingRoleSelection: boolean;
  /** Move to authenticated with the given user. */
  setSession: (user: AuthUser) => void;
  /** Move to unauthenticated and drop the user. */
  clearSession: () => void;
  setPendingRoleSelection: (pending: boolean) => void;
};

export function createAuthStore() {
  return createStore<AuthState>((set) => ({
    status: "loading",
    user: null,
    pendingRoleSelection: false,
    setSession: (user) => set({ status: "authenticated", user }),
    clearSession: () => set({ status: "unauthenticated", user: null }),
    setPendingRoleSelection: (pending) =>
      set({ pendingRoleSelection: pending }),
  }));
}

export type AuthStore = ReturnType<typeof createAuthStore>;
