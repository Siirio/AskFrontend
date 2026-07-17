"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { ApiError } from "@/shared/api/apiError";
import { tokenStorage } from "@/shared/api/tokenStorage";

import * as api from "../api";
import {
  AuthStoreContext,
  applySessionTo,
  persistPendingRoleSelection,
  readPendingRoleSelection,
} from "../hooks";
import { createAuthStore, type AuthStore } from "../store";

/**
 * Mounts the auth session store app-wide. DEFINED in this slice, MOUNTED by
 * app/providers (R6, P5.3) — it creates ONE store instance per provider (never
 * a module-scope singleton, D7) and restores the session on load from the
 * stored Bearer token (ask.accessToken, D6). Being a client component that
 * takes `children` as props, it keeps those children server-rendered (§2 note).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AuthStore | null>(null);
  if (storeRef.current === null) storeRef.current = createAuthStore();
  const store = storeRef.current;

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      // No session → any unanswered role choice belongs to a session that no
      // longer exists; drop it with the session.
      persistPendingRoleSelection(store, false);
      store.getState().clearSession();
      return;
    }
    // An unanswered role choice (fresh signup) survives navigation AND reload:
    // seed the store's copy from storage before the session restores.
    store.getState().setPendingRoleSelection(readPendingRoleSelection());
    let active = true;
    api
      .getSession()
      .then((session) => {
        if (active) applySessionTo(store, session);
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Only the backend REJECTING the token (401/403) invalidates it. A
        // network failure or a server error says nothing about the token —
        // keep it so the next load retries; this session renders signed out.
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          tokenStorage.clear();
          persistPendingRoleSelection(store, false);
        }
        store.getState().clearSession();
      });
    return () => {
      active = false;
    };
  }, [store]);

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  );
}
