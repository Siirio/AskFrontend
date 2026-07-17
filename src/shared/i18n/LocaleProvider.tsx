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

function getStoredLocale(): Locale {
  return parseLocale(storage.get(STORAGE_KEY)) ?? defaultLocale;
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
  const locale = useSyncExternalStore(
    subscribeLocale,
    getStoredLocale,
    () => initialLocale,
  );
  const setLocale = useCallback((next: Locale) => setStoredLocale(next), []);

  // Keep <html lang> AND the ask.locale cookie in step with the client locale
  // — on mount as well as on switch. lang: the root layout renders the default
  // (D6), and screen readers + hyphenation follow the attribute. Cookie: the
  // server's copy for the next request (D19); writing it here, keyed on the
  // resolved locale, also reconciles a stale/missing cookie.
  useEffect(() => {
    document.documentElement.lang = locale;
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
