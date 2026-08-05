"use client";

/**
 * Auth orchestration (P1.2) — the session store context + the sign-up / log-in
 * flow hooks. Components consume these and render; they never call the API
 * directly.
 *
 * Auth state lives in a zustand store FACTORY (store.ts) consumed via a context
 * provider (D7): the `AuthStoreContext` and the `useAuth` consumer hook are
 * DEFINED here and exported through index.ts (R6); `app/providers` only mounts
 * `AuthProvider`. The store holds pure state; the token-storage and API side
 * effects are orchestrated here, keeping store.ts DOM-free (D5).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useStore } from "zustand";
import { useLocale, useTranslations } from "next-intl";

import { ApiError } from "@/shared/api/apiError";
import { storage } from "@/shared/api/storage";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { toast } from "@/shared/ui/sonner";

import * as api from "./api";
import {
  POST_AUTH_PATH,
  REGISTRATION_COUNTRY_CODE,
  toAuthUser,
  type AuthSessionResponse,
  type AuthUser,
} from "./model";
import type { AuthStatus, AuthStore } from "./store";

// ── Session store context (D7, R6) ──────────────────────────────────────────

/** Holds the per-provider store instance (created in AuthProvider). */
export const AuthStoreContext = createContext<AuthStore | null>(null);

function useAuthStoreApi(): AuthStore {
  const store = useContext(AuthStoreContext);
  if (!store) throw new Error("useAuth must be used within <AuthProvider>");
  return store;
}

// ── Pending role selection (survives navigation and reload) ─────────────────

/** Storage key marking an unanswered role choice after a fresh signup. Same
 *  pattern as the token: hooks (client) own the side effect via the shared
 *  storage door (P5.2), the store holds the render-facing copy, and the flag
 *  is cleared ONLY by an explicit choice or by the session ending — never by
 *  dismissal, which the modal does not offer. */
const PENDING_ROLE_SELECTION_KEY = "ask.roleSelectionPending";

export function readPendingRoleSelection(): boolean {
  return storage.get(PENDING_ROLE_SELECTION_KEY) === "1";
}

/**
 * The flag has TWO copies — storage (survives navigation and reload) and the
 * store (renders). They change together, through this one place (P6.2).
 */
export function persistPendingRoleSelection(
  store: AuthStore,
  pending: boolean,
) {
  if (pending) storage.set(PENDING_ROLE_SELECTION_KEY, "1");
  else storage.remove(PENDING_ROLE_SELECTION_KEY);
  store.getState().setPendingRoleSelection(pending);
}

/**
 * Persist a fresh session onto the store. Lives here rather than in store.ts
 * because it touches the storage helper (D5); shared by the flow hooks and the
 * provider's restore effect.
 *
 * **Every source carries a real token, `GET /session` included** (corrected
 * 2026-08-01 — this comment used to say `/session` returns null). It does not:
 * `AuthProcessor.currentSession` calls `jwtTokenService.issue(...)` on every
 * response. So the `accessToken` write below fires on each session RESTORE, not
 * only at sign-in — a rolling token refresh nobody designed. Benign, arguably
 * desirable, but it is a fact rather than an accident now; see `api.getSession`
 * and features/auth/contracts.md.
 */
export function applySessionTo(store: AuthStore, session: AuthSessionResponse) {
  if (session.accessToken) tokenStorage.set(session.accessToken);
  const user = toAuthUser(session);
  if (user) store.getState().setSession(user);
  else store.getState().clearSession();
}

function useApplySession() {
  const store = useAuthStoreApi();
  return useCallback(
    (session: AuthSessionResponse) => applySessionTo(store, session),
    [store],
  );
}

/** Public API — the whole app reads the session through this (R6). */
export type Auth = {
  status: AuthStatus;
  user: AuthUser | null;
  signOut: () => Promise<void>;
};

export function useAuth(): Auth {
  const store = useAuthStoreApi();
  const status = useStore(store, (s) => s.status);
  const user = useStore(store, (s) => s.user);

  const signOut = useCallback(async () => {
    // Invalidate OAuth work FIRST, before the async logout — a resolution during
    // the await must not re-apply the ending session.
    oauthGeneration += 1;
    oauthExchange = null;
    try {
      await api.logout();
    } catch {
      // Best effort — the local session is cleared regardless of the response.
    }
    tokenStorage.clear();
    persistPendingRoleSelection(store, false);
    store.getState().clearSession();
  }, [store]);

  return { status, user, signOut };
}

