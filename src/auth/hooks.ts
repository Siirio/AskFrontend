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
import { createContext, useCallback, useContext, useState } from "react";
import { useStore } from "zustand";
import { useTranslations } from "next-intl";

import { ApiError } from "@/shared/api/apiError";
import { storage } from "@/shared/api/storage";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { toast } from "@/shared/ui/sonner";

import * as api from "./api";
import {
  startRouteToPath,
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
 * Persist a fresh session onto the store. Verify/login carry a token; GET
 * /session returns null (the token is already stored). Lives here rather than
 * in store.ts because it touches the storage helper (D5); shared by the flow
 * hooks and the provider's restore effect.
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

// ── Auth flows ──────────────────────────────────────────────────────────────

/** What a completed verification hands back to the page. A pending role
 *  choice is NOT part of it — that is store+storage state (useRoleSelection),
 *  so it survives the navigation the page performs with this result. */
export type VerifyResult = {
  targetPath: string;
};

/** A pending email challenge awaiting its 6-digit code. */
export type Challenge = {
  authChallengeId: string;
  maskedDestination: string;
};

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
 * The shared verify step — the same for sign-up and log-in (same endpoint, same
 * validation, same outcome), so it lives in one place (P6.2), not behind a
 * caller-type flag (P6.3).
 */
export function useVerifyStep(authChallengeId: string) {
  const store = useAuthStoreApi();
  const applySession = useApplySession();
  const t = useTranslations("auth");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    if (!CODE_RE.test(code)) {
      setError(t("errors.codeLength"));
      return;
    }
    setPending(true);
    try {
      const session = await api.verifyCode({ authChallengeId, code });
      applySession(session);
      if (session.suggestRoleExpansion) {
        // Arm the role-choosing modal BEFORE the page navigates to /app: the
        // flag lives in storage + store, so it survives the navigation (and a
        // reload) until the user actually answers.
        persistPendingRoleSelection(store, true);
      }
      setResult({ targetPath: startRouteToPath(session.startRoute) });
    } catch (e) {
      const message = describeError(e, t, "errors.codeInvalid");
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }, [authChallengeId, code, applySession, store, t]);

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
        acceptedUserAgreement: values.acceptedUserAgreement,
      });
      setChallenge({
        authChallengeId: c.authChallengeId,
        maskedDestination: c.maskedDestination,
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
      if (session.requiresTwoFactor && session.authChallengeId) {
        setChallenge({
          authChallengeId: session.authChallengeId,
          maskedDestination: email.trim(),
        });
      } else if (session.requiresRoleSelection) {
        // Multi-role account: the backend answered with the role-selection
        // step (no user, no token). /auth/select-role is deferred to the
        // seller/staff paths (roadmap #7), so this surfaces as an explicit
        // error — never an empty session applied as if sign-in succeeded.
        const message = t("errors.roleSelection");
        setFormError(message);
        toast.error(message);
      } else {
        applySession(session);
        setResult({ targetPath: startRouteToPath(session.startRoute) });
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
