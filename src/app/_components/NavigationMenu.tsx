"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, LayoutDashboard, MessageCircle } from "lucide-react";

import { canAccessDashboard, useAuth } from "@/auth";
import { useIsMobile } from "@/lib/useIsMobile";

import { AccountMenu } from "./AccountMenu";
import { AskMark } from "./AskMark";
import { useNavIndicator } from "./useNavIndicator";

/**
 * App chrome (§2): the platform navigation menu from PRODUCT_VISION UF 2.1–2.3.
 *
 * Renders ONLY for an authenticated session: it lives inside the `(main)`
 * layout's RequireAuth gate, so a logged-out visitor is redirected to login
 * before it mounts. There is therefore no signed-out "sign in" entry here
 * (owner rule 4) — the account card is always present.
 *
 * Two ENTIRELY DIFFERENT layouts, not one responsive bar (owner decision
 * 2026-07-28, the neumorui bottom-nav pattern):
 *
 *   Desktop/tablet (`sm+`) — a sticky top `<header>`. Left: the ASK mark
 *   (same artwork as the favicon), brand ACCENT (owner decision 2026-07-18).
 *   Middle: the destinations — Home (search), Chats, a role-gated Dashboard
 *   (UF 3.1, `canAccessDashboard` — the SAME predicate the
 *   RequireDashboardAccess route guard uses, P6.2). Right: the account card.
 *
 *   Mobile (`<sm`) — NO top bar at all. A fixed bottom bar (§7: a phone's
 *   thumb reaches the bottom, not the top-right) carries ONLY the primary
 *   destinations as stacked icon-over-label tabs — no account tab, so the
 *   bar stays a pure "where am I" control. The account entry point is a
 *   floating burger button (see `AccountMenu` for why that is the one
 *   sanctioned hamburger exception).
 *
 * One shared `.neu-nav-indicator` (GSAP, `useNavIndicator`, D14) slides beneath
 * whichever destination is current in EITHER layout.
 *
 * **Split 2026-08-01 (P1.1).** This file was 523 lines — one component holding
 * the destinations, the desktop dropdown, the mobile sheet and the indicator
 * tween. It now owns only what those two layouts share: the destination list
 * and which layout renders. The account card is `AccountMenu` (it changes with
 * the profile surface, not with navigation) and the tween is `useNavIndicator`
 * (one responsibility, no rendering). Nothing about the rendered output moved.
 *
 * Client component: it reads the live session (`useAuth`) and re-renders when
 * the platform locale switches (LocaleProvider, D18). A server component would
 * freeze on the server locale while the page content switched.
 */
export function NavigationMenu() {
  const t = useTranslations("app");
  const pathname = usePathname();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const isActive = (href: string) =>
    href === "/app"
      ? pathname === "/app"
      : pathname === href || pathname.startsWith(`${href}/`);

  const links = [
    { href: "/app", label: t("nav.home"), Icon: Home },
    { href: "/app/chats", label: t("nav.chats"), Icon: MessageCircle },
    ...(canAccessDashboard(user)
      ? [
          {
            href: "/app/business",
            label: t("nav.dashboard"),
            Icon: LayoutDashboard,
          },
        ]
      : []),
  ];
  const activeHref = links.find((link) => isActive(link.href))?.href;

  const { navListRef, indicatorRef, registerLink } = useNavIndicator(
    activeHref,
    isMobile,
  );

  // The destination link, shared by both layouts below — a row icon+label on
  // the desktop top bar, a stacked icon-over-label column in the mobile
  // bottom bar (the neumorui bottom-nav pattern: thumb-zone placement per
  // platform-ui-design §7). Same `.neu-nav-link` skin, same ref wiring, so
  // ONE `.neu-nav-indicator` drives whichever layout is mounted.
  const renderLink = (
    link: (typeof links)[number],
    variant: "row" | "stacked",
  ) => {
    const active = isActive(link.href);
    return (
      <li
        key={link.href}
        className={variant === "stacked" ? "flex-1" : undefined}
      >
        <Link
          ref={registerLink(link.href)}
          href={link.href}
          aria-label={link.label}
          aria-current={active ? "page" : undefined}
          data-active={active}
          className={
            variant === "row"
              ? "neu-nav-link flex min-h-11 min-w-11 items-center gap-2 px-3 text-sm focus-ring sm:px-4"
              : "neu-nav-link neu-nav-link--stacked flex h-14 w-full flex-col items-center justify-center gap-1 text-xs focus-ring"
          }
        >
          <link.Icon className="size-4" aria-hidden="true" />
          <span className={variant === "row" ? "hidden sm:inline" : undefined}>
            {link.label}
          </span>
        </Link>
      </li>
    );
  };

  // Desktop/tablet only (§7): brand + destinations + account live in one
  // sticky top bar. On mobile there is no top bar at all (owner decision
  // 2026-07-28) — the destinations move to a fixed, destinations-ONLY bottom
  // bar, and the account entry point becomes a floating burger button.
  if (isMobile) {
    return (
      <>
        <AccountMenu variant="burger" />
        <nav
          aria-label={t("nav.aria")}
          className="neu-bottom-nav fixed inset-x-0 bottom-0 z-40"
        >
          {/* The neumorui bottom-nav pattern (owner-linked reference,
              2026-07-28): destinations only, sharing one `.neu-nav-indicator`.
              `.neu-skin` reserves the matching space at the foot of the page
              (`:has()`, neumorphism.css) so content never sits underneath it. */}
          <ul ref={navListRef} className="relative flex items-stretch">
            <span
              ref={indicatorRef}
              className="neu-nav-indicator"
              aria-hidden="true"
            />
            {links.map((link) => renderLink(link, "stacked"))}
          </ul>
        </nav>
      </>
    );
  }

  return (
    <header className="neu-topbar sticky top-0 z-40">
      <nav
        aria-label={t("nav.aria")}
        className="relative mx-auto flex h-18 max-w-6xl items-center gap-1 px-4 sm:gap-2"
      >
        <Link
          href="/app"
          aria-label={t("nav.brand")}
          className="mr-1 flex items-center rounded-sm p-1 text-accent focus-ring"
        >
          <AskMark className="size-7" />
        </Link>

        {/* Each destination floats as its OWN glass pill (`.neu-nav-link`)
            over the topbar's translucency, rather than living inside one
            shared groove — navigating between pages reads as picking a
            place, not a segmented setting (that idiom stays on
            `.neu-tab-list`: theme/language toggles, filter chips). Centred
            on the bar (owner request 2026-07-28) via absolute positioning,
            independent of the logo/account widths either side of it. */}
        <ul
          ref={navListRef}
          className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
        >
          <span
            ref={indicatorRef}
            className="neu-nav-indicator"
            aria-hidden="true"
          />
          {links.map((link) => renderLink(link, "row"))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <AccountMenu variant="row" />
        </div>
      </nav>
    </header>
  );
}
