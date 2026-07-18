import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AuthChallenge, AuthSession } from "../../shared/api/authClient";
import {
  changeTemporaryPassword,
  fetchCurrentSession,
  loginWithPassword,
  logout as clearSession,
  logoutRemote,
  registerCustomer,
  updateProfile as updateProfileRequest,
  verifyCode,
} from "../../shared/api/authClient";
import { ApiError } from "../../shared/api/httpClient";

export type AuthMode = "login" | "register";

const ACTIVE_BUSINESS_KEY = "ask.activeBusinessId";

interface AuthState {
  session: AuthSession | null;
  authenticated: boolean;
  challenge: AuthChallenge | null;
  busy: boolean;
  error: string;
  mode: AuthMode;
  requiresTwoFactor: boolean;
  twoFactorChallengeId: string | null;
  activationRequired: boolean;
  activeBusinessId: string | null;
}

interface AuthActions {
  setMode: (mode: AuthMode) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string; acceptedUserAgreement: boolean; locale: string }) => Promise<void>;
  verify: (code: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; email?: string; phone?: string }) => Promise<void>;
  clearError: () => void;
  backToLogin: () => void;
  activateStaffAccount: (newPassword: string, passwordConfirmation: string) => Promise<void>;
  selectBusiness: (businessId: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<{ state: AuthState; actions: AuthActions } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [activationRequired, setActivationRequired] = useState(false);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(
    () => window.localStorage.getItem(ACTIVE_BUSINESS_KEY),
  );

  useEffect(() => {
    if (!activeBusinessId && session?.businessMemberships?.length) {
      const firstBusinessId = session.businessMemberships[0].businessId;
      setActiveBusinessId(firstBusinessId);
      window.localStorage.setItem(ACTIVE_BUSINESS_KEY, firstBusinessId);
    }
  }, [session, activeBusinessId]);

  const acceptSession = useCallback((nextSession: AuthSession) => {
    setSession(nextSession);
    setChallenge(null);
    setRequiresTwoFactor(false);
    setTwoFactorChallengeId(null);
    setActivationRequired(Boolean(nextSession.activationRequired));
  }, []);

  useEffect(() => {
    fetchCurrentSession()
      .then(acceptSession)
      .catch(() => setSession(null));
  }, [acceptSession]);

  const login = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await loginWithPassword(email, password);
      if (result.requiresTwoFactor && result.authChallengeId) {
        setRequiresTwoFactor(true);
        setTwoFactorChallengeId(result.authChallengeId);
        return;
      }
      acceptSession(result);
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : t("auth.error.loginFailed"));
    } finally {
      setBusy(false);
    }
  }, [acceptSession, t]);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    displayName: string;
    acceptedUserAgreement: boolean;
    locale: string;
  }) => {
    setBusy(true);
    setError("");
    try {
      const result = await registerCustomer(
        data.displayName || data.email,
        data.email,
        data.password,
        data.acceptedUserAgreement,
        data.locale,
      );
      setChallenge(result);
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : t("auth.error.registerFailed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const verify = useCallback(async (code: string) => {
    if (!challenge) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      acceptSession(await verifyCode(challenge.authChallengeId, code));
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : t("auth.error.wrongCode"));
    } finally {
      setBusy(false);
    }
  }, [acceptSession, challenge, t]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    if (!twoFactorChallengeId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      acceptSession(await verifyCode(twoFactorChallengeId, code));
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : t("auth.error.wrongCode"));
    } finally {
      setBusy(false);
    }
  }, [acceptSession, t, twoFactorChallengeId]);

  const logout = useCallback(async () => {
    try {
      await logoutRemote();
    } catch {
      clearSession();
    }
    window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
    setSession(null);
    setChallenge(null);
    setError("");
    setRequiresTwoFactor(false);
    setTwoFactorChallengeId(null);
    setActivationRequired(false);
    setActiveBusinessId(null);
  }, []);

  const updateProfile = useCallback(async (
    data: { displayName?: string; email?: string; phone?: string },
  ) => {
    setBusy(true);
    setError("");
    try {
      const nextSession = await updateProfileRequest(data);
      setSession(current => current ? {
        ...current,
        user: nextSession.user ?? current.user,
        customerProfile: nextSession.customerProfile ?? current.customerProfile,
        businessMemberships: nextSession.businessMemberships ?? current.businessMemberships,
        platformMembership: nextSession.platformMembership ?? current.platformMembership,
      } : current);
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : t("auth.error.profileUpdateFailed"));
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [t]);

  const activateStaffAccount = useCallback(async (
    newPassword: string,
    passwordConfirmation: string,
  ) => {
    setBusy(true);
    setError("");
    try {
      acceptSession(await changeTemporaryPassword(newPassword, passwordConfirmation));
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : cause instanceof Error ? cause.message : t("auth.activation.error"));
    } finally {
      setBusy(false);
    }
  }, [acceptSession, t]);

  const backToLogin = useCallback(() => {
    setChallenge(null);
    setRequiresTwoFactor(false);
    setTwoFactorChallengeId(null);
    setActivationRequired(false);
    setError("");
  }, []);

  const selectBusiness = useCallback((businessId: string) => {
    setActiveBusinessId(businessId);
    window.localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
  }, []);

  const refreshSession = useCallback(async () => {
    acceptSession(await fetchCurrentSession());
  }, [acceptSession]);

  const state: AuthState = {
    session,
    authenticated: session !== null,
    challenge,
    busy,
    error,
    mode,
    requiresTwoFactor,
    twoFactorChallengeId,
    activationRequired,
    activeBusinessId,
  };

  const actions: AuthActions = {
    setMode,
    login,
    register,
    verify,
    verifyTwoFactor,
    logout,
    updateProfile,
    clearError: () => setError(""),
    backToLogin,
    activateStaffAccount,
    selectBusiness,
    refreshSession,
  };

  return <AuthContext.Provider value={{ state, actions }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
