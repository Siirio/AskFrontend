import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  BellOff,
  Camera,
  Check,
  FileCheck2,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { ROUTES } from "../../app/routes";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  changePassword,
  confirmEmailChange,
  deleteAccount,
  requestEmailChange,
  toggleTwoFactor,
} from "../../shared/api/authClient";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Input } from "../../shared/ui/Input/Input";

const AVATAR_STORAGE_KEY = "ask.profileAvatar";

type PasswordForm = {
  current: string;
  next: string;
  confirmation: string;
};

export function ProfilePage() {
  const { t } = useTranslation();
  const { state, actions } = useAuth();
  const navigate = useNavigate();
  const user = state.session?.user;
  const isBusiness = Boolean(state.session?.businessMemberships?.length);
  const [avatar, setAvatar] = useState(() => window.localStorage.getItem(AVATAR_STORAGE_KEY) || "");
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ current: "", next: "", confirmation: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => window.localStorage.getItem("ask.notifications") === "granted",
  );
  const [busyAction, setBusyAction] = useState<"profile" | "password" | "2fa" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    if (emailCode.length !== 6) return;
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

  const savePassword = async () => {
    if (!passwordForm.current || passwordForm.next.length < 8 || passwordForm.next !== passwordForm.confirmation) {
      setError(t("profile.security.passwordValidation"));
      return;
    }
    setBusyAction("password");
    setError("");
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirmation: "" });
      setPasswordOpen(false);
      setMessage(t("profile.security.passwordChanged"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("profile.security.passwordError"));
    } finally {
      setBusyAction(null);
    }
  };

  const updateTwoFactor = async () => {
    setBusyAction("2fa");
    setError("");
    try {
      await toggleTwoFactor();
      await actions.refreshSession();
      setMessage(t(state.session?.requiresTwoFactor ? "profile.security.twoFactorDisabled" : "profile.security.twoFactorEnabled"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("profile.security.twoFactorError"));
    } finally {
      setBusyAction(null);
    }
  };

  const updateNotifications = () => {
    if (!("Notification" in window)) return;
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      window.localStorage.setItem("ask.notifications", "denied");
      return;
    }
    Notification.requestPermission().then(permission => {
      const enabled = permission === "granted";
      setNotificationsEnabled(enabled);
      window.localStorage.setItem("ask.notifications", permission);
    });
  };

  const removeAccount = async () => {
    setBusyAction("delete");
    setError("");
    try {
      await deleteAccount();
      await actions.logout();
      navigate(ROUTES.auth, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("profile.account.deleteError"));
      setBusyAction(null);
    }
  };

  const logout = async () => {
    await actions.logout();
    navigate(ROUTES.auth, { replace: true });
  };

  const legalDocuments = isBusiness
    ? [
        { href: "/legal/seller-terms", label: t("legal.seller-terms.title") },
        { href: "/legal/personal-data-consent", label: t("legal.personal-data-consent.title") },
      ]
    : [
        { href: "/legal/user-terms", label: t("legal.user-terms.title") },
        { href: "/legal/privacy", label: t("legal.privacy.title") },
      ];

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
            <p>{t(isBusiness ? "profile.role.business" : "profile.role.customer")}</p>
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
                <input inputMode="numeric" maxLength={6} value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g, ""))} placeholder={t("profile.emailChange.code")} />
                <button type="button" onClick={confirmEmail} disabled={emailCode.length !== 6}>{t("profile.emailChange.confirm")}</button>
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
              <button type="button" onClick={() => setPasswordOpen(value => !value)}>{t("profile.security.change")}</button>
            </div>

            {passwordOpen && (
              <div className="account-password-form">
                <Input type="password" value={passwordForm.current} onChange={event => setPasswordForm(current => ({ ...current, current: event.target.value }))} placeholder={t("profile.security.currentPassword")} autoComplete="current-password" aria-label={t("profile.security.currentPassword")} />
                <Input type="password" value={passwordForm.next} onChange={event => setPasswordForm(current => ({ ...current, next: event.target.value }))} placeholder={t("profile.security.newPassword")} autoComplete="new-password" aria-label={t("profile.security.newPassword")} />
                <Input type="password" value={passwordForm.confirmation} onChange={event => setPasswordForm(current => ({ ...current, confirmation: event.target.value }))} placeholder={t("profile.security.confirmPassword")} autoComplete="new-password" aria-label={t("profile.security.confirmPassword")} />
                <button type="button" onClick={savePassword} disabled={busyAction === "password"}>{t("profile.security.savePassword")}</button>
              </div>
            )}

            <div className="account-setting-row">
              <span><LockKeyhole size={18} /></span>
              <div><strong>{t("profile.security.twoFactor")}</strong><small>{t(state.session?.requiresTwoFactor ? "profile.security.twoFactorOn" : "profile.security.twoFactorOff")}</small></div>
              <button type="button" className={state.session?.requiresTwoFactor ? "is-active" : ""} onClick={updateTwoFactor} disabled={busyAction === "2fa"}>
                {busyAction === "2fa" ? <Loader2 className="fcw-animate-spin" size={15} /> : t(state.session?.requiresTwoFactor ? "profile.security.disable" : "profile.security.enable")}
              </button>
            </div>
          </section>

          <section className="account-section">
            <div className="account-section__heading">
              <span><Bell size={19} /></span>
              <div>
                <h2>{t("profile.preferences.title")}</h2>
                <p>{t("profile.preferences.description")}</p>
              </div>
            </div>
            <div className="account-setting-row">
              <span>{notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}</span>
              <div><strong>{t("profile.notifications")}</strong><small>{t(notificationsEnabled ? "profile.notifications.on" : "profile.notifications.off")}</small></div>
              <button type="button" className={notificationsEnabled ? "is-active" : ""} onClick={updateNotifications}>
                {t(notificationsEnabled ? "profile.security.disable" : "profile.security.enable")}
              </button>
            </div>
          </section>

          <section className="account-section">
            <div className="account-section__heading">
              <span><FileCheck2 size={19} /></span>
              <div>
                <h2>{t("profile.legal.title")}</h2>
                <p>{t(isBusiness ? "profile.legal.businessDescription" : "profile.legal.customerDescription")}</p>
              </div>
            </div>
            <div className="account-legal-list">
              {legalDocuments.map(document => (
                <button key={document.href} type="button" onClick={() => navigate(document.href)}>
                  <FileCheck2 size={17} />
                  <span>{document.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="account-footer">
          <button type="button" onClick={logout}><LogOut size={17} />{t("profile.logout")}</button>
          <button type="button" className="is-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={17} />{t("profile.account.delete")}</button>
        </footer>

        {deleteOpen && (
          <div className="account-delete-confirmation">
            <p>{t("profile.account.deleteConfirm")}</p>
            <div>
              <button type="button" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</button>
              <button type="button" className="is-danger" onClick={removeAccount} disabled={busyAction === "delete"}>
                {busyAction === "delete" && <Loader2 className="fcw-animate-spin" size={15} />}
                {t("profile.account.deleteFinal")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
