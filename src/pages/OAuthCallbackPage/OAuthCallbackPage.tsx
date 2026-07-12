import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { setStoredToken, apiRequest } from "../../shared/api/httpClient";
import type { AuthSession } from "../../shared/api/authClient";

const SESSION_KEY = "ask.session";

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
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
  }, [searchParams]);

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
