import { type ReactNode } from "react";
import {
  LayoutDashboard, Building2, Upload, MessageCircle,
  ShieldAlert, Users, Inbox, ChevronLeft, LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useTranslation } from "react-i18next";
import { ROUTES } from "../../app/routes";
import "./AdminLayout.css";

type Section =
  | "dashboard"
  | "businesses"
  | "managedImports"
  | "support"
  | "moderation"
  | "users"
  | "requests";

type Props = {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  children: ReactNode;
};

type NavItem = {
  key: Section;
  icon: typeof LayoutDashboard;
  permission?: string;
};

export function AdminLayout({ activeSection, onSectionChange, children }: Props) {
  const { state, actions } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = new Set(state.session?.platformMembership?.permissions ?? []);

  const navItems: NavItem[] = [
    { key: "dashboard", icon: LayoutDashboard },
    { key: "businesses", icon: Building2 },
    { key: "managedImports", icon: Upload, permission: "MANAGE_MANAGED_IMPORTS" },
    { key: "support", icon: MessageCircle, permission: "MANAGE_SUPPORT_CHATS" },
    { key: "moderation", icon: ShieldAlert, permission: "MODERATE_CONTENT" },
    { key: "users", icon: Users, permission: "MANAGE_PLATFORM_USERS" },
    { key: "requests", icon: Inbox },
  ];

  const visibleItems = navItems.filter(
    item => !item.permission || permissions.has(item.permission)
  );

  const membership = state.session?.platformMembership;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-sidebar-brand">
            <ShieldAlert size={20} style={{ color: "var(--fcw-color-primary)" }} />
            <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>
              ASK Admin
            </span>
          </div>
          <nav className="admin-sidebar-nav">
            {visibleItems.map(item => {
              const Icon = item.icon;
              const active = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  className={`admin-nav-item ${active ? "admin-nav-item--active" : ""}`}
                  onClick={() => onSectionChange(item.key)}
                >
                  <Icon size={18} />
                  <span className="fcw-body-s">{t(`platform.sections.${item.key}`)}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-user">
            <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
              <span className="fcw-body-s fcw-weight-medium" style={{
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {state.session?.user?.displayName}
              </span>
              <span className="fcw-body-xs fcw-text-tertiary">
                {membership ? t(`platform.users.role.${membership.role}`) : ""}
              </span>
            </div>
          </div>
          <button
            className="admin-nav-item"
            onClick={() => {
              actions.logout();
              navigate(ROUTES.home);
            }}
          >
            <LogOut size={18} />
            <span className="fcw-body-s">{t("auth.signOut")}</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
