"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

/** The client-stored locale, or undefined when absent/invalid/unavailable —
 *  the provider then falls back to the server-seeded cookie value, so a
 *  missing localStorage entry can never override a real stored preference. */
function getStoredLocale(): Locale | undefined {
  return parseLocale(storage.get(STORAGE_KEY));
}

const listeners = new Set<() => void>();

function setStoredLocale(locale: Locale): void {
  storage.set(STORAGE_KEY, locale);
  listeners.forEach((listener) => listener());
}

function subscribeLocale(listener: () => void): () => void {
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

  // Keep <html lang>, localStorage AND the ask.locale cookie in step with the
  // resolved locale — on mount as well as on switch. lang: the root layout
  // renders the default (D6), and screen readers + hyphenation follow the
  // attribute. The two stores (client localStorage, server cookie — D19) are
  // reconciled here in BOTH directions, keyed on the resolved value.
  useEffect(() => {
    document.documentElement.lang = locale;
    storage.set(STORAGE_KEY, locale);
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
