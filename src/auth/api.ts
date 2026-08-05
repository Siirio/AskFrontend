/**
 * AskBackend `identity` calls for the auth slice — the ONLY place these
 * endpoints are named (P1.2, §7). Built on shared/api/httpClient, which attaches
 * the Bearer token from storage automatically for the authenticated calls.
 *
 * Importable from server AND client (D7): plain functions, no React, no DOM,
 * no token handling here (P5.2 — that lives in the slice hooks). Platform-
 * neutral (D5).
 *
 * V1 customer path: register (email + code), password login (/auth/login),
 * verify, session, logout. /auth/select-role and business/staff registration
 * exist in the backend but are deferred to the seller/staff paths (roadmap #6,
 * the business cabinet).
 */
import { httpClient } from "@/shared/api/httpClient";

import type {
  AuthChallengeResponse,
  AuthSessionResponse,
  CustomerRegisterRequest,
  LoginRequest,
  VerifyCodeRequest,
} from "./model";

const BASE = "/api/v1/auth";

/** Create a customer account and issue an email verification challenge. */
export function registerCustomer(
  body: CustomerRegisterRequest,
): Promise<AuthChallengeResponse> {
  return httpClient.post<AuthChallengeResponse>(`${BASE}/customer/register`, {
    body,
  });
}

/** Log in with email + password → an authenticated session (or a 2FA challenge). */
export function login(body: LoginRequest): Promise<AuthSessionResponse> {
  return httpClient.post<AuthSessionResponse>(`${BASE}/login`, { body });
}

/** Confirm a challenge with the 6-digit code → authenticated session. */
export function verifyCode(
  body: VerifyCodeRequest,
): Promise<AuthSessionResponse> {
  return httpClient.post<AuthSessionResponse>(`${BASE}/verify`, { body });
}

/**
 * Restore the session for the stored Bearer token.
 *
 * **It returns a REAL, freshly-issued token — not null** (corrected 2026-08-01;
 * this comment claimed null, and so did contracts.md). `AuthProcessor.currentSession`
 * calls `jwtTokenService.issue(...)` and sets `expiresIn` on EVERY response.
 *
 * Consequence worth knowing before changing anything here: `applySessionTo`
 * stores whatever token comes back, so every session restore silently rolls the
 * token forward. That is benign — arguably desirable — but it was never a
 * decision, and it means the app's token lifetime is "last restore + session
 * TTL", not "issued at login". Nothing reads `expiresIn` yet.
 */
export function getSession(): Promise<AuthSessionResponse> {
  return httpClient.get<AuthSessionResponse>(`${BASE}/session`);
}

/**
 * Google OAuth bridge exchange. After the backend's callback redirects to
 * `/oauth/callback`, the browser holds the single-use `ASK_SESSION` cookie; this
 * GET /session sends it (`credentials: "include"`) so the backend validates the
 * server session, returns the Bearer JWT (`accessToken` + `expiresIn`), and
 * clears the cookie. From here the app is pure Bearer — the cookie was only the
 * OAuth bootstrap (token lock, D5/P5.2; features/auth/contracts.md).
 */
export function exchangeOAuthSession(): Promise<AuthSessionResponse> {
  return httpClient.get<AuthSessionResponse>(`${BASE}/session`, {
    credentials: "include",
  });
}

/** Invalidate the current session server-side. */
export function logout(): Promise<{ success?: boolean }> {
  return httpClient.post<{ success?: boolean }>(`${BASE}/logout`);
}

/**
 * Mirrors `kz.ask.legal.api.dto.AcceptLegalDocumentsRequest`. **All three fields
 * are REQUIRED on the backend** — `documentCodes` `@NotEmpty`, `countryCode`
 * `@NotBlank @Size(min=2,max=2)`, `locale` `@NotBlank`.
 *
 * **`countryCode` was missing here until 2026-08-05, and its absence 400'd every
 * consent write this product has ever made.** The failure was invisible by
 * construction: `recordRegistrationConsent` catches, toasts a generic network
 * error and proceeds, because a legal write must never strand a valid account —
 * so registration always succeeded and the record was never written. It showed
 * only as a red line in devtools. AUDIT_1 A1 recorded the "coverage half" as
 * closed on the strength of the call being MADE; nothing checked that it was
 * accepted. `locale` is required for the same reason and is no longer optional.
 */
export type AcceptRegistrationLegalRequest = {
  documentCodes: string[];
  countryCode: string;
  locale: string;
};

/**
 * Record legal-document acceptance for a fresh registration (Bearer,
 * `kz.ask.legal.api.LegalController#acceptRegistration`). Lives here rather
 * than in its own module because `legal` has no slice of its own — it is
 * consumed directly by whichever slice completes a registration (identity
 * feature index). Full path used directly since it sits outside `/api/v1/auth`.
 */
export function acceptRegistrationLegal(
  body: AcceptRegistrationLegalRequest,
): Promise<void> {
  return httpClient.post<void>("/api/v1/legal/registration-acceptances", {
    body,
  });
}
