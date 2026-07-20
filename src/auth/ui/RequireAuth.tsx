"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../hooks";
import { GuardFallback } from "./GuardFallback";

/**
 * The platform gate (PRODUCT_VISION UF 1; owner rule 2): a logged-out visitor
 * MUST NOT enter the platform. Mounted by the `(main)` route group's layout, so
 * it wraps every /app/* page EXCEPT the auth pages — those sit outside `(main)`
 * and stay reachable logged-out, which is the one sanctioned exception (you
 * cannot require a session to reach the sign-in screen).
 *
 * The check is CLIENT-SIDE by necessity: the session token lives in localStorage
 * (`ask.accessToken`, token lock), not a cookie, so the server/middleware cannot
 * see it — a server guard waits on the Phase 4 httpOnly-cookie migration. Until
 * then the flow is: server renders the page, AuthProvider restores the session on
 * mount, and this guard reveals the page only once the session is confirmed.
 *
 * - loading → the fallback (a spinner). NEVER redirect here: redirecting before
 *   the restore settles would bounce an authenticated user to login on every load.
 * - unauthenticated → replace() to the login page (replace, not push, so Back
 *   does not return to the gated URL and loop).
 * - authenticated → render the page.
 *
 * Post-login the backend's startRoute decides where the user lands (not a
 * captured return URL) — the vision defines no deep-link-return, so none is
 * invented (P9.1, YAGNI).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/app/auth/login");
  }, [status, router]);

  if (status === "authenticated") return <>{children}</>;
  return <GuardFallback />;
}
