import type { ReactNode } from "react";

import { RequireDashboardAccess } from "@/auth";

/**
 * Gate for the business cabinet (/app/business, owner rule 1): only a
 * business/staff session may open the Dashboard. Nested inside the `(main)`
 * layout's RequireAuth, so a logged-out visitor is already handled — this layer
 * only adds the role check, sending a customer-only session back to /app.
 *
 * Server component (D7): RequireDashboardAccess is the client island that reads
 * the live session; the route content passed as `children` stays server-rendered
 * (§2 provider note). When the business-cabinet slice lands (roadmap #7) it keeps
 * this guard — access control is the app composition root's to place (R3).
 */
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return <RequireDashboardAccess>{children}</RequireDashboardAccess>;
}