/**
 * Re-read the session from the backend and apply it.
 *
 * This exists for ONE event: something outside auth changed the user's role
 * SERVER-side, and the client's copy is now stale. Seller onboarding is the
 * case — `POST /business/onboarding` promotes a customer to BUSINESS_OWNER, and
 * until the session is re-read `canAccessDashboard` still says false, so the
 * cabinet the person just created bounces them straight back out.
 *
 * It lives in auth rather than in the calling slice because the session is
 * auth's to own (R6): a slice that patched the store itself would be inventing
 * a role the backend never confirmed (P9.4). Failure is the caller's to handle
 * — the store keeps the session it already had.
 *
 * **Returns void as of 2026-08-01; it used to return a route.** Refreshing a
 * session says nothing about where to go next — routing after onboarding is the
 * CALLER's decision (`business-cabinet`'s `POST_ONBOARDING_PATH`), and routing
 * after authentication is `POST_AUTH_PATH`. When this returned a route, the one
 * caller used it, and every new seller was silently sent to Home; worse, its
 * `/app/business` fallback only survived when THIS call threw, so the failure
 * path routed correctly and the success path did not. A refresh that also
 * answers "and now go here" is two responsibilities (P1.3); it is one now.
 */
export function useRefreshSession(): () => Promise<void> {
  const applySession = useApplySession();
  return useCallback(async () => {
    const session = await api.getSession();
    // applySession CLEARS the session when the response carries no user — a
    // token that stopped being valid mid-flow. A seller route is never
    // fabricated out of a dead session (P9.4); RequireAuth takes over.
    applySession(session);
  }, [applySession]);
}

/**
 * Drives the role-selection modal. `open` while a fresh signup's role choice
 * is unanswered AND the session is live; `resolve` records the answer — the
 * ONLY way the modal closes (it has no dismissal, by product decision).
 */
export function useRoleSelection() {
  const store = useAuthStoreApi();
  const pending = useStore(store, (s) => s.pendingRoleSelection);
  const status = useStore(store, (s) => s.status);

  const resolve = useCallback(() => {
    persistPendingRoleSelection(store, false);
  }, [store]);

  return { open: pending && status === "authenticated", resolve };
}

// ── Google OAuth callback ────────────────────────────────────────────────────

/** The transient state of the /oauth/callback page. */
export type OAuthCallbackState =
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "done"; targetPath: string };

// The in-flight Google OAuth exchange, cached at MODULE scope (not a component
// ref): a ref is per-instance, so a real unmount/remount — not just a StrictMode
// double-invoke — would fire a SECOND exchange against the single-use bridge
// cookie. It is CLEARED once the promise settles (below) and on sign-out, so a
// settled result never lingers to be replayed by a later revisit (e.g. browser-
// back after logout), and a transient failure can be retried by a fresh mount.
let oauthExchange: Promise<AuthSessionResponse> | null = null;
let oauthGeneration = 0; // bumped on sign-out to abandon in-flight exchanges

/**
 * Drives /oauth/callback: performs the ONE cookie→Bearer exchange
 * (`api.exchangeOAuthSession` → GET /session with the single-use ASK_SESSION
 * cookie), applies the session exactly like verify/login, and — for a
 * first-time Google sign-up, signalled by `?registration=1` on the callback
 * URL (`OAuth2AuthSuccessHandler`, backend 2026-07-30) — arms the persistent
 * role modal (the /app layout renders it once the page redirects there). The
 * exchange runs at most once: the cookie is single-use, so a StrictMode
 * re-invoke or a reload must not replay it against a cleared cookie. A
 * token-less response is never applied as a sign-in (P9.4) — it surfaces as
 * an inline error.
 */
