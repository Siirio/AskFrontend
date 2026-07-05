import { NavLink, useNavigate } from "react-router-dom";
import { Search, History, MessageCircle, UserRound, Sun, LogOut, Building2 } from "lucide-react";
import { ROUTES } from "../../../app/routes";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useTheme } from "../../../app/providers/ThemeProvider";

const consumerDesktopLinks = [
  { to: ROUTES.home, label: "Поиск", icon: <Search size={18} /> },
  { to: ROUTES.history, label: "История", icon: <History size={18} /> },
  { to: ROUTES.chats, label: "Чаты", icon: <MessageCircle size={18} /> },
];

const consumerMobileLinks = [
  { to: ROUTES.home, label: "Поиск", icon: <Search size={20} /> },
  { to: ROUTES.history, label: "История", icon: <History size={20} /> },
  { to: ROUTES.profile, label: "Профиль", icon: <UserRound size={20} /> },
];

const businessMobileLinks = [
  { to: ROUTES.business, label: "Обзор", icon: <Building2 size={20} /> },
  { to: ROUTES.profile, label: "Профиль", icon: <UserRound size={20} /> },
];

export function Navigation() {
  const { state, actions } = useAuth();
  const { toggle } = useTheme();
  const navigate = useNavigate();

  if (state.view === "auth") return null;

  const isBusiness = state.view === "business" || state.view === "staff";
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
              onClick={() => navigate(isBusiness ? ROUTES.business : ROUTES.home)}
            >
              ASK
            </button>
            {!isBusiness && consumerDesktopLinks.map(link => (
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
            <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={toggle} aria-label="Переключить тему">
              <Sun size={16} />
            </button>
            {state.session && (
              <>
                <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={handleLogout} aria-label="Выйти">
                  <LogOut size={16} />
                </button>
                {!isBusiness && (
                  <button
                    className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                    style={{ color: "var(--fcw-color-text-secondary)" }}
                    onClick={() => navigate(ROUTES.profile)}
                  >
                    <UserRound size={16} />
                    <span className="fcw-body-s">Профиль</span>
                  </button>
                )}
              </>
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
          {(isBusiness ? businessMobileLinks : consumerMobileLinks).map(link => (
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
            <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={toggle} aria-label="Переключить тему">
              <Sun size={16} />
            </button>
            {state.session && (
              <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={handleLogout} aria-label="Выйти">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile spacers */}
      <div className="fcw-hidden-desktop" style={{ height: "48px" }} aria-hidden="true" />
      <div className="fcw-hidden-desktop" style={{ height: "64px" }} aria-hidden="true" />
    </>
  );
}
