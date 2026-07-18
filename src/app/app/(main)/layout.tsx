import type { ReactNode } from "react";

import { NavigationMenu } from "@/app/_components/NavigationMenu";

/**
 * The nav-bearing shell for the main platform pages (everything under /app
 * except auth). The `(main)` route group adds no URL segment — `(main)/page.tsx`
 * is still `/app`. Auth pages sit OUTSIDE this group, so they render standalone
 * (no navigation menu) while still inheriting the LocaleProvider from the parent
 * platform layout. Server component (D7).
 *
 * RoleSelectionModal is NOT here: it follows the session, not a route, so it
 * mounts one level up in the platform layout — covering the auth routes this
 * group excludes (2026-07-18 review).
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <NavigationMenu />
      </header>
      {children}
    </>
  );
}
