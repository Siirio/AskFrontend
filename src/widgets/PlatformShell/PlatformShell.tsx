import type { ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { ROUTES } from "../../app/routes";
import {
  PLATFORM_NAVIGATION,
  type PlatformEventCounts,
  type PlatformSection,
} from "./platformTypes";
import "./PlatformShell.css";

type Props = {
  activeSection: PlatformSection;
  eventCounts: PlatformEventCounts;
  onSectionChange: (section: PlatformSection) => void;
  children: ReactNode;
};

const SECTION_ICONS = {
  summary: LayoutDashboard,
  businesses: Building2,
  chats: MessageSquareText,
  accounts: UsersRound,
  team: UserRoundCog,
} satisfies Record<PlatformSection, typeof LayoutDashboard>;

function EventCounters({ review, critical }: { review: number; critical: number }) {
  if (review === 0 && critical === 0) return null;

  return (
    <span className="platform-nav-events" aria-label={`На проверке: ${review}, критических: ${critical}`}>
      {review > 0 && <span className="platform-event-count platform-event-count--review">{review}</span>}
      {critical > 0 && <span className="platform-event-count platform-event-count--critical">{critical}</span>}
    </span>
  );
}

export function PlatformShell({ activeSection, eventCounts, onSectionChange, children }: Props) {
  const { state, actions } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const membership = state.session?.platformMembership;
  const permissions = new Set(membership?.permissions ?? []);
  const visibleNavigation = PLATFORM_NAVIGATION.filter(item => (
    !item.permission
    || permissions.has(item.permission)
    || permissions.has("MODERATE_CONTENT")
  ));

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div>
          <div className="platform-brand">
            <span className="platform-brand-mark"><ShieldCheck size={19} /></span>
            <span>
              <strong>Ask</strong>
              <small>{t("platform.workspace")}</small>
            </span>
          </div>

          <nav className="platform-navigation" aria-label={t("platform.navigation")}>
            {visibleNavigation.map(item => {
              const Icon = SECTION_ICONS[item.section];
              const active = activeSection === item.section;
              return (
                <button
                  key={item.section}
                  type="button"
                  className={`platform-nav-button${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSectionChange(item.section)}
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{t(`platform.sections.${item.section}`)}</span>
                  <EventCounters {...eventCounts[item.section]} />
                  <ChevronRight className="platform-nav-chevron" size={15} />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="platform-member">
          <div className="platform-member-avatar">
            {(state.session?.user?.displayName || state.session?.user?.email || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="platform-member-copy">
            <strong>{state.session?.user?.displayName || state.session?.user?.email}</strong>
            <span>{membership ? t(`platform.users.role.${membership.role}`) : ""}</span>
          </div>
          <button
            type="button"
            className="platform-signout"
            aria-label={t("auth.signOut")}
            onClick={() => {
              actions.logout();
              navigate(ROUTES.home);
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="platform-mobile-rail">
        {visibleNavigation.map(item => {
          const Icon = SECTION_ICONS[item.section];
          return (
            <button
              key={item.section}
              type="button"
              className={activeSection === item.section ? "is-active" : ""}
              onClick={() => onSectionChange(item.section)}
            >
              <Icon size={17} />
              <span>{t(`platform.sections.${item.section}`)}</span>
              <EventCounters {...eventCounts[item.section]} />
            </button>
          );
        })}
      </div>

      <main className="platform-main">{children}</main>
    </div>
  );
}

