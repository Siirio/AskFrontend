import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Search, Building2 } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { getGoogleOAuthUrl } from "../../shared/api/authClient";
import { acceptLegalDocuments } from "../../shared/api/legalClient";
import { Input } from "../../shared/ui/Input/Input";
import { Loading } from "../../shared/ui/Loading/Loading";
import { buildRoute, ROUTES } from "../../app/routes";

const SELLER_ONBOARDING_DRAFT_KEY = "ask.sellerOnboardingDraft";
type RegistrationRole = "customer" | "seller";

const ROLE_DOCUMENTS: Record<RegistrationRole, Array<{ code: string; href: string; label: string }>> = {
  customer: [
    { code: "USER_TERMS", href: "/legal/user-terms", label: "auth.legal.userAgreement" },
    { code: "PRIVACY_POLICY", href: "/legal/privacy", label: "auth.legal.privacyPolicy" },
  ],
  seller: [
    { code: "SELLER_TERMS", href: "/legal/seller-terms", label: "auth.legal.sellerTerms" },
    { code: "PERSONAL_DATA_CONSENT", href: "/legal/personal-data-consent", label: "auth.legal.personalDataConsent" },
  ],
};

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const { state, actions } = useAuth();
  const { reduced } = useMotion();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [registrationRole, setRegistrationRole] = useState<RegistrationRole | null>(null);
  const [acceptedRoleDocuments, setAcceptedRoleDocuments] = useState(false);
  const [roleChoiceBusy, setRoleChoiceBusy] = useState(false);
  const [roleChoiceError, setRoleChoiceError] = useState("");

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (state.authenticated && !state.challenge && !state.requiresTwoFactor && !state.activationRequired && !state.registrationJustCompleted) {
    if (sessionStorage.getItem("ask.sellerOnboardingDraft")) {
      return <Navigate to={ROUTES.sellerOnboarding} replace />;
    }
    const startRoute = state.session?.startRoute;
    if (startRoute === "BUSINESS_CABINET" && state.session?.business) {
      return <Navigate to={buildRoute(ROUTES.business, { businessId: state.session.business.businessId })} replace />;
    }
    if (startRoute === "CLIENT_SEARCH") {
      return <Navigate to={ROUTES.results} replace />;
    }
    return <Navigate to={ROUTES.home} replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    await actions.login(email, password);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    await actions.register({
      email,
      password,
      displayName,
      locale: i18n.resolvedLanguage ?? "ru",
    });
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    await actions.verify(code);
  };

  const handleTwoFactor = async (e: FormEvent) => {
    e.preventDefault();
    await actions.verifyTwoFactor(code);
  };

  const chooseRegistrationRole = (role: RegistrationRole) => {
    setRegistrationRole(role);
    setAcceptedRoleDocuments(false);
    setRoleChoiceError("");
  };

  const confirmRegistrationRole = async () => {
    if (!registrationRole || !acceptedRoleDocuments) {
      return;
    }
    setRoleChoiceBusy(true);
    setRoleChoiceError("");
    try {
      await acceptLegalDocuments(
        ROLE_DOCUMENTS[registrationRole].map(document => document.code),
        i18n.resolvedLanguage?.split("-")[0] ?? "ru",
      );
      if (registrationRole === "customer") {
        continueAsBuyer();
      } else {
        continueAsCompany();
      }
    } catch (cause) {
      setRoleChoiceError(cause instanceof Error ? cause.message : t("auth.legal.acceptError"));
    } finally {
      setRoleChoiceBusy(false);
    }
  };

  const continueAsBuyer = () => {
    sessionStorage.removeItem(SELLER_ONBOARDING_DRAFT_KEY);
    actions.dismissRoleExpansion();
    navigate(ROUTES.results);
  };

  const continueAsCompany = () => {
    sessionStorage.setItem(SELLER_ONBOARDING_DRAFT_KEY, "{}");
    actions.dismissRoleExpansion();
    navigate(ROUTES.sellerOnboarding);
  };

  const cardContent = renderCard();

  function renderCard() {
    // Activation password change (unskippable)
    if (state.activationRequired) {
      return (
        <>
          <h2 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
            {t("auth.activation.title")}
          </h2>
          <p className="fcw-body-s fcw-text-secondary" style={{ marginBottom: "var(--fcw-space-md)", textAlign: "center" }}>
            {t("auth.activation.description")}
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            const newPass = (e.currentTarget.elements.namedItem("newPassword") as HTMLInputElement).value;
            const confirmPass = (e.currentTarget.elements.namedItem("confirmPassword") as HTMLInputElement).value;
            if (newPass !== confirmPass) {
              actions.clearError();
              return;
            }
            await actions.activateStaffAccount(newPass, confirmPass);
          }}>
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <Input
                label={t("auth.activation.newPassword")}
                name="newPassword"
                type="password"
                placeholder="••••••••"
                required
                autoFocus
                autoComplete="new-password"
              />
              <Input
                label={t("auth.activation.confirmPassword")}
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
                {state.busy ? "..." : t("auth.activation.submit")}
              </button>
            </div>
          </form>
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

    // Role choice — shown after first registration
    if (state.registrationJustCompleted) {
      return (
        <>
          <h2 className="fcw-h3" style={{ marginBottom: "var(--fcw-space-sm)", textAlign: "center" }}>
            {t("auth.roleChoice.title")}
          </h2>
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
            <button
              className={`fcw-btn fcw-btn-full fcw-btn-lg ${registrationRole === "customer" ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
              onClick={() => chooseRegistrationRole("customer")}
              style={{ justifyContent: "space-between", whiteSpace: "normal", textAlign: "left" }}
            >
              <Search size={18} />
              {t("auth.roleChoice.buyer")}
              <ArrowRight size={18} />
            </button>
            <button
              className={`fcw-btn fcw-btn-full fcw-btn-lg ${registrationRole === "seller" ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
              onClick={() => chooseRegistrationRole("seller")}
              style={{ justifyContent: "space-between", whiteSpace: "normal", textAlign: "left" }}
            >
              <Building2 size={18} />
              {t("auth.roleChoice.company")}
              <ArrowRight size={18} />
            </button>
            {registrationRole && (
              <div className="fcw-card fcw-p-md fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
                <p className="fcw-body-s fcw-text-secondary">
                  {t(`auth.roleChoice.${registrationRole}Documents`)}
                </p>
                <ul className="fcw-body-s" style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {ROLE_DOCUMENTS[registrationRole].map(document => (
                    <li key={document.code}>
                      <a href={document.href} target="_blank" rel="noreferrer">
                        {t(document.label)}
                      </a>
                    </li>
                  ))}
                </ul>
                <label className="fcw-flex fcw-items-start" style={{ gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={acceptedRoleDocuments}
                    onChange={event => setAcceptedRoleDocuments(event.target.checked)}
                  />
                  <span className="fcw-body-s">{t("auth.legal.roleAccept")}</span>
                </label>
                {roleChoiceError && (
                  <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{roleChoiceError}</p>
                )}
                <button
                  className="fcw-btn fcw-btn-primary fcw-btn-full"
                  disabled={!acceptedRoleDocuments || roleChoiceBusy}
                  onClick={confirmRegistrationRole}
                >
                  {roleChoiceBusy ? "..." : t("auth.roleChoice.continue")}
                  {!roleChoiceBusy && <ArrowRight size={18} />}
                </button>
              </div>
            )}
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

            <div className="fcw-flex-center" style={{ gap: "0.5rem", marginTop: "0.25rem" }}>
              <span className="fcw-body-xs fcw-text-tertiary">{t("auth.oauth.separator")}</span>
            </div>
            <a
              href={getGoogleOAuthUrl()}
              className="fcw-btn fcw-btn-secondary fcw-btn-full"
              style={{ gap: "0.5rem" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {state.mode === "register" ? t("auth.oauth.googleRegister") : t("auth.oauth.google")}
            </a>
          </div>
        </form>
      </>
    );
  }

  return (
    <main
      id="main-content"
      className="fcw-flex-center"
      style={{
        minHeight: "100vh",
        padding: "var(--fcw-space-lg)",
        paddingBottom: state.registrationJustCompleted
          ? "calc(var(--fcw-space-xl) + 64px)"
          : "var(--fcw-space-lg)",
      }}
    >
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
