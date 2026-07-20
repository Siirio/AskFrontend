"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { canAccessDashboard } from "../model";
import { useAuth } from "../hooks";
import { GuardFallback } from "./GuardFallback";

/**
 * The Dashboard gate (owner rule 1): a customer-only session MUST NOT open the
 * business cabinet. Mounted by /app/business's layout, it composes ON TOP of
 * RequireAuth (which the `(main)` layout already applies), so it only has to add
 * the role check — an unauthenticated visitor is redirected to login by the
 * parent before this ever renders the page.
 *
 * Access is decided by `canAccessDashboard` (model.ts) — the SAME predicate the
 * navigation menu uses to show/hide the Dashboard link, so link visibility and
 * route access can never disagree (P6.2).
 *
 * - authenticated + may access → render the cabinet.
 * - authenticated + customer-only → replace() to /app (Home). Never show the
 *   cabinet, not even for a frame.
 * - otherwise (loading, or the parent still resolving auth) → the fallback.
 */
export function RequireDashboardAccess({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const allowed = canAccessDashboard(user);

  useEffect(() => {
    if (status === "authenticated" && !allowed) router.replace("/app");
  }, [status, allowed, router]);

  if (status === "authenticated" && allowed) return <>{children}</>;
  return <GuardFallback />;
}
