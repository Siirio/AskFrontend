import type { ReactNode } from "react";

import { RoleSelectionModal } from "@/auth";
import { NavigationMenu } from "@/app/_components/NavigationMenu";

/**
 * The nav-bearing shell for the main platform pages (everything under /app
 * except auth). The `(main)` route group adds no URL segment — `(main)/page.tsx`
 * is still `/app`. Auth pages sit OUTSIDE this group, so they render standalone
 * (no navigation menu) while still inheriting the LocaleProvider from the parent
 * platform layout. Server component (D7).
 *
 * RoleSelectionModal is mounted HERE — not on a page — because it follows the
 * session, not a route: a fresh signup's unanswered role choice must stay on
 * screen across the navigation to /app and across reloads until it is answered
 * (its open state lives in the auth store, seeded from storage).
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <NavigationMenu />
      </header>
      {children}
      <RoleSelectionModal />
    </>
  );
}
