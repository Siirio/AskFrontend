import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { AuthSession, AuthChallenge, RoleOption } from "../../shared/api/authClient";
import { loginWithPassword, selectRole as selectRoleApi, switchRole as switchRoleApi, registerCustomer, registerBusiness, fetchEmailInfo, verifyCode, resolveCity, logout as clearSession, logoutRemote, updateProfile as updateProfileRequest, changeTemporaryPassword } from "../../shared/api/authClient";
import { ApiError } from "../../shared/api/httpClient";
import { reverseGeocodeCity } from "../../shared/geo/reverseGeocode";
import { ROUTES } from "../routes";

export type AppView = "auth" | "customer" | "business" | "staff";
export type AuthMode = "login" | "register";

const SESSION_KEY = "ask.session";
const BUSINESS_ID_KEY = "ask.businessId";

function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(session: AuthSession | null) {
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

function resolveView(session: AuthSession): AppView {
  const role = (session.role || "").toUpperCase();
  if (role === "BUSINESS_MANAGER" || role === "BUSINESS_WORKER") return "staff";
  if (role.includes("STAFF")) return "staff";
  if (role.includes("BUSINESS") || role.includes("OWNER")) return "business";
  return "customer";
}

function hasBusinessRole(accounts: { role: string }[]) {
  return accounts.some(a =>
    a.role === "BUSINESS_OWNER" || a.role === "BUSINESS_MANAGER" || a.role === "BUSINESS_WORKER"
  );
}

function hasCustomerRole(accounts: { role: string }[]) {
  return accounts.some(a => a.role === "CUSTOMER");
}

interface AuthState {
  session: AuthSession | null;
  view: AppView;
  challenge: AuthChallenge | null;
  busy: boolean;
  error: string;
  mode: AuthMode;
  requiresRoleSelection: boolean;
  availableRoles: RoleOption[];
  requiresTwoFactor: boolean;
  twoFactorChallengeId: string | null;
  loginEmail: string;
  loginPassword: string;
  suggestRoleExpansion: boolean;
  registeredEmail: string;
  registeredPassword: string;
  activationRequired: boolean;
}

interface AuthActions {
  setMode: (m: AuthMode) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string }) => Promise<void>;
  selectRole: (role: string) => Promise<void>;
  verify: (code: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  switchRole: (targetRole: string) => Promise<void>;
  expandRole: () => Promise<void>;
  skipRoleExpansion: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; email?: string; phone?: string }) => Promise<void>;
  clearError: () => void;
  backToLogin: () => void;
  activateStaffAccount: (newPassword: string, passwordConfirmation: string) => Promise<void>;
}