export function useOAuthCallback(): OAuthCallbackState {
  const store = useAuthStoreApi();
  const applySession = useApplySession();
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, setState] = useState<OAuthCallbackState>({ status: "pending" });

  useEffect(() => {
    let active = true;
    const generation = oauthGeneration;
    // Reuse the single in-flight exchange across remounts (module-cached above),
    // but attach a FRESH active-guarded handler on every setup — so a StrictMode
    // remount (setup → cleanup → setup) or a dep change still resolves the UI
    // instead of the first, now-inactive handler being the only one and the page
    // hanging on the spinner.
    let exchange = oauthExchange;
    if (!exchange) {
      // Fire once; clear the module cache when it SETTLES, so a settled result
      // never lingers to be replayed by a later revisit (e.g. browser-back after
      // logout) and a transient failure can be retried by a fresh mount.
      exchange = api.exchangeOAuthSession().finally(() => {
        // evict only if the cache still holds THIS promise (never a newer one)
        if (oauthExchange === exchange) oauthExchange = null;
      });
      oauthExchange = exchange;
    }
    exchange
      .then(async (session) => {
        if (!active || generation !== oauthGeneration) return;
        // The exchange must yield a real Bearer session; a token-less response
        // is a failed sign-in, never applied as an empty success (P9.4).
        if (!session.accessToken || !toAuthUser(session)) {
          setState({ status: "error", message: t("oauth.failed") });
          return;
        }
        applySession(session);
        const isFirstSignup =
          new URLSearchParams(window.location.search).get("registration") ===
          "1";
        if (isFirstSignup) {
          persistPendingRoleSelection(store, true);
          // A Google sign-up IS a registration — `CustomOAuth2UserService`
          // creates the account when the email is unknown — so it accepts the
          // same two documents an email sign-up does. Honest only because
          // `OAuthOptions` now shows the consent copy beside the button
          // (2026-08-01); before that this call would have recorded agreement
          // to text the person was never shown, which is why it did not exist
          // and the gap was raised instead of faked (P9.4).
          //
          // AWAITED, like the verify step (corrected 2026-08-01 review). It was
          // fire-and-forget on the argument that a transient redirect page has
          // nothing to hold — but the redirect is what this `await` gates, and a
          // legal record must not race the navigation that ends its page. The
          // cost is the spinner already on screen staying a moment longer; the
          // benefit is that the write is either done or has toasted before the
          // user leaves. `recordRegistrationConsent` still never rejects, so
          // this cannot strand a valid account on the callback screen.
          await recordRegistrationConsent(locale, t);
          if (!active || generation !== oauthGeneration) return;
        }
        setState({ status: "done", targetPath: POST_AUTH_PATH });
      })
      .catch(() => {
        if (!active || generation !== oauthGeneration) return;
        setState({ status: "error", message: t("oauth.failed") });
      });

    return () => {
      active = false;
    };
  }, [applySession, store, t, locale]);

  return state;
}

// ── Auth flows ──────────────────────────────────────────────────────────────

/** What a completed verification hands back to the page. A pending role
 *  choice is NOT part of it — that is store+storage state (useRoleSelection),
 *  so it survives the navigation the page performs with this result. */
export type VerifyResult = {
  targetPath: string;
};

/** A pending email challenge awaiting its 6-digit code. */
export type Challenge = {
  verificationId: string;
  maskedDestination: string;
  /** The backend's `VerificationPurpose` — "REGISTER" for a sign-up, absent for
   *  the 2FA challenge login builds by hand. This is what tells the verify step
   *  whether it is completing a SIGN-UP (see ROLE_EXPANSION_PURPOSE). */
  purpose?: string;
};

/**
 * The challenge purpose that means "this person just created an account", and
 * therefore the one that arms the role-choosing modal.
 *
 * WHY THE CLIENT DECIDES THIS (2026-07-27, owner directive — an amendment to the
 * slice lock "the modal is triggered by suggestRoleExpansion, never invented
 * client-side"). The lock's intent was that the modal maps to REAL backend data
 * rather than a fabricated intent fork, and that intent is preserved: `purpose`
 * IS backend data, returned by `POST /auth/customer/register` and set from
 * `VerificationPurpose.REGISTER`.
 *
 * What changed is which real field carries it. `suggestRoleExpansion` was
 * declared on `AuthSessionResponse` and never assigned anywhere in the backend
 * — permanently null, so the modal the vision puts at UF 1 step 3 could not
 * appear at all, on any account. Surrounding extension was not available:
 * there is no other populated field that distinguishes a fresh sign-up, and
 * PRODUCT_VISION UF 1 makes the modal unconditional after registration rather
 * than conditional on a backend hint. The backend has since deleted the field
 * outright (2026-07-30) — Google OAuth's equivalent trigger is now the
 * `?registration=1` query param on the callback URL (see useOAuthCallback).
 */
const ROLE_EXPANSION_PURPOSE = "REGISTER";

/**
 * The documents the sign-up form visibly links to from its agreement checkbox —
 * and therefore the ONLY codes this client may record consent for. Sending a
 * code for text the user was never shown would be a worse defect than the
 * missing record it fixes (backend legal contract, P9.4).
 *
 * `SELLER_TERMS` / `PERSONAL_DATA_CONSENT` deliberately are NOT here: they
 * belong to seller onboarding's own completion step, which presents them.
 */
