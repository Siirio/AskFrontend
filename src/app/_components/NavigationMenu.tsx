"use client";

import { useCallback, useRef } from "react";
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
  Menu,
  MessageCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

import { canAccessDashboard, useAuth } from "@/auth";
import { useIsMobile } from "@/lib/useIsMobile";
import {
  gsap,
  prefersReducedMotion,
  useGSAP,
  withMotion,
} from "@/shared/motion";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { Skeleton } from "@/shared/ui/skeleton";

import { AskMark } from "./AskMark";

/** One row in the account menu's "Learn more" group. `Icon` is a lucide glyph. */
type LearnMoreLink = { href: string; label: string; Icon: typeof Building2 };

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
 *   RequireDashboardAccess route guard uses, P6.2). Right: the account card,
 *   name + initials avatar opening the profile-card dropdown.
 *
 *   Mobile (`<sm`) — NO top bar at all. A fixed bottom bar (§7: a phone's
 *   thumb reaches the bottom, not the top-right) carries ONLY the primary
 *   destinations as stacked icon-over-label tabs — no account tab, so the
 *   bar stays a pure "where am I" control. The account entry point is a
 *   floating BURGER button, top-right (owner request 2026-07-28): the one
 *   sanctioned exception to "no hamburger" (§7), because that rule protects
 *   PRIMARY destinations from a discoverability tax, and this button holds
 *   only secondary controls that were always one tap behind an avatar
 *   anyway. It opens a full-height account SHEET (`shared/ui/sheet`), not
 *   the desktop's popover — there is no small anchor to hang a dropdown off
 *   once the top bar is gone, and "Learn more" is spelled out flat in the
 *   sheet's own room rather than a sideways fly-out.
 *
 * One shared `.neu-nav-indicator` (GSAP, shared/motion.ts, D14) slides
 * beneath whichever destination is current in EITHER layout — see the
 * effect below for the FLIP-style transform-only tween.
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

  const canSeeDashboard = canAccessDashboard(user);
  const isMobile = useIsMobile();

  const links = [
    { href: "/app", label: t("nav.home"), Icon: Home },
    { href: "/app/chats", label: t("nav.chats"), Icon: MessageCircle },
    ...(canSeeDashboard
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

  // The travelling selection pill (`.neu-nav-indicator`) — a FLIP-style tween
  // driven through shared/motion.ts (D14): on every active-link change it
  // reads the OLD rect, instantly snaps the indicator's box to the NEW one,
  // then plays the visual difference back as `x` + `scaleX` only (the
  // transform/opacity motion LOCK) so the resize itself never animates,
  // just the compensating transform. Ends at scale 1 — no left-over
  // distortion once it settles over the current page's link.
  const navListRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const prevRectRef = useRef<{ x: number; width: number } | null>(null);
  const prevListRef = useRef<HTMLUListElement | null>(null);

  useGSAP(
    () => {
      const list = navListRef.current;
      const indicator = indicatorRef.current;
      const target = activeHref ? linkRefs.current.get(activeHref) : null;
      if (!list || !indicator || !target) return;

      // The top bar and the mobile bottom bar are two DIFFERENT `<ul>`s (only
      // one mounts at a time). Swapping between them on a breakpoint change
      // must SNAP, not slide across the screen — the "previous" rect belongs
      // to a container that no longer exists.
      const listSwapped = prevListRef.current !== list;
      prevListRef.current = list;

      const listRect = list.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextX = targetRect.left - listRect.left;
      const nextWidth = targetRect.width;
      const prev = listSwapped ? null : prevRectRef.current;
      prevRectRef.current = { x: nextX, width: nextWidth };

      if (!prev || prefersReducedMotion()) {
        gsap.set(indicator, { x: nextX, width: nextWidth, opacity: 1 });
        return;
      }

      // Invert: sit the (now-resized) indicator visually back where it WAS.
      gsap.set(indicator, {
        x: prev.x,
        width: nextWidth,
        scaleX: prev.width / nextWidth,
        transformOrigin: "left center",
        opacity: 1,
      });
      const mm = withMotion(() => {
        gsap.to(indicator, {
          x: nextX,
          scaleX: 1,
          duration: 0.35,
          ease: "ask-out",
        });
      });
      return () => mm.revert();
    },
    { dependencies: [activeHref, isMobile], scope: navListRef },
  );

  // The "Learn more" group — About ASK (the company page) split from the
  // three legal pages so a divider can separate them (owner request).
  const aboutItems: LearnMoreLink[] = [
    { href: "/?from=app", label: t("userMenu.about"), Icon: Building2 },
  ];
  const legalItems: LearnMoreLink[] = [
    { href: "/terms", label: t("userMenu.terms"), Icon: ScrollText },
    { href: "/privacy", label: t("userMenu.privacy"), Icon: ShieldCheck },
    { href: "/cookies", label: t("userMenu.cookies"), Icon: Cookie },
  ];

  const displayName = user?.displayName?.trim() || user?.email?.split("@")[0];
  const initials = displayName ? initialsFrom(displayName) : "";

  // Desktop: the profile-card DROPDOWN, opened from the name+chevron button
  // in the top bar — "Learn more" is a hover/keyboard fly-out submenu, since
  // there is no room for a flat list in a popover this size.
  const renderAccountDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="user-menu-trigger"
          aria-label={t("userMenu.aria")}
          className="neu-btn neu-btn-sm flex min-h-11 items-center gap-2 rounded-full p-1 text-sm focus-ring sm:py-1 sm:pr-3 sm:pl-1"
        >
          <span className="neu-avatar size-8 text-xs" aria-hidden="true">
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
          {user?.email ? (
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid="user-menu-learn-more">
            <Info />
            {t("userMenu.learnMore")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            {aboutItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <item.Icon />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {legalItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <item.Icon />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
  );

  // Mobile: the account SHEET, opened from a floating BURGER button (owner
  // request, 2026-07-28) — not a 4th bottom-nav tab. The bottom bar is
  // destinations-only; a burger is the one exception to "no hamburger" (§7)
  // because that rule protects the PRIMARY destinations from discoverability
  // loss, and this button holds only secondary/account controls, which were
  // always one tap behind an avatar anyway. Floats top-right — the one
  // remaining piece of "chrome" once the top bar is gone — so it reads as
  // reachable without re-introducing a bar. Every row inside is a plain,
  // full-width tap target, wrapped in `SheetClose asChild` so picking one
  // closes the panel the same way a link navigating away would.
  const renderAccountSheet = () => (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="user-menu-trigger"
          aria-label={t("userMenu.aria")}
          className="neu-btn neu-btn-icon fixed top-4 right-4 z-40 rounded-full focus-ring"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="flex-row items-center gap-3">
          <span className="neu-avatar size-12 text-sm" aria-hidden="true">
            {initials || <User className="size-5" />}
          </span>
          <div className="flex min-w-0 flex-col">
            <SheetTitle className="truncate">{displayName}</SheetTitle>
            {user?.email ? (
              <span className="truncate text-xs text-foreground-subtle">
                {user.email}
              </span>
            ) : null}
          </div>
        </SheetHeader>

        <div className="neu-rule my-3" />

        <nav className="flex flex-col gap-0.5" aria-label={t("userMenu.aria")}>
          <SheetClose asChild>
            <Link href="/app/profile" className="neu-sheet-item">
              <Settings className="size-5" aria-hidden="true" />
              {t("userMenu.settings")}
            </Link>
          </SheetClose>
        </nav>

        <p className="mt-4 mb-1 px-3 text-xs font-semibold text-foreground-subtle uppercase">
          {t("userMenu.learnMore")}
        </p>
        <nav
          className="flex flex-col gap-0.5"
          aria-label={t("userMenu.learnMore")}
        >
          {aboutItems.map((item) => (
            <SheetClose key={item.href} asChild>
              <Link href={item.href} className="neu-sheet-item">
                <item.Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </SheetClose>
          ))}
          {legalItems.map((item) => (
            <SheetClose key={item.href} asChild>
              <Link href={item.href} className="neu-sheet-item">
                <item.Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto pt-3">
          <div className="neu-rule mb-3" />
          <SheetClose asChild>
            <button
              type="button"
              data-testid="user-menu-logout"
              onClick={handleLogout}
              className="neu-sheet-item"
              data-variant="destructive"
            >
              <LogOut className="size-5" aria-hidden="true" />
              {t("userMenu.logout")}
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );

  // The account entry point — the desktop dropdown in the top bar, or the
  // mobile burger button floating top-right, since settings/logout have
  // nowhere else to live once the top bar is gone on mobile (owner decision
  // 2026-07-28).
  const renderAccountTrigger = (variant: "row" | "burger") => {
    if (status === "loading") {
      return variant === "row" ? (
        <div className="flex items-center gap-2" aria-hidden="true">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
      ) : (
        <Skeleton
          className="fixed top-4 right-4 z-40 size-11 rounded-full"
          aria-hidden="true"
        />
      );
    }
    if (!user) return null;

    return variant === "row" ? renderAccountDropdown() : renderAccountSheet();
  };

  // The destination link, shared by both layouts below — a row icon+label on
  // the desktop top bar, a stacked icon-over-label column in the mobile
  // bottom bar (the neumorui bottom-nav pattern: thumb-zone placement per
  // platform-ui-design §7). Same `.neu-nav-link` skin, same ref wiring, so
  // ONE `.neu-nav-indicator` (see the effect above) drives whichever layout
  // is mounted.
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
          ref={(el) => {
            if (el) linkRefs.current.set(link.href, el);
            else linkRefs.current.delete(link.href);
          }}
          href={link.href}
          aria-label={link.label}
          aria-current={active ? "page" : undefined}
          data-active={active}
          className={
            variant === "row"
              ? "neu-nav-link flex min-h-11 min-w-11 items-center gap-2 px-3 text-sm focus-ring sm:px-4"
              : "neu-nav-link neu-nav-link--stacked flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] focus-ring"
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
  // bar, and the account entry point becomes a floating burger button (see
  // `renderAccountSheet` above for why that is the one hamburger exception).
  if (isMobile) {
    return (
      <>
        {renderAccountTrigger("burger")}
        <nav
          aria-label={t("nav.aria")}
          className="neu-bottom-nav fixed inset-x-0 bottom-0 z-40"
        >
          {/* The neumorui bottom-nav pattern (owner-linked reference,
              2026-07-28): destinations only, sharing one `.neu-nav-indicator`
              (see the effect above). `.neu-skin` reserves the matching space
              at the foot of the page (`:has()`, neumorphism.css) so content
              never sits underneath it. */}
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
        className="relative mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:gap-2"
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
          {renderAccountTrigger("row")}
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
