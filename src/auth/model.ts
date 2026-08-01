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

/**
 * POST /api/v1/auth/customer/register. `password` is 8–128 chars; the backend
 * asserts `password === passwordConfirmation` (`@AssertTrue passwordsMatch`).
 *
 * **`acceptedUserAgreement` was REMOVED from this type on 2026-08-01.** It is not
 * a field on `CustomerRegisterRequest` — Spring ignores unknown JSON properties,
 * so it had been posted and silently discarded since the backend dropped it. The
 * checkbox stays on the form as a client-side gate (P9.4 — no sign-up passes
 * without agreeing); the actual consent RECORD is written after verify, against
 * `POST /legal/registration-acceptances` (see hooks.ts `useVerifyStep`).
 *
 * `countryCode` and `locale` default to "KZ"/"ru" server-side. Sending the real
 * locale matters: it is stored on the account and the default would mark every
 * Kazakh- and English-speaking sign-up as Russian, in a product whose own default
 * locale is `kk`.
 */
export type CustomerRegisterRequest = {
  displayName?: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  countryCode: string;
  locale: string;
};

/**
 * The country every ASK account is registered in today.
 *
 * `business-cabinet` declares its own copy for seller onboarding. That is a
 * deliberate duplicate, not an oversight: R6 forbids `auth` — the foundation
 * slice — from importing any slice, so it cannot read that one, and promoting a
 * two-character country code to `shared/` would put a business fact in the
 * toolbox (§5). Same value, two owners, and they are free to diverge the day
 * customer sign-up and seller registration stop sharing a market (gate G4).
 */
export const REGISTRATION_COUNTRY_CODE = "KZ";

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
  phone: string | null;
  status: string;
};

export type AuthBusinessContextResponse = {
  businessId: string;
  businessName: string;
  businessCategoryId: string | null;
  businessCategoryName: string | null;
  businessScope: string | null;
  branchId: string;
  branchName: string;
  membershipId: string;
  memberRole: string;
};

/** `AuthCustomerProfileResponse` — whether the customer surface is enabled. */
export type AuthCustomerProfileResponse = { isEnabled?: boolean };

/** `AuthBusinessMembershipResponse` — ONE of the user's business memberships.
 *  `business` above is the single ACTIVE context; this is the full list. */
export type AuthBusinessMembershipResponse = {
  membershipId: string;
  businessId: string;
  businessName: string;
  role: string;
  branchIds: string[];
};

/** `AuthPlatformMembershipResponse` — staff/admin membership. Platform roles
 *  have no V1 surface (P9.1); modelled so the contract is complete, not built on. */
export type AuthPlatformMembershipResponse = {
  role?: string;
  permissions?: string[];
};

/**
 * The full session contract — and as of 2026-08-01 it is actually full.
 *
 * This type is a MIRROR of `AuthSessionResponse` on the wire, deliberately, and
 * P8.3 permits the unconsumed fields: a contract you only half-model is one you
 * cannot check a response against. It had drifted into claiming completeness
 * while missing five fields — `expiresIn` plus the four the backend's
 * `SessionCapabilitiesProcessor` populates on every response.
 *
 * Consumed in V1: `accessToken`, `role`, `user`, `business`,
 * `requiresTwoFactor`, `verificationId`. (`startRoute` is modelled but NOT
 * consumed — every session lands on `POST_AUTH_PATH`.) Everything else is
 * contract surface awaiting the seller/staff paths (roadmap #6, the business
 * cabinet) or a security-settings screen
 * that does not exist yet — do not build UI on a field just because it is here
 * (P9.1).
 */
export type AuthSessionResponse = {
  /** ⚠ NOT null on a Bearer `GET /session` — see `api.ts getSession`. The
   *  backend re-issues a token on every session read. */
  accessToken?: string | null;
  tokenType?: string;
  /** Absolute expiry. `expiresIn` is the same instant as a duration; the
   *  backend sends BOTH and this client currently reads neither. */
  expiresAt?: string;
  /** Token lifetime in SECONDS, recomputed per response. */
  expiresIn?: number;
  isRemembered?: boolean;
  isActivationRequired?: boolean;
  role?: string;
  startRoute?: string;
  user?: AuthUserResponse;
  business?: AuthBusinessContextResponse;
  allRoles?: string[];
  requiresTwoFactor?: boolean;
  /** Whether the account currently has 2FA enabled — sent on every session
   *  response (added by the backend 2026-07-30). Not yet consumed anywhere
   *  (no security-settings screen exists in V1). */
  isTwoFactorEnabled?: boolean;
  /** The 2FA challenge id — same master/dev split as VerifyCodeRequest above. */
  verificationId?: string;
  customerProfile?: AuthCustomerProfileResponse;
  businessMemberships?: AuthBusinessMembershipResponse[];
  platformMembership?: AuthPlatformMembershipResponse;
  pendingInvitationsCount?: number;
};

