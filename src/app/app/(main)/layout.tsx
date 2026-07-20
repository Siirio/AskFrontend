import type { ReactNode } from "react";

import { RequireAuth } from "@/auth";
import { NavigationMenu } from "@/app/_components/NavigationMenu";

/**
 * The nav-bearing shell for the main platform pages (everything under /app
 * except auth). The `(main)` route group adds no URL segment — `(main)/page.tsx`
 * is still `/app`. Auth pages sit OUTSIDE this group, so they render standalone
 * (no navigation menu) while still inheriting the LocaleProvider from the parent
 * platform layout. Server component (D7).
 *
 * RequireAuth gates this whole group (owner rule 2): a logged-out visitor is
 * redirected to /app/auth/login and never sees the nav or a page. The auth pages
 * are exempt precisely because they sit OUTSIDE `(main)` — the route-group
 * boundary IS the "gated platform vs. sign-in entry" line, so no per-URL
 * allowlist is needed. The check is client-side because the token lives in
 * localStorage, not a cookie (see RequireAuth). Everything inside the guard —
 * the nav included — mounts only for an authenticated session, so the menu never
 * needs a signed-out state (owner rule 4).
 *
 * NavigationMenu renders its own `<header>` landmark (the sticky bar), so this
 * layout only places it above the page content — no wrapping header, which would
 * nest two banner landmarks.
 *
 * RoleSelectionModal is NOT here: it follows the session, not a route, so it
 * mounts one level up in the platform layout — covering the auth routes this
 * group excludes (2026-07-18 review).
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <NavigationMenu />
      {children}
    </RequireAuth>
  );
}
