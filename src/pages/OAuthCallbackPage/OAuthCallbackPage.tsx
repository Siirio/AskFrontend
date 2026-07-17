import { useEffect, useState } from "react";
import { setStoredToken, apiRequest } from "../../shared/api/httpClient";
import type { AuthSession } from "../../shared/api/authClient";

const SESSION_KEY = "ask.session";

export function OAuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const token = fragment.get("token") ?? query.get("token");
    const oauthError = fragment.get("error") ?? query.get("error");
    window.history.replaceState(null, "", window.location.pathname);
    if (oauthError) {
      setError("OAuth authentication failed");
      setTimeout(() => window.location.replace("/auth"), 2000);
      return;
    }
    if (!token) {
      window.location.replace("/auth");
      return;
    }

    setStoredToken(token);

    apiRequest<AuthSession>("/api/v1/auth/session", { auth: true })
      .then((session) => {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        window.location.replace("/");
      })
      .catch(() => {
        setStoredToken(null);
        setError("OAuth authentication failed");
        setTimeout(() => window.location.replace("/auth"), 2000);
      });
  }, []);

  if (error) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="fcw-card fcw-p-lg" style={{ textAlign: "center" }}>
          <p className="fcw-body" style={{ color: "var(--fcw-color-error)" }}>{error}</p>
          <p className="fcw-body-s fcw-text-secondary">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="fcw-card fcw-p-lg" style={{ textAlign: "center" }}>
        <p className="fcw-body">Signing you in...</p>
      </div>
    </main>
  );
}
