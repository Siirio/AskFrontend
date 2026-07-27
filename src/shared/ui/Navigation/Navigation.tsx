import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BriefcaseBusiness,
  Building2,
  FileText,
  Headphones,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  Settings,
  Shield,
  Sun,
  UserRound,
} from "lucide-react";
import { buildRoute, ROUTES } from "../../../app/routes";
import { SupportDrawer } from "../../../widgets/SupportDrawer/SupportDrawer";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useTheme } from "../../../app/providers/ThemeProvider";
import { CitySelector } from "../CitySelector/CitySelector";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import { Modal } from "../Modal/Modal";
import {
  ACTIVE_SEARCH_ROUTE_CHANGED_EVENT,
  readActiveSearchRoute,
} from "../../../entities/search-session/model/activeSearchSession";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

export function Navigation() {
  const { t } = useTranslation();
  const { state, actions } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSearchRoute, setActiveSearchRoute] = useState(
    () => readActiveSearchRoute(window.sessionStorage),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [city, setCity] = useState(
    () => window.localStorage.getItem("ask.city") || t("citySelector.almaty"),
  );

  useEffect(() => {
    setActiveSearchRoute(readActiveSearchRoute(window.sessionStorage));
  }, [location.pathname, location.search]);

  useEffect(() => {
    const refreshActiveSearchRoute = () => {
      setActiveSearchRoute(readActiveSearchRoute(window.sessionStorage));
    };
    window.addEventListener(ACTIVE_SEARCH_ROUTE_CHANGED_EVENT, refreshActiveSearchRoute);
    return () => window.removeEventListener(ACTIVE_SEARCH_ROUTE_CHANGED_EVENT, refreshActiveSearchRoute);
  }, []);

  if (!state.authenticated) return null;

  const memberships = state.session?.businessMemberships ?? [];
  const membership = memberships.find(item => item.businessId === state.activeBusinessId) ?? memberships[0];
  const hasPlatformAccess = Boolean(state.session?.platformMembership);
  const user = state.session?.user;
  const initial = (user?.displayName || user?.email || "A").slice(0, 1).toUpperCase();

  const primaryItems: NavItem[] = [
    { to: activeSearchRoute ?? ROUTES.home, label: t("nav.main"), icon: <Home size={18} /> },
    { to: ROUTES.chats, label: t("nav.chats"), icon: <MessageCircle size={18} /> },
    ...(membership
      ? [{
          to: buildRoute(ROUTES.business, { businessId: membership.businessId }),
          label: t("nav.business"),
          icon: <BriefcaseBusiness size={18} />,
        }]
      : []),
  ];

  const mobileItems: NavItem[] = [
    ...primaryItems,
    { to: ROUTES.profile, label: t("nav.profile"), icon: <UserRound size={19} /> },
  ];

  const logout = async () => {
    await actions.logout();
    navigate(ROUTES.auth, { replace: true });
  };

  const selectCity = (value: string) => {
    setCity(value);
    window.localStorage.setItem("ask.city", value);
  };

  return (
    <>
      <header className="ask-shell-nav">
        <div className="ask-shell-nav__inner">
          <button type="button" className="ask-wordmark" onClick={() => navigate(activeSearchRoute ?? ROUTES.home)}>
            ASK
          </button>

          <nav className="ask-primary-nav" aria-label={t("nav.main")}>
            {primaryItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `ask-primary-nav__link${isActive ? " is-active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ask-shell-nav__actions">
            <CitySelector value={city} onChange={selectCity} compact buttonClassName="ask-city-pill" />
            <button
              type="button"
              className="ask-profile-button"
              aria-label={t("nav.profile")}
              onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                setMenuAnchor({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                setMenuOpen(value => !value);
              }}
            >
              <span aria-hidden="true">{initial}</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="ask-mobile-nav" aria-label={t("nav.main")}>
        {mobileItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => isActive ? "is-active" : ""}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {menuOpen && menuAnchor && createPortal(
        <>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 198, background: "transparent", border: 0 }}
          />
          <div
            className="ask-account-menu"
            style={{ position: "fixed", top: menuAnchor.top, right: menuAnchor.right, zIndex: 199 }}
          >
            <div className="ask-account-menu__identity">
              <span className="ask-account-menu__avatar">{initial}</span>
              <span>
                <strong>{user?.displayName || t("profile.displayNameFallback")}</strong>
                <small>{user?.email || user?.phone || ""}</small>
              </span>
            </div>
            <button type="button" onClick={() => { setMenuOpen(false); navigate(ROUTES.profile); }}>
              <UserRound size={17} />
              {t("business.account")}
            </button>
            {membership && (
              <button type="button" onClick={() => {
                setMenuOpen(false);
                navigate(buildRoute(ROUTES.business, { businessId: membership.businessId }));
              }}>
                <Building2 size={17} />
                {membership.businessName}
              </button>
            )}
            {hasPlatformAccess && (
              <button type="button" onClick={() => { setMenuOpen(false); navigate(ROUTES.platform); }}>
                <Shield size={17} />
                {t("nav.platform")}
              </button>
            )}
            <button type="button" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>
              <Settings size={17} />
              {t("business.settings")}
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); setSupportOpen(true); }}>
              <Headphones size={17} />
              {t("nav.menu.platformSupport")}
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); navigate("/legal/user-terms"); }}>
              <FileText size={17} />
              {t("legal.user-terms.title")}
            </button>
            <button type="button" className="is-danger" onClick={logout}>
              <LogOut size={17} />
              {t("business.signOut")}
            </button>
          </div>
        </>,
        document.body,
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t("business.settings")} size="sm">
        <div className="ask-settings-list">
          <div>
            <span>{theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}</span>
            <strong>{t("business.theme")}</strong>
            <button type="button" className="ask-secondary-button" onClick={toggle}>
              {theme === "dark" ? t("business.themeLight") : t("business.themeDark")}
            </button>
          </div>
          <div>
            <span><Settings size={18} /></span>
            <strong>{t("business.language")}</strong>
            <LanguageSwitcher />
          </div>
        </div>
      </Modal>

      <SupportDrawer
        open={supportOpen}
        businessId={membership?.businessId}
        businessName={membership?.businessName}
        onClose={() => setSupportOpen(false)}
      />
    </>
  );
}
