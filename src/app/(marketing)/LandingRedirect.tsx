"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { tokenStorage } from "@/shared/api/tokenStorage";

/**
 * D6 / owner rule 5: the landing is the route that lets a visitor sign in AND
 * carries a logged-in visitor back to the platform. This island does the
 * "return": on mount it checks for a stored session token and, if present,
 * replaces the URL with /app — so a signed-in user hitting `/` lands on the
 * platform, not the marketing page.
 *
 * `?from=app` suppresses it — that is the deliberate "show me the landing" path
 * (the account menu's "About ASK" link uses it), so a signed-in user can still
 * read the marketing/legal pages without being bounced.
 *
 * Two D6 constraints are respected: it reads the token, not a cookie (the
 * landing stays static — it never reads a cookie), and it uses
 * `window.location.search` inside an effect rather than `useSearchParams`, which
 * would opt `/` out of static rendering (the D6 lock, enforced by
 * scripts/check-rendering.mjs). It renders nothing.
 */
export function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "app") return;
    if (tokenStorage.get()) router.replace("/app");
  }, [router]);

  return null;
}
