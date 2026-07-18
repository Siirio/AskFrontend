import { useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, MessageCircle, UserRound, Sun, Moon, LogOut, Building2, Settings, Shield, Key, Check, Loader2 } from "lucide-react";
import { buildRoute, ROUTES } from "../../../app/routes";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useTheme } from "../../../app/providers/ThemeProvider";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import { Modal } from "../Modal/Modal";
import { useToast } from "../Toast/Toast";
import { ProfileEditor } from "../../../widgets/ProfileEditor/ProfileEditor";
import { getBrandProfile, updateBrandProfile } from "../../../shared/api/askClient";
import { changePassword } from "../../../shared/api/authClient";
import { ApiError } from "../../../shared/api/httpClient";
import { isStrongPassword } from "../../utils/validation";
import type { BrandProfileDto } from "../../../shared/api/dto";

export function Navigation() {
  const { t } = useTranslation();
  const { state, actions } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();

  const businessMemberships = state.session?.businessMemberships ?? [];
  const selectedMembership = businessMemberships.find(
    membership => membership.businessId === state.activeBusinessId,
  ) ?? businessMemberships[0];
  const businessId = selectedMembership?.businessId ?? "";
  const hasPlatformAccess = Boolean(state.session?.platformMembership);

  // User menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<"brand" | "security">("brand");

  // Profile
  const DEFAULT_BRAND_COLOR = "#e8824e";
  const [profile, setProfile] = useState<BrandProfileDto>(() => ({
    businessId,
    brandColor: DEFAULT_BRAND_COLOR,
    logoUrl: "",
    coverUrl: "",
    toneOfVoice: "",
    description: "",
    instagramUrl: "",
    telegramUrl: "",
    websiteUrl: "",
  }));
  const [profileBusy, setProfileBusy] = useState(false);

  // Password
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);

  const loadProfile = async () => {
    if (!businessId) return;
    try {
      const p = await getBrandProfile(businessId);
      setProfile(p);
    } catch { /* ignore */ }
  };

  const handleSaveProfile = async () => {
    if (!businessId) return;
    setProfileBusy(true);
    try {
      const saved = await updateBrandProfile(businessId, profile);
      setProfile(saved);
      toast.show(t("business.toast.profileSaved"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.saveError"), "error");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.show(t("business.passwordMismatch"), "error");
      return;
    }
    const pwCheck = isStrongPassword(passwordForm.newPass);
    if (!pwCheck.valid) {
      toast.show(t(pwCheck.reason === "tooShort" ? "business.validation.passwordTooShort" : "business.validation.passwordWeak"), "error");
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(passwordForm.current, passwordForm.newPass);
      setPasswordForm({ current: "", newPass: "", confirm: "" });
      toast.show(t("business.passwordChanged"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("business.toast.saveError"), "error");
    } finally {
      setPasswordBusy(false);
    }
  };

  const consumerDesktopLinks = [
    { to: ROUTES.home, label: t("nav.main"), icon: <Home size={18} /> },
    { to: ROUTES.chats, label: t("nav.chats"), icon: <MessageCircle size={18} /> },
    ...(selectedMembership ? [{
      to: buildRoute(ROUTES.business, { businessId: selectedMembership.businessId }),
      label: t("nav.business"),
      icon: <Building2 size={18} />,
    }] : []),
    ...(hasPlatformAccess ? [{
      to: ROUTES.platform,
      label: t("nav.platform"),
      icon: <Shield size={18} />,
    }] : []),
  ];

  const consumerMobileLinks = [
    { to: ROUTES.home, label: t("nav.main"), icon: <Home size={20} /> },
    { to: ROUTES.chats, label: t("nav.chats"), icon: <MessageCircle size={20} /> },
    ...(selectedMembership ? [{
      to: buildRoute(ROUTES.business, { businessId: selectedMembership.businessId }),
      label: t("nav.business"),
      icon: <Building2 size={20} />,
    }] : []),
    ...(hasPlatformAccess ? [{
      to: ROUTES.platform,
      label: t("nav.platform"),
      icon: <Shield size={20} />,
    }] : []),
    { to: ROUTES.profile, label: t("nav.profile"), icon: <UserRound size={20} /> },
  ];

  if (!state.authenticated) return null;
  const handleLogout = async () => {
    await actions.logout();
    navigate(ROUTES.auth, { replace: true });
  };

  return (
    <>
      {/* Desktop top nav */}
      <nav
        className="fcw-fixed fcw-z-sticky fcw-w-full fcw-border-bottom fcw-hidden-mobile"
        style={{
          top: 0, left: 0, right: 0, height: "56px",
          backdropFilter: "var(--fcw-blur-glass)",
          WebkitBackdropFilter: "var(--fcw-blur-glass)",
          backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 88%, transparent)",
        }}
      >
        <div className="fcw-container fcw-h-full fcw-flex-between">
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
            <button
              className="fcw-btn fcw-btn-ghost fcw-weight-bold"
              style={{ fontSize: "var(--fcw-font-size-body-l)", color: "var(--fcw-color-primary)", padding: "0 0.5rem" }}
              onClick={() => navigate(ROUTES.home)}
            >
              ASK
            </button>
            {consumerDesktopLinks.map(link => (
              <NavLink
                key={link.label}
                to={link.to}
                className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                style={({ isActive }) => ({
                  color: isActive ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                })}
              >
                {link.icon}
                <span className="fcw-body-s">{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
            {state.session && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    setUserMenuOpen(v => !v);
                  }}
                  style={{ borderRadius: "var(--fcw-radius-full)" }}
                  aria-label={t("nav.profile")}
                >
                  <UserRound size={18} />
                </button>
            )}
          </div>
        </div>
      </nav>

      {/* Desktop spacer */}
      <div className="fcw-hidden-mobile" style={{ height: "56px" }} aria-hidden="true" />

      {/* Mobile bottom nav */}
      <nav
        className="fcw-fixed fcw-z-sticky fcw-w-full fcw-hidden-desktop fcw-border-top"
        style={{
          bottom: 0, left: 0, right: 0, height: "64px",
          backdropFilter: "var(--fcw-blur-glass)",
          WebkitBackdropFilter: "var(--fcw-blur-glass)",
          backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 92%, transparent)",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        <div className="fcw-flex fcw-h-full" style={{ gap: 0 }}>
          {consumerMobileLinks.map(link => (
            <NavLink
              key={link.label}
              to={link.to}
              className="fcw-flex-1 fcw-flex-center fcw-flex-col"
              style={({ isActive }) => ({
                color: isActive ? "var(--fcw-color-primary)" : "var(--fcw-color-text-tertiary)",
                textDecoration: "none",
                gap: "2px",
              })}
            >
              {link.icon}
              <span className="fcw-label" style={{ fontSize: "0.625rem", letterSpacing: "0.03em" }}>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile top bar — minimal, logo + controls */}
      <nav
        className="fcw-fixed fcw-z-sticky fcw-w-full fcw-hidden-desktop"
        style={{
          top: 0, left: 0, right: 0, height: "48px",
          backdropFilter: "var(--fcw-blur-glass)",
          WebkitBackdropFilter: "var(--fcw-blur-glass)",
          backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 88%, transparent)",
        }}
      >
        <div className="fcw-flex-between fcw-h-full" style={{ padding: "0 var(--fcw-space-sm)" }}>
          <button
            className="fcw-btn fcw-btn-ghost fcw-weight-bold"
            style={{ fontSize: "var(--fcw-font-size-body)", color: "var(--fcw-color-primary)", padding: "0 0.25rem" }}
            onClick={() => navigate(ROUTES.home)}
          >
            ASK
          </button>
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.125rem" }}>
            {state.session && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    setUserMenuOpen(v => !v);
                  }}
                  aria-label={t("nav.profile")}
                >
                  <UserRound size={18} />
                </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile spacers */}
      <div className="fcw-hidden-desktop" style={{ height: "48px" }} aria-hidden="true" />
      <div className="fcw-hidden-desktop" style={{ height: "64px" }} aria-hidden="true" />

      {/* Account Modal */}
      <Modal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} title={t("business.account")} size="lg">
        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
          <div className="fcw-flex" style={{ gap: 0, borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", paddingBottom: 0 }}>
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{
                color: accountTab === "brand" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                borderBottom: accountTab === "brand" ? "2px solid var(--fcw-color-primary)" : "2px solid transparent",
                borderRadius: 0,
                marginBottom: -1,
              }}
              onClick={() => setAccountTab("brand")}
            >
              <Building2 size={14} />{t("business.brand")}
            </button>
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{
                color: accountTab === "security" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                borderBottom: accountTab === "security" ? "2px solid var(--fcw-color-primary)" : "2px solid transparent",
                borderRadius: 0,
                marginBottom: -1,
              }}
              onClick={() => setAccountTab("security")}
            >
              <Shield size={14} />{t("business.security")}
            </button>
          </div>

          {accountTab === "brand" && (
            <ProfileEditor
              profile={profile}
              onChange={setProfile}
              onSave={handleSaveProfile}
              busy={profileBusy}
              readOnly={selectedMembership?.role === "WORKER"}
            />
          )}

          {accountTab === "security" && (
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
              <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Key size={16} style={{ color: "var(--fcw-color-primary)" }} />
                  {t("business.changePassword")}
                </h3>
                <div className="fcw-flex-col" style={{ gap: "0.5rem", maxWidth: 360 }}>
                  <input
                    className="fcw-input"
                    type="password"
                    placeholder={t("business.currentPassword")}
                    value={passwordForm.current}
                    onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                  />
                  <input
                    className="fcw-input"
                    type="password"
                    placeholder={t("business.newPassword")}
                    value={passwordForm.newPass}
                    onChange={e => setPasswordForm(p => ({ ...p, newPass: e.target.value }))}
                  />
                  <input
                    className="fcw-input"
                    type="password"
                    placeholder={t("business.confirmPassword")}
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                  />
                  <button
                    className="fcw-btn fcw-btn-primary fcw-btn-sm"
                    style={{ alignSelf: "flex-start" }}
                    onClick={handleChangePassword}
                    disabled={passwordBusy || !passwordForm.current || !passwordForm.newPass || !passwordForm.confirm}
                  >
                    {passwordBusy ? <Loader2 size={14} className="fcw-animate-spin" /> : <Check size={14} />}
                    {t("business.save")}
                  </button>
                </div>
              </div>

              <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
                <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={16} style={{ color: "var(--fcw-color-primary)" }} />
                  {t("business.twoFactorSetup")}
                </h3>
                <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>{t("business.twoFactorDesc")}</p>
                <div style={{
                  padding: "var(--fcw-space-md)",
                  borderRadius: "var(--fcw-radius-md)",
                  backgroundColor: "var(--fcw-color-surface-secondary)",
                  border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                  textAlign: "center",
                }}>
                  <span className="fcw-body-s fcw-text-tertiary">{t("business.twoFactorComingSoon")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* User Dropdown — portalled to body to escape nav backdrop-filter stacking context */}
      {userMenuOpen && menuAnchor && createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setUserMenuOpen(false)}
          />
          <div style={{
            position: "fixed",
            top: menuAnchor.top,
            right: menuAnchor.right,
            zIndex: 200,
            minWidth: 180,
            backgroundColor: "var(--fcw-color-surface)",
            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
            borderRadius: "var(--fcw-radius-md)",
            boxShadow: "var(--fcw-shadow-lg)",
            padding: "0.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.125rem",
          }}>
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{ justifyContent: "flex-start", gap: "0.5rem", width: "100%" }}
              onClick={() => { setAccountModalOpen(true); setUserMenuOpen(false); setAccountTab("brand"); loadProfile(); }}
            >
              <UserRound size={14} />{t("business.account")}
            </button>
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{ justifyContent: "flex-start", gap: "0.5rem", width: "100%" }}
              onClick={() => { setSettingsModalOpen(true); setUserMenuOpen(false); }}
            >
              <Settings size={14} />{t("business.settings")}
            </button>
            <div style={{ height: 1, backgroundColor: "var(--fcw-color-border)", margin: "0.125rem 0" }} />
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{ justifyContent: "flex-start", gap: "0.5rem", width: "100%", color: "var(--fcw-color-error)" }}
              onClick={() => { setUserMenuOpen(false); handleLogout(); }}
            >
              <LogOut size={14} />{t("business.signOut")}
            </button>
          </div>
        </>,
        document.body,
      )}

      {/* Settings Modal */}
      <Modal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title={t("business.settings")} size="sm">
        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
          <div className="fcw-flex-between fcw-items-center">
            <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              <span className="fcw-body fcw-weight-medium">{t("business.theme")}</span>
            </div>
            <button
              className="fcw-btn fcw-btn-secondary fcw-btn-sm"
              onClick={toggle}
              style={{ gap: "0.375rem" }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? t("business.themeLight") : t("business.themeDark")}
            </button>
          </div>

          <div className="fcw-flex-between fcw-items-center">
            <span className="fcw-body fcw-weight-medium">{t("business.language")}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </Modal>
    </>
  );
}
