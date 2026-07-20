/**
 * Auth domain types and DTO→view-model mappers.
 *
 * The DTO shapes below are READ from the AskBackend `identity` module
 * (`kz.ask.identity.api.dto.*`) — the data authority (D9, P9.4). They are never
 * invented or patched client-side; a mismatch is raised, not faked.
 *
 * Platform-neutral and DOM-free (D5): this file runs during SSR today and lifts
 * into a React Native package later. Mappers are pure functions (P5.1).
 */

// ── Request DTOs ────────────────────────────────────────────────────────────

/** POST /api/v1/auth/customer/register. `password` is 8–128 chars; the backend
 *  asserts `password === passwordConfirmation` and `acceptedUserAgreement`. */
export type CustomerRegisterRequest = {
  displayName?: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedUserAgreement: boolean;
  rememberMe?: boolean;
};

/** POST /api/v1/auth/login — unified password login (all roles). Returns a
 *  session directly, or a 2FA challenge (requiresTwoFactor + authChallengeId
 *  when the account has two-factor enabled). */
export type LoginRequest = {
  email: string;
  password: string;
};

/** POST /api/v1/auth/verify — the 6-digit code confirming a challenge. */
export type VerifyCodeRequest = {
  authChallengeId: string;
  code: string;
};

// ── Response DTOs ───────────────────────────────────────────────────────────

/** Issued by register / login-start. `code` is populated ONLY when the backend
 *  runs in verification test-mode; production omits it and emails the code. */
export type AuthChallengeResponse = {
  authChallengeId: string;
  role: string;
  purpose: string;
  channel: string;
  maskedDestination: string;
  expiresAt: string;
  code?: string;
};

export type AuthUserResponse = {
  userId: string;
  /** Nullable in the Java DTO — but app_user.display_name is NOT NULL in the
   *  backend schema, so in practice a stored user always has one (a nameless
   *  registration dies at verify; raised with backend, the form requires it). */
  displayName: string | null;
  email: string;
  status: string;
  // NOTE: no `phone` — the backend removed it from AppUser in V8 (identity locks).
};

export type AuthBusinessContextResponse = {
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  membershipId: string;
  memberRole: string;
};

export type RoleOption = {
  userId: string;
  role: string;
  displayName: string | null;
};

/** The full session contract. Only a subset is consumed by the V1 customer path
 *  (see api.ts); the password-login fields — requiresRoleSelection,
 *  availableRoles, requiresTwoFactor, activationRequired — are modelled for
 *  completeness and consumed when the seller/staff paths land (roadmap #7). */
export type AuthSessionResponse = {
  accessToken?: string | null;
  tokenType?: string;
  expiresAt?: string;
  remembered?: boolean;
  activationRequired?: boolean;
  role?: string;
  startRoute?: string;
  user?: AuthUserResponse;
  business?: AuthBusinessContextResponse;
  requiresRoleSelection?: boolean;
  availableRoles?: RoleOption[];
  allRoles?: string[];
  requiresTwoFactor?: boolean;
  authChallengeId?: string;
  /** Set after a new single-role signup — the trigger for the role-choosing
   *  modal ("start searching, or set up your business?"). */
  suggestRoleExpansion?: boolean;
};

// ── View model ──────────────────────────────────────────────────────────────

export type BusinessContext = {
  businessId: string;
  businessName: string;
  branchId: string;
  branchName: string;
  membershipId: string;
  memberRole: string;
};

type AuthUserBase = {
  userId: string;
  /** Nullable — mirrors the DTO; a user may have registered without a name. */
  displayName: string | null;
  email: string;
  status: string;
};

/**
 * The current user as a DISCRIMINATED UNION (P4.2) — never one type with
 * optional fields. A customer has no business context; business and staff do,
 * so `business` lives only on the roles that can ever have it.
 */
export type AuthUser =
  | ({ kind: "customer" } & AuthUserBase)
  | ({ kind: "business"; business: BusinessContext } & AuthUserBase)
  | ({ kind: "staff"; business: BusinessContext } & AuthUserBase);

export type AuthUserKind = AuthUser["kind"];

/**
 * Who may open the business Dashboard (the cabinet under /app/business). The ONE
 * source of truth for this rule (P6.2): the navigation menu gates the Dashboard
 * link with it, and the RequireDashboardAccess route guard gates the route with
 * it, so a customer-only session can never reach the cabinet — by link OR by
 * typing the URL. A null user (unauthenticated/still loading) is never a seller.
 */
export function canAccessDashboard(user: AuthUser | null): boolean {
  return user?.kind === "business" || user?.kind === "staff";
}

// ── Mappers (pure, P5.1) ────────────────────────────────────────────────────

/**
 * Map the backend role string to a view-model kind. The string arrives in two
 * forms — the session authority ("ROLE_CUSTOMER", "ROLE_BUSINESS_OWNER") from
 * verify/login, and the bare enum name ("CUSTOMER", "BUSINESS_WORKER") from
 * GET /session — so match on substring rather than exact value.
 *
 * Platform admin roles have no V1 surface (P9.1), so they never legitimately
 * reach this UI; an unrecognised role falls back to the least-privileged
 * customer view.
 */
export function roleToKind(role: string | undefined): AuthUserKind {
  const value = role ?? "";
  if (value.includes("WORKER")) return "staff";
  if (value.includes("OWNER") || value.includes("MANAGER")) return "business";
  return "customer";
}

function toBusinessContext(
  business: AuthBusinessContextResponse,
): BusinessContext {
  return {
    businessId: business.businessId,
    businessName: business.businessName,
    branchId: business.branchId,
    branchName: business.branchName,
    membershipId: business.membershipId,
    memberRole: business.memberRole,
  };
}

/**
 * Build the current-user view model from a session response. Returns null when
 * the response carries no user (e.g. an intermediate role-selection response,
 * which the customer path never produces).
 */
export function toAuthUser(session: AuthSessionResponse): AuthUser | null {
  const user = session.user;
  if (!user) return null;

  const base: AuthUserBase = {
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
  };

  const kind = roleToKind(session.role);
  // business/staff require a business context; if the backend omitted it, degrade
  // to the customer view rather than fabricate one (P9.4).
  if (kind !== "customer" && session.business) {
    return { kind, ...base, business: toBusinessContext(session.business) };
  }
  return { kind: "customer", ...base };
}

/** Map the backend's startRoute to a client route path. */
export function startRouteToPath(
  startRoute: string | undefined | null,
): string {
  switch (startRoute) {
    case "OWNER_BRANCHES":
    case "BRANCH_WORKSPACE":
      return "/app/business";
    case "CLIENT_SEARCH":
    default:
      return "/app";
  }
}
