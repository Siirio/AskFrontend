/**
 * Auth — the slice's PUBLIC API (R2). The foundation slice: any slice may import
 * `@/auth`; auth imports no other slice (R6), so the one sanctioned hub stays
 * cycle-free. Named re-exports only — no `export *` (architecture §3).
 */
export { LoginPage } from "./ui/LoginPage";
export { RegisterPage } from "./ui/RegisterPage";
export { OAuthCallbackPage } from "./ui/OAuthCallbackPage";
export { AuthProvider } from "./ui/AuthProvider";
export { RoleSelectionModal } from "./ui/RoleSelectionModal";
export { RequireAuth } from "./ui/RequireAuth";
export { RequireDashboardAccess } from "./ui/RequireDashboardAccess";
export { useAuth, type Auth } from "./hooks";
export { canAccessDashboard, type AuthUser } from "./model";
