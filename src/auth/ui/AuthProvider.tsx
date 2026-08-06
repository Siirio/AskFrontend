"use client";

import { useRef, type ReactNode } from "react";

import { AuthStoreContext, useSessionRestore } from "../hooks";
import { createAuthStore, type AuthStore } from "../store";

/**
 * Mounts the auth session store app-wide. DEFINED in this slice, MOUNTED by
 * app/providers (R6, P5.3) — it creates ONE store instance per provider (never
 * a module-scope singleton, D7). Being a client component that takes
 * `children` as props, it keeps those children server-rendered (§2 note).
 *
 * The session restore itself (the fetch, the cross-tab resync) lives in
 * `useSessionRestore` (hooks.ts) — this component only owns the store
 * instance and the context boundary (P1.2).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AuthStore | null>(null);
  if (storeRef.current === null) storeRef.current = createAuthStore();
  const store = storeRef.current;

  useSessionRestore(store);

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  );
}
