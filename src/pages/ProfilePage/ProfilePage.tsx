import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { ROUTES } from "../../app/routes";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  confirmEmailChange,
  confirmPasswordChange,
  confirmTwoFactorChange,
  deleteAccount,
  requestEmailChange,
  requestPasswordChange,
  requestTwoFactorChange,
} from "../../shared/api/authClient";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Input } from "../../shared/ui/Input/Input";
import {
  isVerificationCodeComplete,
  normalizeVerificationCode,
  VERIFICATION_CODE_LENGTH,
} from "./accountSecurityFlow";

const AVATAR_STORAGE_KEY = "ask.profileAvatar";
const EMPTY_PASSWORD_FORM = { current: "", next: "", confirmation: "" };

type PasswordStep = "credentials" | "verification";
type TwoFactorStep = "intent" | "verification";

export function ProfilePage() {
  const { t } = useTranslation();
  const { state, actions } = useAuth();
  const navigate = useNavigate();
  const user = state.session?.user;
  const hasBusinessMembership = Boolean(state.session?.businessMemberships?.length);
  const [avatar, setAvatar] = useState(() => window.localStorage.getItem(AVATAR_STORAGE_KEY) || "");
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("credentials");
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordChallengeId, setPasswordChallengeId] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<TwoFactorStep>("intent");
  const [twoFactorTarget, setTwoFactorTarget] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [busyAction, setBusyAction] = useState<"profile" | "password" | "2fa" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      displayName: user.displayName || "",
      email: user.email || "",
      phone: user.phone || "",
    });
  }, [user?.displayName, user?.email, user?.phone, user?.userId]);

  if (!state.sessionReady) return <Loading />;
  if (!state.authenticated) return <Navigate to={ROUTES.auth} replace />;

  const saveProfile = async () => {
    setBusyAction("profile");
    setError("");
    setMessage("");
    try {
      await actions.updateProfile({
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
      });
      if (form.email.trim() && form.email.trim() !== user?.email) {
        const challenge = await requestEmailChange(form.email.trim());
        setEmailChallengeId(challenge.verificationId);
        setMessage(t("profile.security.emailCodeSent"));
      } else {
        setMessage(t("profile.saved"));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("profile.saveError"));
    } finally {
      setBusyAction(null);
    }
  };

  const confirmEmail = async () => {
    if (!isVerificationCodeComplete(emailCode)) return;
    setBusyAction("profile");
    setError("");
    try {
      await confirmEmailChange(emailChallengeId, emailCode);
      await actions.refreshSession();
      setEmailChallengeId("");
      setEmailCode("");
      setMessage(t("profile.security.emailChanged"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("profile.saveError"));
    } finally {
      setBusyAction(null);
    }
  };

  const closePasswordModal = () => {
    setPasswordOpen(false);
    setPasswordStep("credentials");
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordChallengeId("");
    setPasswordCode("");
    setPasswordError("");
  };

  const sendPasswordCode = async () => {
    if (!passwordForm.current
        || passwordForm.next.length < 8
        || passwordForm.next !== passwordForm.confirmation) {
      setPasswordError(t("profile.security.passwordValidation"));
      return;
    }
    setBusyAction("password");
    setPasswordError("");
    try {
      const challenge = await requestPasswordChange(
        passwordForm.current,
        passwordForm.next,
        passwordForm.confirmation,
      );
      setPasswordChallengeId(challenge.verificationId);
      setPasswordCode("");
      setPasswordStep("verification");
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : t("profile.security.passwordError"));
    } finally {
      setBusyAction(null);
    }
  };

  const verifyPasswordCode = async () => {
    if (!isVerificationCodeComplete(passwordCode)) return;
    setBusyAction("password");
    setPasswordError("");
    try {
      await confirmPasswordChange(passwordChallengeId, passwordCode);
      closePasswordModal();
      setMessage(t("profile.security.passwordChanged"));
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : t("profile.security.passwordError"));
    } finally {
      setBusyAction(null);
    }
  };

  const openTwoFactorModal = () => {
    setTwoFactorTarget(!Boolean(state.session?.isTwoFactorEnabled));
    setTwoFactorStep("intent");
    setTwoFactorChallengeId("");
    setTwoFactorCode("");
    setTwoFactorError("");
    setTwoFactorOpen(true);
  };

  const closeTwoFactorModal = () => {
    setTwoFactorOpen(false);
    setTwoFactorStep("intent");
    setTwoFactorChallengeId("");
    setTwoFactorCode("");
    setTwoFactorError("");
  };

  const sendTwoFactorCode = async () => {
    setBusyAction("2fa");
    setTwoFactorError("");
    try {
      const challenge = await requestTwoFactorChange(twoFactorTarget);
      setTwoFactorChallengeId(challenge.verificationId);
      setTwoFactorCode("");
      setTwoFactorStep("verification");
    } catch (cause) {
      setTwoFactorError(cause instanceof Error ? cause.message : t("profile.security.twoFactorError"));
    } finally {
      setBusyAction(null);
    }
  };

  const verifyTwoFactorCode = async () => {
    if (!isVerificationCodeComplete(twoFactorCode)) return;
    setBusyAction("2fa");
    setTwoFactorError("");
    try {
      await confirmTwoFactorChange(twoFactorChallengeId, twoFactorCode);
      await actions.refreshSession();
      closeTwoFactorModal();
      setMessage(t(twoFactorTarget
        ? "profile.security.twoFactorEnabled"
        : "profile.security.twoFactorDisabled"));
    } catch (cause) {
      setTwoFactorError(cause instanceof Error ? cause.message : t("profile.security.twoFactorError"));
    } finally {
      setBusyAction(null);
    }
  };

  const removeAccount = async () => {
    setBusyAction("delete");
    setDeleteError("");
    try {
      await deleteAccount();
      await actions.logout();
      navigate(ROUTES.auth, { replace: true });
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : t("profile.account.deleteError"));
      setBusyAction(null);
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteError("");
  };

  const logout = async () => {
    await actions.logout();
    navigate(ROUTES.auth, { replace: true });
  };

  return (
    <main id="main-content" className="account-page">
      <div className="account-shell">
        <header className="account-hero">
          <label className="account-avatar">
            {avatar ? <img src={avatar} alt="" /> : <UserRound size={34} />}
            <span><Camera size={14} /></span>
            <input
              type="file"
              accept="image/*"
              onChange={event => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const value = String(reader.result || "");
                  setAvatar(value);
                  window.localStorage.setItem(AVATAR_STORAGE_KEY, value);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <div>
            <p>{t(hasBusinessMembership ? "profile.role.business" : "profile.role.customer")}</p>
            <h1>{user?.displayName || user?.email || t("profile.displayNameFallback")}</h1>
            <span>{user?.email}</span>
          </div>
        </header>

        {(message || error) && (
          <div className={`account-feedback${error ? " is-error" : ""}`}>
            {error || message}
          </div>
        )}

        <div className="account-grid">
          <section className="account-section account-section--identity">
            <div className="account-section__heading">
              <span><UserRound size={19} /></span>
              <div>
                <h2>{t("profile.section.profileData")}</h2>
                <p>{t("profile.identity.description")}</p>
              </div>
            </div>

            <div className="account-fields">
              <label>
                <span>{t("profile.placeholder.name")}</span>
                <div><UserRound size={17} /><input value={form.displayName} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} /></div>
              </label>
              <label>
                <span>{t("profile.placeholder.email")}</span>
                <div><Mail size={17} /><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></div>
              </label>
              <label>
                <span>{t("profile.placeholder.phone")}</span>
                <div>
                  <Phone size={17} />
                  <input type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} />
                  {form.phone && <button type="button" onClick={() => setForm(current => ({ ...current, phone: "" }))} aria-label={t("profile.phone.remove")}><X size={16} /></button>}
                </div>
              </label>
            </div>

            {emailChallengeId && (
              <div className="account-inline-form">
                <input
                  inputMode="numeric"
                  maxLength={VERIFICATION_CODE_LENGTH}
                  value={emailCode}
                  onChange={event => setEmailCode(normalizeVerificationCode(event.target.value))}
                  placeholder={t("profile.emailChange.code")}
                />
                <button type="button" onClick={confirmEmail} disabled={!isVerificationCodeComplete(emailCode)}>
                  {t("profile.emailChange.confirm")}
                </button>
              </div>
            )}

            <button className="account-primary-action" type="button" onClick={saveProfile} disabled={busyAction === "profile"}>
              {busyAction === "profile" ? <Loader2 className="fcw-animate-spin" size={17} /> : <Check size={17} />}
              {t("profile.save")}
            </button>
          </section>

          <section className="account-section">
            <div className="account-section__heading">
              <span><ShieldCheck size={19} /></span>
              <div>
                <h2>{t("profile.security.title")}</h2>
                <p>{t("profile.security.description")}</p>
              </div>
            </div>

            <div className="account-setting-row">
              <span><KeyRound size={18} /></span>
              <div><strong>{t("profile.security.password")}</strong><small>{t("profile.security.passwordHint")}</small></div>
              <button type="button" onClick={() => setPasswordOpen(true)}>{t("profile.security.change")}</button>
            </div>

            <div className="account-setting-row">
              <span><LockKeyhole size={18} /></span>
              <div>
                <strong>{t("profile.security.twoFactor")}</strong>
                <small>{t(state.session?.isTwoFactorEnabled
                  ? "profile.security.twoFactorOn"
                  : "profile.security.twoFactorOff")}</small>
              </div>
              <button
                type="button"
                className={state.session?.isTwoFactorEnabled ? "is-active" : ""}
                onClick={openTwoFactorModal}
              >
                {t(state.session?.isTwoFactorEnabled
                  ? "profile.security.disable"
                  : "profile.security.enable")}
              </button>
            </div>
          </section>

          {!hasBusinessMembership && (
            <section className="account-section account-company-action">
              <div className="account-section__heading">
                <span><Building2 size={19} /></span>
                <div>
                  <h2>{t("profile.company.title")}</h2>
                  <p>{t("profile.company.description")}</p>
                </div>
              </div>
              <button type="button" onClick={() => navigate(ROUTES.sellerOnboarding)}>
                {t("profile.company.action")}<ArrowRight size={17} />
              </button>
            </section>
          )}
        </div>

        <section className="account-danger-zone">
          <div>
            <span><ShieldAlert size={20} /></span>
            <div>
              <h2>{t("profile.account.dangerTitle")}</h2>
              <p>{t("profile.account.dangerDescription")}</p>
            </div>
          </div>
          <button type="button" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={17} />{t("profile.account.delete")}
          </button>
        </section>

        <footer className="account-footer">
          <button type="button" onClick={logout}><LogOut size={17} />{t("profile.logout")}</button>
        </footer>
      </div>

      {passwordOpen && (
        <div className="account-modal-backdrop">
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
          >
            <header>
              <span><KeyRound size={20} /></span>
              <div>
                <h2 id="password-modal-title">{t("profile.security.passwordModalTitle")}</h2>
                <p>{t(passwordStep === "credentials"
                  ? "profile.security.passwordModalDescription"
                  : "profile.security.codeDescription")}</p>
              </div>
              <button type="button" onClick={closePasswordModal} disabled={busyAction === "password"} aria-label={t("common.close")}><X size={18} /></button>
            </header>

            {passwordStep === "credentials" ? (
              <div className="account-modal__fields">
                <Input type="password" value={passwordForm.current} onChange={event => setPasswordForm(current => ({ ...current, current: event.target.value }))} placeholder={t("profile.security.currentPassword")} autoComplete="current-password" aria-label={t("profile.security.currentPassword")} />
                <Input type="password" value={passwordForm.next} onChange={event => setPasswordForm(current => ({ ...current, next: event.target.value }))} placeholder={t("profile.security.newPassword")} autoComplete="new-password" aria-label={t("profile.security.newPassword")} />
                <Input type="password" value={passwordForm.confirmation} onChange={event => setPasswordForm(current => ({ ...current, confirmation: event.target.value }))} placeholder={t("profile.security.confirmPassword")} autoComplete="new-password" aria-label={t("profile.security.confirmPassword")} />
              </div>
            ) : (
              <label className="account-code-field">
                <span>{t("profile.security.codeLabel")}</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={VERIFICATION_CODE_LENGTH}
                  value={passwordCode}
                  onChange={event => setPasswordCode(normalizeVerificationCode(event.target.value))}
                  aria-label={t("profile.security.codeLabel")}
                />
              </label>
            )}

            {passwordError && <p className="account-modal__error">{passwordError}</p>}

            <footer>
              <button type="button" onClick={closePasswordModal} disabled={busyAction === "password"}>{t("common.cancel")}</button>
              {passwordStep === "verification" && (
                <button className="is-secondary" type="button" onClick={sendPasswordCode} disabled={busyAction === "password"}>
                  {t("profile.security.resendCode")}
                </button>
              )}
              <button
                className="is-primary"
                type="button"
                onClick={passwordStep === "credentials" ? sendPasswordCode : verifyPasswordCode}
                disabled={busyAction === "password" || (passwordStep === "verification" && !isVerificationCodeComplete(passwordCode))}
              >
                {busyAction === "password" && <Loader2 className="fcw-animate-spin" size={16} />}
                {t(passwordStep === "credentials"
                  ? "profile.security.sendCode"
                  : "profile.security.confirmChange")}
              </button>
            </footer>
          </section>
        </div>
      )}

      {twoFactorOpen && (
        <div className="account-modal-backdrop">
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="two-factor-modal-title"
          >
            <header>
              <span><LockKeyhole size={20} /></span>
              <div>
                <h2 id="two-factor-modal-title">{t(twoFactorTarget
                  ? "profile.security.twoFactorEnableTitle"
                  : "profile.security.twoFactorDisableTitle")}</h2>
                <p>{t(twoFactorStep === "intent"
                  ? "profile.security.twoFactorModalDescription"
                  : "profile.security.codeDescription")}</p>
              </div>
              <button type="button" onClick={closeTwoFactorModal} disabled={busyAction === "2fa"} aria-label={t("common.close")}><X size={18} /></button>
            </header>

            {twoFactorStep === "verification" && (
              <label className="account-code-field">
                <span>{t("profile.security.codeLabel")}</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={VERIFICATION_CODE_LENGTH}
                  value={twoFactorCode}
                  onChange={event => setTwoFactorCode(normalizeVerificationCode(event.target.value))}
                  aria-label={t("profile.security.codeLabel")}
                />
              </label>
            )}

            {twoFactorError && <p className="account-modal__error">{twoFactorError}</p>}

            <footer>
              <button type="button" onClick={closeTwoFactorModal} disabled={busyAction === "2fa"}>{t("common.cancel")}</button>
              {twoFactorStep === "verification" && (
                <button className="is-secondary" type="button" onClick={sendTwoFactorCode} disabled={busyAction === "2fa"}>
                  {t("profile.security.resendCode")}
                </button>
              )}
              <button
                className="is-primary"
                type="button"
                onClick={twoFactorStep === "intent" ? sendTwoFactorCode : verifyTwoFactorCode}
                disabled={busyAction === "2fa" || (twoFactorStep === "verification" && !isVerificationCodeComplete(twoFactorCode))}
              >
                {busyAction === "2fa" && <Loader2 className="fcw-animate-spin" size={16} />}
                {t(twoFactorStep === "intent"
                  ? "profile.security.sendCode"
                  : "profile.security.confirmChange")}
              </button>
            </footer>
          </section>
        </div>
      )}

      {deleteOpen && (
        <div className="account-modal-backdrop">
          <section
            className="account-modal account-modal--danger"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <header>
              <span><Trash2 size={20} /></span>
              <div>
                <h2 id="delete-modal-title">{t("profile.account.delete")}</h2>
                <p>{t("profile.account.deleteConfirm")}</p>
              </div>
              <button type="button" onClick={closeDeleteModal} disabled={busyAction === "delete"} aria-label={t("common.close")}><X size={18} /></button>
            </header>
            {deleteError && <p className="account-modal__error">{deleteError}</p>}
            <footer>
              <button type="button" onClick={closeDeleteModal} disabled={busyAction === "delete"}>{t("common.cancel")}</button>
              <button className="is-danger" type="button" onClick={removeAccount} disabled={busyAction === "delete"}>
                {busyAction === "delete" && <Loader2 className="fcw-animate-spin" size={16} />}
                {t("profile.account.deleteFinal")}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
