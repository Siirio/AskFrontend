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
 *  session directly, or a 2FA challenge (requiresTwoFactor + verificationId
 *  when the account has two-factor enabled). */
export type LoginRequest = {
  email: string;
  password: string;
};

/** POST /api/v1/auth/verify — the 6-digit code confirming a challenge.
 *
 *  ⚠ **THIS CLIENT TARGETS THE BACKEND'S `dev` BRANCH** (owner decision
 *  2026-07-27). The two backend branches disagree, and this field is the
 *  sharpest edge of it:
 *
 *    dev    (our target)             → `verificationId`   ← what this matches
 *    master (what :2020 runs TODAY)  → `authChallengeId`
 *
 *  Both were verified by probing the running server, not by reading a checkout:
 *  against the CURRENT :2020 build, a body with `verification_id` returns
 *  `400 VALIDATION_ERROR` naming `authChallengeId`, while `auth_challenge_id`
 *  returns a real session. So **verify is expected to fail locally until the
 *  backend redeploys from `dev`** — that failure is the branch gap, not a bug
 *  here, and it now surfaces as its own message rather than "wrong code"
 *  (ERROR_KEY_BY_CODE → VALIDATION_ERROR in hooks.ts).
 *
 *  The trap to remember: the local `../Ask_Backend` checkout sits on `dev`, so
 *  the source tree and the running server tell DIFFERENT stories. Neither one
 *  alone is authority — the source says where we are going, the running server
 *  says what works right now. Check both before changing a field name. */
export type VerifyCodeRequest = {
  verificationId: string;
  code: string;
};

// ── Response DTOs ───────────────────────────────────────────────────────────

/** Issued by register / login-start (the backend's `VerificationResponse`).
 *  `code` is populated ONLY when the backend runs in verification test-mode;
 *  production omits it and emails the code. */
export type AuthChallengeResponse = {
  verificationId: string;
  role: string;
  /** `VerificationPurpose` — LOGIN · REGISTER · EMAIL_CHANGE. Load-bearing: a
   *  REGISTER challenge is what arms the role-choosing modal (see hooks.ts). */
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
  /** The 2FA challenge id — same master/dev split as VerifyCodeRequest above. */
  verificationId?: string;
  /**
   * Intended as the backend's "this account could also be a seller" signal, and
   * the documented trigger for the role-choosing modal.
   *
   * **Never assigned on EITHER branch** — verified 2026-07-27: `git grep
   * suggestRoleExpansion master` finds nothing at all, and on `dev` the field is
   * declared on `AuthSessionResponse` with no `.suggestRoleExpansion(...)`
   * builder call anywhere. So it is always null, and a modal gated on it alone
   * could never open — which is exactly what shipped. Raised with backend
   * (ROADMAP cross-repo table).
   *
   * Unlike the id rename, this diagnosis was NOT branch-dependent, so the fix
   * built on it stands: the modal now arms on the challenge's `purpose`, which
   * the live server does return (`"purpose":"REGISTER"`, confirmed by probing
   * it). This field is still read and still wins when it arrives.
   */
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
 * Map a role string to a view-model kind. Matches by substring since the
 * backend uses different casings/forms across values ("ROLE_BUSINESS_OWNER",
 * "OWNER", "BUSINESS_WORKER").
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
 *
 * `session.role`/`startRoute` stay neutral ("CUSTOMER"/`CLIENT_SEARCH`) on
 * every login, even for a business owner — the backend's account-level role
 * never reflects business membership (identity contracts.md). The kind is
 * derived from `session.business.memberRole` instead, which IS populated
 * whenever the account owns or works at a business; no `business` context
 * means no business capability, so `roleToKind` is only consulted once that
 * context exists.
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

  if (session.business) {
    const kind = roleToKind(session.business.memberRole);
    if (kind !== "customer") {
      return { kind, ...base, business: toBusinessContext(session.business) };
    }
  }
  return { kind: "customer", ...base };
}

// ── Password strength (pure, P5.1) ──────────────────────────────────────────

/**
 * How strong a password reads, for the sign-up meter (owner request 2026-07-27,
 * adopting neumorui's PasswordInput strength bar).
 *
 * This is a WRITING AID, never a gate: the only rule that can block a sign-up is
 * the backend's own 8–128 length bound, which `useRegisterFlow` already enforces.
 * A meter that refuses a password the server would accept invents policy the data
 * authority never stated (P9.4), so `level` exists to be shown and nothing reads
 * it to decide anything.
 *
 * Five independent checks rather than an entropy estimate: an estimate has to be
 * explained, and this has to be understood at a glance while typing. Length is
 * counted twice on purpose — it is the one property that actually dominates
 * offline-guessing cost, so "just make it longer" is a route to `strong` without
 * memorising a symbol.
 */
export type PasswordStrengthLevel = "weak" | "medium" | "strong";

export type PasswordStrength = {
  /** Satisfied checks, 0–5. The bar's width is this out of 5. */
  score: number;
  /** null for an empty password — nothing typed is not "weak", it is nothing. */
  level: PasswordStrengthLevel | null;
};

const STRENGTH_CHECKS: ((value: string) => boolean)[] = [
  (v) => v.length >= 8,
  (v) => v.length >= 12,
  (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  (v) => /\d/.test(v),
  (v) => /[^A-Za-z0-9]/.test(v),
];

export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, level: null };
  const score = STRENGTH_CHECKS.reduce(
    (total, check) => total + (check(value) ? 1 : 0),
    0,
  );
  const level: PasswordStrengthLevel =
    score >= 5 ? "strong" : score >= 3 ? "medium" : "weak";
  return { score, level };
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
