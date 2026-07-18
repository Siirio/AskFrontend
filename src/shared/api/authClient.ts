import { API_BASE_URL, apiRequest } from "./httpClient";

export type AuthChallenge = {
  authChallengeId: string;
  role: string;
  purpose: string;
  channel: "EMAIL" | "SMS";
  maskedDestination: string;
  expiresAt: string;
  code?: string;
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  remembered?: boolean;
  activationRequired?: boolean;
  role: string;
  startRoute?: string;
  user?: { userId: string; displayName: string; email?: string; phone?: string; status?: string };
  business?: { businessId: string; businessName: string; membershipId?: string; memberRole?: string; branchId?: string; branchName?: string };
  requiresTwoFactor?: boolean;
  authChallengeId?: string;
  customerProfile?: { enabled: boolean };
  businessMemberships?: Array<{
    membershipId: string;
    businessId: string;
    businessName: string;
    role: "OWNER" | "MANAGER" | "WORKER";
    branchIds: string[];
  }>;
  platformMembership?: {
    role: "SUPER_ADMIN" | "ADMIN" | "MODERATOR";
    permissions: string[];
  };
  pendingInvitationsCount?: number;
};

export function getGoogleOAuthUrl() {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchCurrentSession() {
  return apiRequest<AuthSession>("/api/v1/auth/session", { auth: true });
}

export function registerCustomer(
  displayName: string,
  email: string,
  password: string,
  acceptedUserAgreement: boolean,
  locale: string,
) {
  return apiRequest<AuthChallenge>("/api/v1/auth/customer/register", {
    method: "POST",
    body: {
      displayName,
      email,
      password,
      passwordConfirmation: password,
      acceptedUserAgreement,
      countryCode: "KZ",
      locale,
      rememberMe: true,
    },
  });
}

export function registerBusiness(params: {
  email: string;
  password: string;
  businessName: string;
  branchName: string;
  branchCityId: string;
  branchAddress: string;
}) {
  return apiRequest<AuthChallenge>("/api/v1/auth/business/register", {
    method: "POST",
    body: {
      email: params.email,
      password: params.password,
      passwordConfirmation: params.password,
      businessName: params.businessName,
      branchName: params.branchName,
      branchCityId: params.branchCityId,
      branchAddress: params.branchAddress,
      onlineOnly: false,
      acceptedBusinessRules: true,
      rememberMe: true,
    },
  });
}

export function verifyCode(authChallengeId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/verify", {
    method: "POST",
    body: { authChallengeId, code },
  });
}

export function verifyTwoFactor(authChallengeId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/verify", {
    method: "POST",
    body: { authChallengeId, code },
  });
}

export function resolveCity(name: string) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/cities/resolve?name=${encodeURIComponent(name)}`);
}

export function logout() {
}

export function logoutRemote() {
  return apiRequest<{ success: boolean }>("/api/v1/auth/logout", {
    method: "POST",
    auth: true,
  }).finally(logout);
}

export function updateProfile(data: { displayName?: string; email?: string; phone?: string }) {
  return apiRequest<AuthSession>("/api/v1/auth/profile", {
    method: "POST",
    auth: true,
    body: data,
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ success: boolean }>("/api/v1/auth/change-password", {
    method: "POST",
    auth: true,
    body: { currentPassword, newPassword },
  });
}

export function changeTemporaryPassword(newPassword: string, passwordConfirmation: string) {
  return apiRequest<AuthSession>("/api/v1/auth/change-temporary-password", {
    method: "POST",
    auth: true,
    body: { newPassword, passwordConfirmation },
  });
}

export function requestEmailChange(newEmail: string) {
  return apiRequest<AuthChallenge>("/api/v1/auth/email-change/request", {
    method: "POST",
    auth: true,
    body: { newEmail },
  });
}

export function confirmEmailChange(authChallengeId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/email-change/confirm", {
    method: "POST",
    auth: true,
    body: { authChallengeId, code },
  });
}

export function exportAccount() {
  return apiRequest<Record<string, unknown>>("/api/v1/account/export", { auth: true });
}

export function deleteAccount() {
  return apiRequest<{ success: boolean }>("/api/v1/account", {
    method: "DELETE",
    auth: true,
  });
}
