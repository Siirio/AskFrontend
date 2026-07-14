import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Input } from "../../shared/ui/Input/Input";
import { ROUTES } from "../../app/routes";

export function AuthPage() {
  const { t } = useTranslation();
  const { state, actions } = useAuth();
  const { reduced } = useMotion();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");

  if (state.view !== "auth" && !state.challenge && !state.requiresRoleSelection && !state.requiresTwoFactor) {
    const target = state.view === "business" || state.view === "staff" ? ROUTES.business : ROUTES.home;
    return <Navigate to={target} replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    await actions.login(email, password);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    await actions.register({ email, password, displayName });
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    await actions.verify(code);
  };

  const handleTwoFactor = async (e: FormEvent) => {
    e.preventDefault();
    await actions.verifyTwoFactor(code);
  };

  const cardContent = renderCard();

  function renderCard() {
    // Role selection screen
    if (state.requiresRoleSelection && state.availableRoles.length > 0) {
      return (
        <>
          <h2 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
            {t("auth.roleSelection.title")}
          </h2>
          <p className="fcw-body-s fcw-text-secondary" style={{ marginBottom: "var(--fcw-space-md)", textAlign: "center" }}>
            {t("auth.roleSelection.description")}
          </p>

          {state.error && (
            <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)", marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
              {state.error}
            </div>
          )}

          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)", marginBottom: "var(--fcw-space-md)" }}>
            {state.availableRoles.map(role => (
              <button
                key={role.userId}
                className="fcw-card fcw-card-clickable fcw-p-md"
                style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer" }}
                onClick={() => actions.selectRole(role.role)}
                disabled={state.busy}
              >
                <p className="fcw-body fcw-font-medium">{role.displayName || role.role}</p>
                <p className="fcw-body-xs fcw-text-tertiary">{t(`auth.role.${role.role}`)}</p>
              </button>
            ))}
          </div>

          <button
            className="fcw-btn fcw-btn-ghost fcw-btn-sm fcw-mx-auto"
            style={{ display: "flex" }}
            onClick={actions.backToLogin}
          >
            <ArrowLeft size={14} />
            {t("auth.button.back")}
          </button>
        </>
      );
    }

    // 2FA code screen
    if (state.requiresTwoFactor) {
      return (
        <>
          <h2 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
            {t("auth.twoFactor.title")}
          </h2>
          <p className="fcw-body-s fcw-text-secondary" style={{ marginBottom: "var(--fcw-space-md)", textAlign: "center" }}>
            {t("auth.twoFactor.description")}
          </p>

          <form onSubmit={handleTwoFactor}>
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <Input
                label={t("auth.label.code")}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={t("auth.placeholder.code")}
                required
                autoFocus
              />
              {state.error && (
                <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>
                  {state.error}
                </div>
              )}
              <button
                type="submit"
                className="fcw-btn fcw-btn-primary fcw-btn-full fcw-btn-lg"
                disabled={state.busy}
              >
                {state.busy ? t("auth.button.verifying") : t("auth.button.confirm")}
              </button>
            </div>
          </form>

          <button
            className="fcw-btn fcw-btn-ghost fcw-btn-sm fcw-mx-auto"
            style={{ marginTop: "var(--fcw-space-md)", display: "flex" }}
            onClick={actions.backToLogin}
          >
            <ArrowLeft size={14} />
            {t("auth.button.back")}
          </button>
        </>
      );
    }

    // Verification code screen
    if (state.challenge) {
      return (
        <>
          <h2 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
            {t("auth.verification.title")}
          </h2>

          <form onSubmit={handleVerify}>
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <p className="fcw-body fcw-text-secondary">
                {t("auth.codeSent", { destination: state.challenge.maskedDestination || email || "" })}
              </p>
              {state.challenge.code && (
                <div className="fcw-card fcw-p-sm" style={{ background: "var(--fcw-color-surface-secondary)", borderRadius: "var(--fcw-radius-md)", textAlign: "center" }}>
                  <p className="fcw-body-xs fcw-text-tertiary" style={{ marginBottom: "0.25rem" }}>{t("auth.testMode")}</p>
                  <p className="fcw-h3" style={{ fontFamily: "var(--fcw-font-mono)", letterSpacing: "0.2em", color: "var(--fcw-color-primary)" }}>{state.challenge.code}</p>
                </div>
              )}
              <Input
                label={t("auth.label.code")}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={t("auth.placeholder.code")}
                required
                autoFocus
              />
              {state.error && (
                <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>
                  {state.error}
                </div>
              )}
              <button
                type="submit"
                className="fcw-btn fcw-btn-primary fcw-btn-full fcw-btn-lg"
                disabled={state.busy}
              >
                {state.busy ? t("auth.button.verifying") : t("auth.button.confirm")}
              </button>
            </div>
          </form>

          <button
            className="fcw-btn fcw-btn-ghost fcw-btn-sm fcw-mx-auto"
            style={{ marginTop: "var(--fcw-space-md)", display: "flex" }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} />
            {t("auth.button.back")}
          </button>
        </>
      );
    }

    // Role expansion — suggest adding another role after first registration
    if (state.suggestRoleExpansion) {
      const currentRole = state.session?.role || "";
      const isCustomer = currentRole.includes("CUSTOMER");

      return (
        <>
          <h2 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
            {t("auth.roleExpansion.title")}
          </h2>
          <p className="fcw-body-s fcw-text-secondary" style={{ marginBottom: "var(--fcw-space-md)", textAlign: "center" }}>
            {isCustomer ? t("auth.roleExpansion.customerDescription") : t("auth.roleExpansion.businessDescription")}
          </p>

          {state.error && (
            <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)", marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
              {state.error}
            </div>
          )}

          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
            <button
              className="fcw-btn fcw-btn-primary fcw-btn-lg"
              onClick={actions.expandRole}
              disabled={state.busy}
            >
              {isCustomer ? t("auth.roleExpansion.addBusiness") : t("auth.roleExpansion.addCustomer")}
            </button>
            <button
              className="fcw-btn fcw-btn-secondary fcw-btn-lg"
              onClick={actions.skipRoleExpansion}
              disabled={state.busy}
            >
              {t("auth.roleExpansion.skip")}
            </button>
          </div>
        </>
      );
    }

    // Login / Register forms
    return (
      <>
        <div className="fcw-flex" style={{ marginBottom: "var(--fcw-space-lg)", gap: "0.375rem", padding: "0.25rem", borderRadius: "var(--fcw-radius-lg)", background: "color-mix(in srgb, var(--fcw-color-surface-secondary) 60%, transparent)", backdropFilter: "var(--fcw-blur-glass)" }}>
          <button
            className={`fcw-flex-1 fcw-btn fcw-btn-sm ${state.mode === "login" ? "fcw-glassmorph-selected" : ""}`}
            style={{
              background: state.mode === "login" ? undefined : "transparent",
              color: state.mode === "login" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
              fontWeight: state.mode === "login" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
              borderRadius: "var(--fcw-radius-md)",
              border: state.mode === "login" ? undefined : "none",
              boxShadow: state.mode === "login" ? undefined : "none",
            }}
            onClick={() => actions.setMode("login")}
          >
            {t("auth.mode.login")}
          </button>
          <button
            className={`fcw-flex-1 fcw-btn fcw-btn-sm ${state.mode === "register" ? "fcw-glassmorph-selected" : ""}`}
            style={{
              background: state.mode === "register" ? undefined : "transparent",
              color: state.mode === "register" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
              fontWeight: state.mode === "register" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
              borderRadius: "var(--fcw-radius-md)",
              border: state.mode === "register" ? undefined : "none",
              boxShadow: state.mode === "register" ? undefined : "none",
            }}
            onClick={() => actions.setMode("register")}
          >
            {t("auth.mode.register")}
          </button>
        </div>

        <form onSubmit={state.mode === "login" ? handleLogin : handleRegister}>
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
            <Input
              label={t("auth.label.email")}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label={t("auth.label.password")}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={state.mode === "login" ? "current-password" : "new-password"}
            />
            {state.mode === "register" && (
              <Input
                label={t("auth.label.name")}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t("auth.placeholder.name")}
                required
              />
            )}

            {state.error && (
              <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              className="fcw-btn fcw-btn-primary fcw-btn-full fcw-btn-lg"
              disabled={state.busy}
              style={{ marginTop: "0.5rem" }}
            >
              {state.busy ? "..." : state.mode === "login" ? t("auth.button.login") : t("auth.button.register")}
              {!state.busy && <ArrowRight size={18} />}
            </button>

            {state.mode === "login" && (
              <>
                <div className="fcw-flex-center" style={{ gap: "0.5rem", marginTop: "0.25rem" }}>
                  <span className="fcw-body-xs fcw-text-tertiary">{t("auth.oauth.separator")}</span>
                </div>
                <a
                  href="/oauth2/authorization/google"
                  className="fcw-btn fcw-btn-secondary fcw-btn-full"
                  style={{ gap: "0.5rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t("auth.oauth.google")}
                </a>
              </>
            )}
          </div>
        </form>
      </>
    );
  }

  return (
    <main id="main-content" className="fcw-flex-center" style={{ minHeight: "100vh", padding: "var(--fcw-space-lg)" }}>
      <motion.div
        className="fcw-card fcw-p-xl"
        style={{ width: "100%", maxWidth: "440px" }}
        initial={reduced ? {} : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {cardContent}
      </motion.div>
    </main>
  );
}
