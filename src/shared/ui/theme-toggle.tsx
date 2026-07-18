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
 * writes the one theme mechanism (shared/theme.ts); the accent is spent only on
 * the FOCUS ring here (the toggle is chrome, not a primary action), so the
 * active option is marked by a quiet sunken fill (saturation-is-action holds).
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
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex items-center gap-0.5 rounded-sm border border-border bg-surface-raised p-0.5"
    >
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
              "inline-flex size-11 items-center justify-center rounded-xs focus-ring transition-colors pointer-fine:size-8 [&_svg]:size-4",
              active
                ? "bg-surface-sunken text-foreground"
                : "text-foreground-subtle hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
