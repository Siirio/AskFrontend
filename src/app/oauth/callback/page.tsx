import { OAuthCallbackPage } from "@/auth";

/**
 * /oauth/callback — the backend's configured OAUTH2_FRONTEND_REDIRECT_URI. Thin
 * server route (D7); OAuthCallbackPage is the client island that exchanges the
 * single-use ASK_SESSION bridge cookie for a Bearer session and redirects on.
 *
 * Top-level (NOT under /app/*) to match the backend's redirect URI. It renders
 * under the root providers, which give it i18n (defaultLocale) and the auth
 * store — enough for a transient redirect page.
 */
export default function OAuthCallbackRoute() {
  return <OAuthCallbackPage />;
}
