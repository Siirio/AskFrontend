/**
 * Site identity — the ONE representation of the brand tab-title (P6.2). Three
 * writers used to hardcode "… - Ask" independently (the root metadata template
 * and the two auth pages' in-session `document.title` effects, D19); they all
 * derive from here now, so the suffix cannot drift.
 */
export const SITE_NAME = "Ask";

/** Next.js metadata title template (root layout). */
export const TITLE_TEMPLATE = `%s - ${SITE_NAME}`;

/** Format a page title exactly as the metadata template renders it — for the
 *  client `document.title` writers (in-session locale switch, D19). */
export function formatPageTitle(pageTitle: string): string {
  return TITLE_TEMPLATE.replace("%s", pageTitle);
}
