/**
 * The theme mechanism — the ONE way a light/dark preference is stored, resolved
 * and applied (§7). Domain-free UI infrastructure (it knows nothing about the
 * business), so it lives in shared/.
 *
 * Preference: "light" | "dark" | "system" (stored in localStorage; "system"
 * removes the key). It resolves to a concrete "light" | "dark" written to the
 * `data-theme` attribute on <html> — which is the single switch the design
 * tokens read (design-system/tokens.css). "system" follows the OS and
 * re-resolves when the OS preference changes.
 *
 * A tiny inline script in app/layout.tsx applies the SAME logic before first
 * paint (it cannot import a module), so there is no flash of the wrong theme.
 * Keep the two in sync — both read `ask.theme` and resolve the same way.
 */
import { storage } from "@/shared/api/storage";

export type ThemePreference = "light" | "dark" | "system";

/** localStorage key for the theme preference. */
export const THEME_STORAGE_KEY = "ask.theme";

/**
 * Validate a stored preference value (localStorage or the `ask.theme` cookie,
 * D19) — one representation of "what counts as a theme preference" (P6.2).
 * Anything unknown means "system". The pre-paint script in app/layout.tsx
 * inlines the same check, a documented sanctioned duplicate (it cannot import).
 */
export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function getThemePreference(): ThemePreference {
  return parseThemePreference(storage.get(THEME_STORAGE_KEY));
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark() ? "dark" : "light";
}

/**
 * The concrete theme currently applied to <html> — read back from the
 * `data-theme` attribute (written by the pre-paint script and by apply()), so
 * chrome that needs a resolved value (e.g. the Toaster) reads the ONE switch
 * instead of re-resolving the OS itself (§7: no second theme mechanism).
 * Subscribe via `subscribeTheme`; every writer notifies after applying.
 */
export function getResolvedTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function apply(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolve(preference));
}

const listeners = new Set<() => void>();
let systemListenerBound = false;
let crossTabListenerBound = false;

/**
 * Bind the OS-theme change listener ONCE (idempotent), so a mid-session OS
 * switch re-resolves `data-theme` while the preference is "system". Exported
 * because lazily binding it from the toggle is not enough: the toggle is not
 * mounted on every page — `ThemeSystemSync` (mounted app-wide by
 * app/providers) calls this so "system" stays live everywhere.
 */
export function ensureSystemThemeListener(): void {
  if (systemListenerBound || typeof window === "undefined") return;
  systemListenerBound = true;
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getThemePreference() === "system") {
        apply("system");
        listeners.forEach((listener) => listener());
      }
    });
}

/**
 * Bind the cross-tab listener ONCE (idempotent): a preference change made in
 * ANOTHER tab (the native `storage` event, via the shared storage door)
 * re-applies `data-theme` and re-notifies subscribers here, so two open tabs
 * never disagree about the theme. Same-tab writes notify through
 * setThemePreference directly — the event never fires for them.
 */
function ensureCrossTabThemeListener(): void {
  if (crossTabListenerBound || typeof window === "undefined") return;
  crossTabListenerBound = true;
  storage.subscribe(THEME_STORAGE_KEY, () => {
    apply(getThemePreference());
    listeners.forEach((listener) => listener());
  });
}

/**
 * Mirror the preference to the `ask.theme` cookie — the SERVER's copy (D19):
 * the platform layout reads it so /app/* server-renders the toggle with the
 * right option highlighted, instead of flashing "system" and flipping after
 * hydration. localStorage stays the client store the pre-paint script reads.
 */
export function syncThemeCookie(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_STORAGE_KEY}=${preference}; path=/; max-age=31536000; samesite=lax`;
}

/** Persist a preference, apply it to <html>, and notify subscribers. */
export function setThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  if (preference === "system") {
    storage.remove(THEME_STORAGE_KEY);
  } else {
    storage.set(THEME_STORAGE_KEY, preference);
  }
  syncThemeCookie(preference);
  apply(preference);
  listeners.forEach((listener) => listener());
}

/** Subscribe to preference changes (for useSyncExternalStore). */
export function subscribeTheme(listener: () => void): () => void {
  ensureSystemThemeListener();
  ensureCrossTabThemeListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