const AuthContext = createContext<{ state: AuthState; actions: AuthActions } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initialSession = readSession();
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [view, setView] = useState<AppView>(() => initialSession ? resolveView(initialSession) : "auth");
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [requiresRoleSelection, setRequiresRoleSelection] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [suggestRoleExpansion, setSuggestRoleExpansion] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPassword, setRegisteredPassword] = useState("");
  const [activationRequired, setActivationRequired] = useState(false);

  useEffect(() => {
    writeSession(session);
    if (session?.business?.businessId) {
      window.localStorage.setItem(BUSINESS_ID_KEY, session.business.businessId);
    }
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError("");
    setLoginEmail(email);
    setLoginPassword(password);
    try {
      const result = await loginWithPassword(email, password);

      if (result.requiresRoleSelection && result.availableRoles) {
        setRequiresRoleSelection(true);
        setAvailableRoles(result.availableRoles);
        setBusy(false);
        return;
      }

      if (result.requiresTwoFactor && result.authChallengeId) {
        setRequiresTwoFactor(true);
        setTwoFactorChallengeId(result.authChallengeId);
        setBusy(false);
        return;
      }

      if (result.activationRequired) {
        setSession(result);
        setActivationRequired(true);
        setBusy(false);
        return;
      }

      setSession(result);
      setView(resolveView(result));
      setChallenge(null);
      setRequiresRoleSelection(false);
      setRequiresTwoFactor(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && (e as any).body?.challenge) {
        setChallenge((e as any).body.challenge);
        setBusy(false);
        return;
      }
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.loginFailed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const selectRole = useCallback(async (role: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await selectRoleApi(loginEmail, loginPassword, role);

      if (result.requiresTwoFactor && result.authChallengeId) {
        setRequiresTwoFactor(true);
        setTwoFactorChallengeId(result.authChallengeId);
        setBusy(false);
        return;
      }

      if (result.activationRequired) {
        setSession(result);
        setActivationRequired(true);
        setRequiresRoleSelection(false);
        setAvailableRoles([]);
        setBusy(false);
        return;
      }

      setSession(result);
      setView(resolveView(result));
      setChallenge(null);
      setRequiresRoleSelection(false);
      setRequiresTwoFactor(false);
      setAvailableRoles([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.loginFailed"));
    } finally {
      setBusy(false);
    }
  }, [loginEmail, loginPassword, t]);

  const register = useCallback(async (data: { email: string; password: string; displayName: string }) => {
    setBusy(true);
    setError("");
    try {
      let info;
      try {
        info = await fetchEmailInfo(data.email);
      } catch {
        // proceed as new registration if email-info fails
      }

      const accounts = info?.accounts ?? [];
      const exists = info?.exists ?? false;

      if (!exists || accounts.length === 0) {
        const result = await registerCustomer(data.displayName || data.email, data.email, data.password);
        setChallenge(result);
        return;
      }

      if (!hasCustomerRole(accounts)) {
        const result = await registerCustomer(data.displayName || data.email, data.email, data.password);
        setChallenge(result);
        return;
      }

      if (!hasBusinessRole(accounts)) {
        let cityName = "Астана";
        try {
          const raw = window.localStorage.getItem("ask.geo");
          if (raw) {
            const geo = JSON.parse(raw);
            if (geo.lat && geo.lng) {
              const resolved = await reverseGeocodeCity(geo.lat, geo.lng);
              if (resolved) cityName = resolved;
            }
          }
        } catch {
          // fall back to Астана
        }
        const city = await resolveCity(cityName);
        const result = await registerBusiness({
          email: data.email,
          password: data.password,
          businessName: data.displayName || data.email,
          branchName: "Main",
          branchCityId: city.id,
          branchAddress: city.name,
        });
        setChallenge(result);
        return;
      }

      setMode("login");
      setError(t("auth.error.allRolesExist"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.registerFailed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const verify = useCallback(async (code: string) => {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const nextSession = await verifyCode(challenge.authChallengeId, code);

      if (nextSession.requiresRoleSelection && nextSession.availableRoles) {
        setRequiresRoleSelection(true);
        setAvailableRoles(nextSession.availableRoles);
        setChallenge(null);
        setBusy(false);
        return;
      }

      if (nextSession.activationRequired) {
        setSession(nextSession);
        setActivationRequired(true);
        setChallenge(null);
        setBusy(false);
        return;
      }

      if (nextSession.suggestRoleExpansion) {
        const email = nextSession.user?.email || "";
        setRegisteredEmail(email);
        setRegisteredPassword(loginPassword || "");
        setSession(nextSession);
        setSuggestRoleExpansion(true);
        setChallenge(null);
        setBusy(false);
        return;
      }

      setSession(nextSession);
      setView(resolveView(nextSession));
      setChallenge(null);
      setSuggestRoleExpansion(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.wrongCode"));
    } finally {
      setBusy(false);
    }
  }, [challenge, t, loginPassword]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    if (!twoFactorChallengeId) return;
    setBusy(true);
    setError("");
    try {
      const nextSession = await verifyCode(twoFactorChallengeId, code);
      setSession(nextSession);
      setView(resolveView(nextSession));
      setChallenge(null);
      setRequiresTwoFactor(false);
      setTwoFactorChallengeId(null);
      setRequiresRoleSelection(false);
      setAvailableRoles([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.wrongCode"));
    } finally {
      setBusy(false);
    }
  }, [twoFactorChallengeId, t]);

  const switchRole = useCallback(async (targetRole: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await switchRoleApi(targetRole);
      setSession(result);
      const nextView = resolveView(result);
      setView(nextView);
      navigate(nextView === "business" || nextView === "staff" ? ROUTES.business : ROUTES.home);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.loginFailed"));
      throw e;
    } finally {
      setBusy(false);
    }
  }, [t, navigate]);

  const expandRole = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      let cityName = "Астана";
      try {
        const raw = window.localStorage.getItem("ask.geo");
        if (raw) {
          const geo = JSON.parse(raw);
          if (geo.lat && geo.lng) {
            const resolved = await reverseGeocodeCity(geo.lat, geo.lng);
            if (resolved) cityName = resolved;
          }
        }
      } catch {
        // fall back
      }
      const city = await resolveCity(cityName);
      const result = await registerBusiness({
        email: registeredEmail,
        password: registeredPassword,
        businessName: registeredEmail,
        branchName: "Main",
        branchCityId: city.id,
        branchAddress: city.name,
      });
      setSuggestRoleExpansion(false);
      setChallenge(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.registerFailed"));
    } finally {
      setBusy(false);
    }
  }, [registeredEmail, registeredPassword, t]);

  const skipRoleExpansion = useCallback(() => {
    if (session) {
      setView(resolveView(session));
    }
    setSuggestRoleExpansion(false);
  }, [session]);

  const activateStaffAccount = useCallback(async (newPassword: string, passwordConfirmation: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await changeTemporaryPassword(newPassword, passwordConfirmation);
      setSession(result);
      setActivationRequired(false);
      setView(resolveView(result));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.activation.error"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const logout = useCallback(async () => {
    try {
      await logoutRemote();
    } catch {
      clearSession();
    }
    writeSession(null);
    setSession(null);
    setView("auth");
    setChallenge(null);
    setError("");
    setRequiresRoleSelection(false);
    setAvailableRoles([]);
    setRequiresTwoFactor(false);
    setTwoFactorChallengeId(null);
    setActivationRequired(false);
  }, []);

  const updateProfile = useCallback(async (data: { displayName?: string; email?: string; phone?: string }) => {
    setBusy(true);
    setError("");
    try {
      const nextSession = await updateProfileRequest(data);
      setSession(current => {
        if (!current) return current;
        return {
          ...current,
          user: nextSession.user ?? current.user,
          business: nextSession.business ?? current.business,
        };
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("auth.error.profileUpdateFailed"));
      throw e;
    } finally {
      setBusy(false);
    }
  }, [t]);

  const backToLogin = useCallback(() => {
    setRequiresRoleSelection(false);
    setAvailableRoles([]);
    setRequiresTwoFactor(false);
    setTwoFactorChallengeId(null);
    setChallenge(null);
    setSuggestRoleExpansion(false);
    setActivationRequired(false);
    setError("");
  }, []);

  const state: AuthState = {
    session, view, challenge, busy, error, mode,
    requiresRoleSelection, availableRoles,
    requiresTwoFactor, twoFactorChallengeId,
    loginEmail, loginPassword,
    suggestRoleExpansion, registeredEmail, registeredPassword,
    activationRequired,
  };

  const actions: AuthActions = {
    setMode, login, register, selectRole, verify, verifyTwoFactor,
    switchRole, expandRole, skipRoleExpansion,
    logout, updateProfile, clearError: () => setError(""), backToLogin,
    activateStaffAccount,
  };

  return (
    <AuthContext.Provider value={{ state, actions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
