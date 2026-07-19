"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  ChevronDown,
  Cookie,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

import { useAuth } from "@/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";

import { AskMark } from "./AskMark";

/**
 * App chrome (§2): the platform navigation menu from PRODUCT_VISION UF 2.1–2.3.
 *
 * Left: the ASK mark (same artwork as the favicon) links home, in the brand
 * ACCENT (owner decision 2026-07-18) — a logo is brand identity, the one
 * sanctioned accent use beyond an action; the primary/search control stays the
 * only accent UI *affordance*, so "saturation is action" still reads. Middle:
 * the primary destinations — Home (search), Chats, and a role-gated Dashboard
 * shown only to a seller/staff session (UF 3.1), keyed off `user.kind` (R6).
 * Right: the account card — name + initials avatar opening the profile-card
 * dropdown (settings, learn more → About ASK + the legal links, sign out).
 *
 * Mobile-first (§7): under `sm` the destination chips collapse to ICONS (labels
 * return at `sm+`), and the account menu's "Learn more" becomes a flat inline
 * group instead of a sideways fly-out submenu — a phone has neither the room nor
 * the hover a fly-out needs. No hamburger: with only 2–3 destinations, hiding
 * them behind a tap costs discoverability for no space gain.
 *
 * Client component: it reads the live session (`useAuth`) and re-renders when
 * the platform locale switches (LocaleProvider, D18). A server component would
 * freeze on the server locale while the page content switched.
 *
 * The account card is app-chrome scaffolding; the profile-card *content* (real
 * settings, the avatar image once the backend returns one) belongs to the
 * `profile` slice (Feature Index, roadmap #6). Until it lands, Settings routes
 * to its placeholder and the avatar shows initials — no invented data (P9.4).
 */
export function NavigationMenu() {
  const t = useTranslations("app");
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  const handleLogout = useCallback(() => {
    // Best-effort sign-out (hooks clear the local session regardless), then land
    // on the login screen inside the app tree.
    void signOut().finally(() => router.push("/app/auth/login"));
  }, [signOut, router]);

  const isActive = (href: string) =>
    href === "/app"
      ? pathname === "/app"
      : pathname === href || pathname.startsWith(`${href}/`);

  const isSeller = user?.kind === "business" || user?.kind === "staff";
  const isMobile = useIsMobile();

  const links = [
    { href: "/app", label: t("nav.home"), Icon: Home },
    { href: "/app/chats", label: t("nav.chats"), Icon: MessageCircle },
    ...(isSeller
      ? [
          {
            href: "/app/business",
            label: t("nav.dashboard"),
            Icon: LayoutDashboard,
          },
        ]
      : []),
  ];

  // The account menu's "Learn more" group — rendered as a fly-out submenu on
  // desktop and a flat inline list on mobile (see the account card below).
  const learnMoreItems = [
    { href: "/?from=app", label: t("userMenu.about"), Icon: Building2 },
    { href: "/terms", label: t("userMenu.terms"), Icon: ScrollText },
    { href: "/privacy", label: t("userMenu.privacy"), Icon: ShieldCheck },
    { href: "/cookies", label: t("userMenu.cookies"), Icon: Cookie },
  ];

  const displayName = user?.displayName?.trim() || user?.email?.split("@")[0];
  const initials = displayName ? initialsFrom(displayName) : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-raised">
      <nav
        aria-label={t("nav.aria")}
        className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:gap-2"
      >
        <Link
          href="/app"
          aria-label={t("nav.brand")}
          className="mr-1 flex items-center rounded-sm p-1 text-accent focus-ring"
        >
          <AskMark className="size-7" />
        </Link>

        <ul className="flex items-center gap-0.5 sm:gap-1">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-label={link.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 text-sm font-medium focus-ring transition-colors duration-(--duration-fast) ease-out sm:px-3",
                    active
                      ? "text-foreground"
                      : "text-foreground-subtle hover:text-foreground",
                  )}
                >
                  <link.Icon className="size-5 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {status === "loading" ? (
            <div className="flex items-center gap-2" aria-hidden="true">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="user-menu-trigger"
                  aria-label={t("userMenu.aria")}
                  className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm focus-ring transition-colors hover:bg-surface-sunken"
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-foreground-muted"
                    aria-hidden="true"
                  >
                    {initials || <User className="size-4" />}
                  </span>
                  <span className="hidden max-w-32 truncate font-medium text-foreground sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown
                    className="hidden size-4 text-foreground-subtle sm:inline"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  {user.email ? (
                    <span className="truncate text-xs font-normal text-foreground-subtle">
                      {user.email}
                    </span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile">
                    <Settings />
                    {t("userMenu.settings")}
                  </Link>
                </DropdownMenuItem>
                {isMobile ? (
                  // Mobile: a flat, tappable group — no sideways fly-out.
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      {t("userMenu.learnMore")}
                    </DropdownMenuLabel>
                    {learnMoreItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href}>
                          <item.Icon />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  // Desktop: a hover/keyboard fly-out submenu.
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger data-testid="user-menu-learn-more">
                      <Info />
                      {t("userMenu.learnMore")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-60">
                      {learnMoreItems.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href}>
                            <item.Icon />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="user-menu-logout"
                  onSelect={handleLogout}
                >
                  <LogOut />
                  {t("userMenu.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" className="min-h-11">
              <Link href="/app/auth/login">{t("nav.signIn")}</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}

/** Up-to-two-letter initials: first+last word, or the first two letters of a
 *  single word. Falls back to the User glyph when there is no name at all. */
function initialsFrom(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** True on a phone-width viewport (< the `sm` breakpoint). Drives the account
 *  menu's fly-out→flat swap. Starts false so SSR and first paint match (the menu
 *  content only mounts on open, after this has resolved client-side). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}