// ── View model ──────────────────────────────────────────────────────────────

export type BusinessContext = {
  businessId: string;
  businessName: string;
  businessCategoryId: string | null;
  businessCategoryName: string | null;
  businessScope: string | null;
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
 * Map a business membership role to a view-model kind.
 *
 * EXACT matching against the backend's own enum
 * (`kz.ask.identity.authorization.domain.enums.Role`), tolerating the `ROLE_`
 * authority prefix that verify returns and `GET /session` does not. It used to
 * substring-match — `value.includes("OWNER")` — which is loose in both
 * directions: it would classify a hypothetical `DISOWNED` as a business role,
 * and it hid the fact that the unknown case is a real decision rather than a
 * fallthrough.
 *
 * `null` means "this is not a role we know how to render". The caller decides
 * what to do with that; it is deliberately NOT collapsed to `customer` here,
 * because those two answers mean different things and only one of them is a
 * mismatch worth reporting.
 *
 * The platform roles (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`) are in the SAME Java
 * enum that types `BusinessMember.role`, so nothing on the wire prevents one
 * appearing here. They have no V1 surface (P9.1) and are intentionally absent
 * from this map — they are unknown to this UI, which is the honest answer.
 */
const KIND_BY_MEMBER_ROLE: Record<string, AuthUserKind> = {
  OWNER: "business",
  MANAGER: "business",
  WORKER: "staff",
  CUSTOMER: "customer",
};

export function roleToKind(role: string | undefined): AuthUserKind | null {
  if (!role) return null;
  const normalized = role
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
  return KIND_BY_MEMBER_ROLE[normalized] ?? null;
}

function toBusinessContext(
  business: AuthBusinessContextResponse,
): BusinessContext {
  return {
    businessId: business.businessId,
    businessName: business.businessName,
    businessCategoryId: business.businessCategoryId,
    businessCategoryName: business.businessCategoryName,
    businessScope: business.businessScope,
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
    if (kind === "business" || kind === "staff") {
      return { kind, ...base, business: toBusinessContext(session.business) };
    }
    // kind === null → a membership role this client does not understand, or
    // "customer" → a membership that grants nothing. Both fall through to the
    // least-privileged view, which is the safe default; the FIRST of the two is
    // a contract mismatch and callers can detect it with `hasUnknownMemberRole`
    // rather than having to re-derive it (P9.4).
  }
  return { kind: "customer", ...base };
}

/**
 * True when the session carries a business context whose `memberRole` this
 * client cannot map — the session stays usable (degraded to `customer`), but
 * the person would be missing every business capability they actually hold.
 *
 * **Nothing reports this today, deliberately.** The backend's business-group
 * roles are exactly OWNER / MANAGER / WORKER and all three map, so the condition
 * cannot currently fire; wiring an alert for it would be building ahead of need
 * (P8.2). This exists so that IF a fourth role ever ships, the condition is
 * already nameable and testable rather than an accident of string matching —
 * surfacing it is then a few lines in a client component (`model.ts` is pure and
 * DOM-free per D5, so the message cannot live here).
 */
export function hasUnknownMemberRole(session: AuthSessionResponse): boolean {
  const business = session.business;
  if (!business) return false;
  return roleToKind(business.memberRole) === null;
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

/**
 * Where a session lands after authentication: **Home, always** — login, verify
 * and the OAuth callback alike. This is PRODUCT_VISION UF 1 step 3 ("Home +
 * Role Choosing Modal"), not a fallback: every role starts at the search entry,
 * and a seller reaches the cabinet from the nav's Dashboard link (gated by
 * `canAccessDashboard`, below).
 *
 * A constant rather than a mapper, corrected 2026-08-01. This used to be
 * `startRouteToPath(session.startRoute)`, a switch with `OWNER_BRANCHES` /
 * `BRANCH_WORKSPACE` branches the backend cannot emit —
 * `AuthProcessor.resolveStartRoute()` and `LoginProcessor.resolveStartRoute()`
 * both `return "CLIENT_SEARCH"`. Those branches were read as a backend gap and
 * kept "until the contract is restored"; they were never a gap. The backend is
 * implementing the vision. Branching on a field with one value only made the
 * design look uncertain — and cost an audit pass that filed a cross-repo
 * dependency which does not exist. `startRoute` stays on `AuthSessionResponse`
 * (it is on the wire), but nothing branches on it.
 *
 * Registration is the one flow that lands elsewhere, and it is not this rule:
 * completing seller onboarding goes to the cabinet (D26 — see
 * `business-cabinet`'s `POST_ONBOARDING_PATH`).
 */
export const POST_AUTH_PATH = "/app";
