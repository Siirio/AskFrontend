"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";

import { storage } from "@/shared/api/storage";

import en from "./messages/en.json";
import kk from "./messages/kk.json";
import ru from "./messages/ru.json";
import {
  defaultLocale,
  LOCALE_STORAGE_KEY,
  parseLocale,
  type Locale,
} from "./locales";

/**
 * Client-side locale override for the platform (/app). It is nested INSIDE the
 * root NextIntlClientProvider (which serves the static, ru marketing landing)
 * and re-provides messages for the user's chosen locale — so the SEO marketing
 * page at `/` stays statically rendered (D6).
 *
 * The stored locale is mirrored to an `ask.locale` COOKIE (D19): the platform
 * layout reads it server-side and passes `initialLocale`, so /app/* pages
 * server-render in the stored language — no ru flash on reload. localStorage
 * stays the client store; the cookie is the server's copy, synced by an effect
 * here. The landing never reads the cookie and stays static.
 *
 * The messages for all three locales are bundled client-side (they are small);
 * switching is a pure client re-render, no round-trip. The profile settings
 * screen (UF 2.3) is the eventual home for this control — it lives on the auth
 * chrome now at the owner's request (decision log D18).
 */
const MESSAGES: Record<Locale, typeof ru> = { ru, kk, en };
const STORAGE_KEY = LOCALE_STORAGE_KEY;

/** The stored client locale; undefined when none exists — the provider then
 *  falls back to the server-seeded cookie value, so a missing localStorage
 *  entry can never override a real stored preference. The storage door itself
 *  guarantees a write reads back within the session even when persistence is
 *  unavailable (its in-memory fallback — 2026-07-18; this file previously
 *  carried that guarantee alone as a module-level `sessionLocale`). */
function getStoredLocale(): Locale | undefined {
  return parseLocale(storage.get(STORAGE_KEY));
}

const listeners = new Set<() => void>();
let crossTabListenerBound = false;

function setStoredLocale(locale: Locale): void {
  storage.set(STORAGE_KEY, locale);
  listeners.forEach((listener) => listener());
}

function subscribeLocale(listener: () => void): () => void {
  // Bound once for the module's lifetime (same pattern as the theme's OS
  // listener): a switch made in ANOTHER tab re-notifies this one, so two open
  // tabs never disagree about the language.
  if (!crossTabListenerBound && typeof window !== "undefined") {
    crossTabListenerBound = true;
    storage.subscribe(STORAGE_KEY, () => {
      listeners.forEach((l) => l());
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

export function LocaleProvider({
  initialLocale = defaultLocale,
  children,
}: {
  /** Server-known locale (the `ask.locale` cookie, read by the platform
   *  layout) — the SSR/hydration snapshot, so the first paint is already in
   *  the stored language (D19). */
  initialLocale?: Locale;
  children: ReactNode;
}) {
  // The stored client value wins when it exists; otherwise the server-seeded
  // cookie value (initialLocale) — NOT bare defaultLocale, or an empty/blocked
  // localStorage would flip a cookie-remembered language back to the default
  // after hydration and then stomp the cookie below.
  const stored = useSyncExternalStore(
    subscribeLocale,
    getStoredLocale,
    () => undefined,
  );
  const locale = stored ?? initialLocale;
  const setLocale = useCallback((next: Locale) => setStoredLocale(next), []);
  // Stable identity: without it every provider re-render would re-render every
  // useLocale() consumer even when the locale itself is unchanged.
  const contextValue = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  // Keep <html lang> and the ask.locale cookie in step with the resolved
  // locale — on mount as well as on switch. lang: the root layout renders the
  // default (D6), and screen readers + hyphenation follow the attribute. The
  // cookie is re-seeded here (D19) so the NEXT server render matches whatever
  // locale actually resolved on the client.
  //
  // localStorage is deliberately NOT written here. It is written only by an
  // explicit setLocale() call (below), because on the FIRST mount `stored` is
  // still `undefined` (React must render the hydration-safe server snapshot
  // before it can read the real client value — see useSyncExternalStore
  // above), so `locale` here briefly equals `initialLocale` (the cookie).
  // Writing that back to localStorage on every mount would race ahead of the
  // real stored value and stomp it — an explicit "en" preference could get
  // silently overwritten back to a stale "kk" cookie on the very next load
  // (found 2026-07-27: the platform nav and the page body ended up rendering
  // two different locales at once because of this race).
  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
