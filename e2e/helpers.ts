import { test, type Page } from "@playwright/test";

/**
 * Shared e2e helpers. Lives beside the specs (outside `src/`, architecture §2),
 * so it is subject to no slice boundary.
 */

/**
 * Pins the server-read `ask.locale` cookie (D19) so assertions can match one
 * language instead of juggling three. The product's default locale is `kk`.
 *
 * The URL is derived from the project's own `baseURL`, never written literally.
 * `addCookies` requires an absolute URL and scopes the cookie to that URL's
 * HOST — so a hardcoded `http://localhost:3000` is silently ignored the moment
 * the harness runs anywhere else, and the spec then asserts against the default
 * locale while still passing. It does not fail; it stops testing what it claims.
 *
 * Note the trap this replaced was narrower than it first looked (AUDIT_2 D-6):
 * cookies are keyed on host and **not on port** (RFC 6265), so a different PORT
 * — the obvious local case — keeps working, and only a different HOST (a preview
 * deploy, or CI on a non-localhost origin) actually drops the pin. That is
 * precisely why it survived: the case a developer can reproduce is the case that
 * is fine.
 */
export async function pinLocale(page: Page, locale: string): Promise<void> {
  const { baseURL } = test.info().project.use;
  if (!baseURL) throw new Error("playwright.config.ts must define a baseURL");
  await page
    .context()
    .addCookies([{ name: "ask.locale", value: locale, url: baseURL }]);
}
