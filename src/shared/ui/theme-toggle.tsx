"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  getThemePreference,
  setThemePreference,
  subscribeTheme,
  type ThemePreference,
} from "@/shared/theme";

/**
 * Light / dark / system toggle — domain-free chrome (shared/ui). Reads and
 * writes the one theme mechanism (shared/theme.ts).
 *
 * On ORANGE NEUMORPHISM (D25) this is the skin's segmented control: one shared
 * inset GROOVE (`.neu-tab-list`) holding transparent triggers, where the active
 * option presses IN and its glyph takes the accent. The active state is
 * therefore carried by depth, not by a fill — which is the whole reason the
 * idiom is worth having here. The accent tints a 16px glyph and nothing else,
 * so it still marks state rather than becoming a saturated surface.
 */
const OPTIONS: { value: ThemePreference; Icon: LucideIcon }[] = [
  { value: "system", Icon: Monitor },
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
];

const ThemePreferenceSeedContext = createContext<ThemePreference>("system");

/**
 * The server-known theme preference (the `ask.theme` cookie seed) — "system"
 * where no seed provider wraps the tree (the static marketing surface, which
 * must never read a cookie, D6). For any chrome whose SSR snapshot depends on
 * the theme (the toggle here, the Toaster per D21).
 */
export function useThemePreferenceSeed(): ThemePreference {
  return useContext(ThemePreferenceSeedContext);
}

/**
 * Seeds the toggle's SSR/hydration snapshot with the server-known preference
 * (the `ask.theme` cookie, read by the platform layout — D19), so the active
 * option is highlighted correctly on first paint instead of flashing "system"
 * and flipping after hydration.
 */
export function ThemePreferenceSeed({
  value,
  children,
}: {
  value: ThemePreference;
  children: ReactNode;
}) {
  return (
    <ThemePreferenceSeedContext.Provider value={value}>
      {children}
    </ThemePreferenceSeedContext.Provider>
  );
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const seed = useThemePreferenceSeed();
  const preference = useSyncExternalStore(
    subscribeTheme,
    getThemePreference,
    () => seed,
  );

  return (
    <div role="group" aria-label={t("theme.label")} className="neu-tab-list">
      {OPTIONS.map(({ value, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            data-testid={`theme-${value}`}
            aria-pressed={active}
            aria-label={t(`theme.${value}`)}
            title={t(`theme.${value}`)}
            onClick={() => setThemePreference(value)}
            className={cn(
              // 44px touch target on coarse pointers (platform-ui-design §7);
              // compact 32px only where a fine pointer (mouse/trackpad) is primary.
              // `.neu-tab-trigger` reads aria-pressed itself for the pressed-in
              // active state, so no conditional class is needed for depth.
              "neu-tab-trigger inline-flex size-11 items-center justify-center p-0 focus-ring pointer-fine:size-9 [&_svg]:size-4",
              !active && "hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
