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
export type ThemePreference = "light" | "dark" | "system";

/** localStorage key for the theme preference. */
export const THEME_STORAGE_KEY = "ask.theme";

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark() ? "dark" : "light";
}

function apply(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolve(preference));
}

const listeners = new Set<() => void>();
let systemListenerBound = false;

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
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  syncThemeCookie(preference);
  apply(preference);
  listeners.forEach((listener) => listener());
}

/** Subscribe to preference changes (for useSyncExternalStore). */
export function subscribeTheme(listener: () => void): () => void {
  ensureSystemThemeListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