const REGISTRATION_LEGAL_DOCUMENT_CODES = ["USER_TERMS", "PRIVACY_POLICY"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

/** Backend error codes we can phrase precisely; everything else uses a fallback. */
const ERROR_KEY_BY_CODE: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: "errors.emailTaken",
  USER_NOT_FOUND: "errors.userNotFound",
  // Login-context code (verify failures are CHALLENGE_*, phrased by the
  // fallback key) — mapped to the credentials message so the table stays
  // correct even if a caller stops special-casing it before describeError.
  INVALID_CREDENTIALS: "errors.invalidCredentials",
  ACCOUNT_NOT_ACTIVE: "errors.accountNotActive",
  // A 400 from Spring bean validation — the REQUEST was malformed, not the
  // user's input. Mapped explicitly because the verify step's fallback is
  // "the code is invalid or expired", and letting a rejected request wear that
  // message is how the `verificationId` rename hid: the client sent a null id,
  // the backend answered VALIDATION_ERROR, and the screen blamed the person for
  // typing the code wrong. A contract fault must never read as a user fault.
  VALIDATION_ERROR: "errors.requestRejected",
};

type Translate = ReturnType<typeof useTranslations>;

function describeError(
  error: unknown,
  t: Translate,
  fallbackKey: string,
): string {
  if (error instanceof ApiError && error.errorCode) {
    const key = ERROR_KEY_BY_CODE[error.errorCode];
    if (key) return t(key);
  }
  return t(fallbackKey);
}

/**
 * Record the registration consent — the ONE place that knows WHICH documents a
 * registration accepts and how a failure is handled (P6.2).
 *
 * Two callers, both registration events: the email `REGISTER` verify challenge
 * and a first-time Google sign-up (`?registration=1`). Neither passes a
 * caller-type flag — the behaviour is identical, which is the whole reason it
 * is one function (P6.3).
 *
 * Best-effort by design: a failed record must never strand someone who now has
 * a valid account, so it is surfaced rather than thrown or swallowed. Only the
 * two codes the user was actually SHOWN are sent — `GET /legal/documents` has
 * no backend controller, so the active document set cannot be discovered, and
 * sending codes for unseen text would be a worse defect than the one this
 * closes (ROADMAP auth follow-up, P9.4).
 */
async function recordRegistrationConsent(locale: string, t: Translate) {
  try {
    await api.acceptRegistrationLegal({
      documentCodes: REGISTRATION_LEGAL_DOCUMENT_CODES,
      // Required by the backend, and its omission silently voided every consent
      // record until 2026-08-05 — see `AcceptRegistrationLegalRequest`.
      countryCode: REGISTRATION_COUNTRY_CODE,
      locale,
    });
  } catch {
    toast.error(t("errors.network"));
  }
}

/**
 * The shared verify step — the same for sign-up and log-in (same endpoint, same
 * validation, same outcome), so it lives in one place (P6.2), not behind a
 * caller-type flag (P6.3).
 */
export function useVerifyStep(verificationId: string, purpose?: string) {
  const store = useAuthStoreApi();
  const applySession = useApplySession();
  const t = useTranslations("auth");
  const locale = useLocale();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const submit = useCallback(
    async (codeOverride?: string) => {
      // CodeInput's onComplete fires synchronously with the just-completed
      // value, in the same tick as the setCode() that produced it — before
      // React has committed that state update. Reading `code` here in that path
      // would validate the PREVIOUS (5-digit) value and reject a code the
      // screen already shows as complete (found 2026-07-28). The override lets
      // the caller hand over the value it already has instead of waiting on
      // the closure to catch up.
      const value = codeOverride ?? code;
      setError(null);
      if (!CODE_RE.test(value)) {
        setError(t("errors.codeLength"));
        return;
      }
      setPending(true);
      try {
        const session = await api.verifyCode({ verificationId, code: value });
        applySession(session);
        // Arm the role-choosing modal BEFORE the page navigates to /app: the flag
        // lives in storage + store, so it survives the navigation (and a reload)
        // until the user actually answers.
        //
        // Fires for a SIGN-UP only. A log-in 2FA challenge runs this same step
        // (P6.2 — one implementation), and it carries no purpose because
        // useLoginFlow builds its Challenge by hand from the login response, so
        // signing in never re-opens a choice the person already made.
        if (purpose === ROLE_EXPANSION_PURPOSE) {
          persistPendingRoleSelection(store, true);
          // Record the registration consent HERE — the first moment a Bearer
          // token exists, and the moment the agreement was actually given
          // (moved from RoleSelectionModal 2026-08-01, closing two defects).
          //
          // The modal recorded it only on the CUSTOMER answer, so anyone who
          // chose "business" had their consent silently dropped for good — the
          // seller flow records SELLER_TERMS, never these two. And the modal
          // also opens for a first-time GOOGLE sign-up, which at the time
          // presented no agreement at all, so it was recording consent for
          // documents that person was never shown (P9.4). Both disappear by
          // binding the record to the email REGISTER challenge instead of to a
          // role answer: this consent belongs to registration, not to the role.
          // The Google path now presents its OWN consent copy and records from
          // `useOAuthCallback` (2026-08-01) — same function, same documents.
          await recordRegistrationConsent(locale, t);
        }
        setResult({ targetPath: POST_AUTH_PATH });
      } catch (e) {
        const message = describeError(e, t, "errors.codeInvalid");
        setError(message);
        toast.error(message);
      } finally {
        setPending(false);
      }
    },
    [verificationId, purpose, code, applySession, store, t],
  );

  return { code, setCode, error, pending, result, submit };
}

