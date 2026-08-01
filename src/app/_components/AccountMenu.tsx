"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  ChevronDown,
  Cookie,
  Info,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

import { useAuth } from "@/auth";
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

/** One row in the account menu's "Learn more" group. `Icon` is a lucide glyph. */
type LearnMoreLink = { href: string; label: string; Icon: typeof Building2 };

/**
 * The account entry point — the profile card of PRODUCT_VISION UF 2.3 (logo,
 * name, settings, learn more, sign out).
 *
 * Extracted from `NavigationMenu` 2026-08-01 (P1.1 — that file was 523 lines).
 * The two presentations live in ONE file on purpose: they render the same menu
 * in different containers, so a new row has to be added to both, and code that
 * always changes together stays together (P1.4). What is split out is the axis
 * that does NOT change together — destinations vs. account.
 *
 * It reads the session itself (`useAuth`, R6) rather than taking it as props:
 * sign-out is an account concern, not a navigation one, so the router and the
 * `signOut` call moved here with it. `NavigationMenu` now passes one prop.
 *
 * Both variants render for an AUTHENTICATED session only — this mounts inside
 * the `(main)` layout's `RequireAuth` gate, so there is no signed-out entry
 * (owner rule 4, D23).
 *
 * The profile card is app-chrome SCAFFOLDING; its real content (settings, the
 * avatar image once the backend returns one) belongs to the `profile` slice
 * (roadmap #5). Until it lands, Settings routes to its placeholder and the
 * avatar shows initials — no invented data (P9.4).
 */
export function AccountMenu({ variant }: { variant: "row" | "burger" }) {
  const t = useTranslations("app");
  const router = useRouter();
  const { status, user, signOut } = useAuth();

  const handleLogout = useCallback(() => {
    // Best-effort sign-out (hooks clear the local session regardless), then land
    // on the login screen inside the app tree.
    void signOut().finally(() => router.push("/app/auth/login"));
  }, [signOut, router]);

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

  const displayName = user.displayName?.trim() || user.email?.split("@")[0];
  const initials = displayName ? initialsFrom(displayName) : "";

  // Desktop: the profile-card DROPDOWN, opened from the name+chevron button
  // in the top bar — "Learn more" is a hover/keyboard fly-out submenu, since
  // there is no room for a flat list in a popover this size.
  if (variant === "row") {
    return (
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
  }

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
  return (
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
            {user.email ? (
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
}

/** Up-to-two-letter initials: first+last word, or the first two letters of a
 *  single word. Falls back to the User glyph when there is no name at all.
 *  Private to the account card — the only thing that renders one. */
function initialsFrom(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
