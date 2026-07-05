import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { AuthSession, AuthChallenge } from "../../shared/api/authClient";
import { loginWithPassword, registerCustomer, registerBusiness, verifyCode, resolveCity, logout as clearSession, logoutRemote, updateProfile as updateProfileRequest } from "../../shared/api/authClient";
import { ApiError } from "../../shared/api/httpClient";

export type AppView = "auth" | "customer" | "business" | "staff";
export type AuthAudience = "customer" | "business";
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
  const role = session.role.toUpperCase();
  if (role.includes("STAFF")) return "staff";
  if (role.includes("BUSINESS") || role.includes("OWNER")) return "business";
  return "customer";
}

interface AuthState {
  session: AuthSession | null;
  view: AppView;
  challenge: AuthChallenge | null;
  busy: boolean;
  error: string;
  audience: AuthAudience;
  mode: AuthMode;
}

interface AuthActions {
  setAudience: (a: AuthAudience) => void;
  setMode: (m: AuthMode) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string; businessName?: string; branchAddress?: string; cityName: string }) => Promise<void>;
  verify: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; email?: string; phone?: string }) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<{ state: AuthState; actions: AuthActions } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = readSession();
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [view, setView] = useState<AppView>(() => initialSession ? resolveView(initialSession) : "auth");
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<AuthAudience>("customer");
  const [mode, setMode] = useState<AuthMode>("login");

  useEffect(() => {
    writeSession(session);
    if (session?.business?.businessId) {
      window.localStorage.setItem(BUSINESS_ID_KEY, session.business.businessId);
    }
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError("");
    try {
      const nextSession = await loginWithPassword(email, password);
      setSession(nextSession);
      const nextView = resolveView(nextSession);
      setView(nextView);
      setAudience(nextView === "customer" ? "customer" : "business");
      setChallenge(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && (e as any).body?.challenge) {
        setChallenge((e as any).body.challenge);
        return;
      }
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }, []);

  const register = useCallback(async (data: { email: string; password: string; displayName: string; businessName?: string; branchAddress?: string; cityName: string }) => {
    setBusy(true);
    setError("");
    try {
      let result: AuthChallenge;
      if (audience === "customer") {
        result = await registerCustomer(data.displayName || data.email, data.email, data.password);
      } else {
        const city = await resolveCity(data.cityName || "Астана");
        result = await registerBusiness({
          email: data.email,
          password: data.password,
          businessName: data.businessName || data.displayName || "Ask Business",
          branchName: data.businessName || "Main",
          branchCityId: city.id,
          branchAddress: data.branchAddress || data.cityName || "",
        });
      }
      setChallenge(result);
    } catch (e) {
      if (e instanceof ApiError && e.errorCode === "EMAIL_ALREADY_REGISTERED") {
        setMode("login");
        setError("Этот email уже зарегистрирован. Войдите — вкладка «Вход».");
      } else {
        setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Ошибка регистрации");
      }
    } finally {
      setBusy(false);
    }
  }, [audience]);

  const verify = useCallback(async (code: string) => {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const nextSession = await verifyCode(challenge.authChallengeId, code);
      setSession(nextSession);
      const nextView = resolveView(nextSession);
      setView(nextView);
      setAudience(nextView === "customer" ? "customer" : "business");
      setChallenge(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Неверный код");
    } finally {
      setBusy(false);
    }
  }, [challenge]);

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
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Ошибка сохранения профиля");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const state: AuthState = { session, view, challenge, busy, error, audience, mode };
  const actions: AuthActions = { setAudience, setMode, login, register, verify, logout, updateProfile, clearError: () => setError("") };

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
