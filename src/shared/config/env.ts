// Environment access lives here and nowhere else (architecture §6).
// NEXT_PUBLIC_ because the same value must be readable in client code (D7).

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:2020"
).replace(/\/+$/, "");

export const env = {
  /** Base URL of the AskBackend API, no trailing slash. Default: local backend (ASK_SERVER_PORT 2020). */
  apiBaseUrl,
  /** Whether to show the "Continue with Google" control. OAuth is a required
   *  method on the auth pages (PRODUCT_VISION UF 1), so it defaults ON; set
   *  NEXT_PUBLIC_OAUTH_ENABLED=false in an environment whose backend has no
   *  Google client configured, to avoid rendering a dead button. */
  oauthEnabled: process.env.NEXT_PUBLIC_OAUTH_ENABLED !== "false",
  /** Full-page navigation target that starts Google OAuth on the backend. The
   *  browser must follow the redirect chain through Google, so this is a link
   *  target, never an httpClient call. */
  googleOAuthUrl: `${apiBaseUrl}/oauth2/authorization/google`,
} as const;