export type RegisterValues = {
  displayName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedUserAgreement: boolean;
};

type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

/** Sign-up: collect fields, validate, register → email challenge (P1.3 — form
 *  field state + validation is one responsibility). */
export function useRegisterFlow() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [values, setValues] = useState<RegisterValues>({
    displayName: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    acceptedUserAgreement: false,
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [pending, setPending] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const setField = useCallback(
    <K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) => {
      setValues((v) => ({ ...v, [key]: value }));
      // The mismatch error lives on passwordConfirmation but depends on BOTH
      // password fields — editing password must clear it too, or a stale
      // "don't match" survives the user fixing the password to agree.
      setErrors((e) => ({
        ...e,
        [key]: undefined,
        ...(key === "password" ? { passwordConfirmation: undefined } : null),
      }));
    },
    [],
  );

  const submit = useCallback(async () => {
    const next: RegisterErrors = {};
    // Required despite the DTO marking it optional: app_user.display_name is
    // NOT NULL in the backend schema, so a nameless registration always dies
    // at verify (DATA_CONFLICT). Raised with backend; relax when they fix it.
    if (!values.displayName.trim()) next.displayName = t("errors.nameRequired");
    if (!EMAIL_RE.test(values.email.trim()))
      next.email = t("errors.emailInvalid");
    if (values.password.length < 8) next.password = t("errors.passwordLength");
    if (values.passwordConfirmation !== values.password) {
      next.passwordConfirmation = t("errors.passwordMismatch");
    }
    if (!values.acceptedUserAgreement) {
      next.acceptedUserAgreement = t("errors.agreementRequired");
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const c = await api.registerCustomer({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
        // Sent so the account is not stamped with the backend's "ru" default —
        // the product's own default locale is `kk`. `acceptedUserAgreement` is
        // deliberately NOT sent: the field does not exist on the DTO, and the
        // consent is recorded properly after verify (see useVerifyStep).
        countryCode: REGISTRATION_COUNTRY_CODE,
        locale,
      });
      setChallenge({
        verificationId: c.verificationId,
        maskedDestination: c.maskedDestination,
        // Carried through to the verify step — "REGISTER" is what arms the
        // role-choosing modal once the code is confirmed.
        purpose: c.purpose,
      });
    } catch (e) {
      const message = describeError(e, t, "errors.network");
      if (e instanceof ApiError && e.status === 409) {
        setErrors((prev) => ({ ...prev, email: message }));
      }
      toast.error(message);
    } finally {
      setPending(false);
    }
  }, [values, t]);

  const reset = useCallback(() => setChallenge(null), []);

  return { values, setField, errors, pending, challenge, submit, reset };
}

type LoginErrors = { email?: string; password?: string };

/** Log-in: email + password → session (or a 2FA challenge when the account has
 *  two-factor enabled, which then runs the shared verify step). */
export function useLoginFlow() {
  const applySession = useApplySession();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const submit = useCallback(async () => {
    setFormError(null);
    const next: LoginErrors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t("errors.emailInvalid");
    if (!password) next.password = t("errors.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const session = await api.login({ email: email.trim(), password });
      if (session.requiresTwoFactor && session.verificationId) {
        // No `purpose`: this is a 2FA step on an EXISTING account, so the verify
        // step must not arm the role modal (see ROLE_EXPANSION_PURPOSE).
        setChallenge({
          verificationId: session.verificationId,
          maskedDestination: email.trim(),
        });
      } else {
        applySession(session);
        setResult({ targetPath: POST_AUTH_PATH });
      }
    } catch (e) {
      const message =
        e instanceof ApiError &&
        (e.status === 401 || e.errorCode === "INVALID_CREDENTIALS")
          ? t("errors.invalidCredentials")
          : describeError(e, t, "errors.network");
      setFormError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }, [email, password, applySession, t]);

  const reset = useCallback(() => {
    setChallenge(null);
    setErrors({});
    setFormError(null);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    formError,
    pending,
    challenge,
    result,
    submit,
    reset,
  };
}
