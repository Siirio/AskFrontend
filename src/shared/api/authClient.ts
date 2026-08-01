import { API_BASE_URL, apiRequest } from "./httpClient";
import { setAccessToken } from "./authTokenStore";

export type AuthChallenge = {
  verificationId: string;
  role: string;
  purpose: string;
  channel: "EMAIL" | "SMS";
  maskedDestination: string;
  expiresAt: string;
  code?: string;
};

export type AuthSession = {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt: string;
  isRemembered?: boolean;
  isActivationRequired?: boolean;
  role?: string;
  startRoute?: string;
  user?: { userId: string; displayName: string; email?: string; phone?: string; status?: string };
  business?: { businessId: string; businessName: string; membershipId?: string; memberRole?: string; branchId?: string; branchName?: string };
  requiresTwoFactor?: boolean;
  isTwoFactorEnabled?: boolean;
  verificationId?: string;
  allRoles?: Array<"CUSTOMER" | "OWNER" | "MANAGER" | "WORKER" | "SUPER_ADMIN" | "ADMIN" | "MODERATOR">;
  customerProfile?: { isEnabled: boolean };
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
  passwordConfirmation: string,
  locale: string,
) {
  return apiRequest<AuthChallenge>("/api/v1/auth/customer/register", {
    method: "POST",
    body: {
      displayName,
      email,
      password,
      passwordConfirmation,
      countryCode: "KZ",
      locale,
      isRememberMe: true,
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
      isRememberMe: true,
    },
  });
}

export function verifyCode(verificationId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/verify", {
    method: "POST",
    body: { verificationId, code },
  });
}

export function verifyTwoFactor(verificationId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/verify", {
    method: "POST",
    body: { verificationId, code },
  });
}

export function resolveCity(name: string) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/cities/resolve?name=${encodeURIComponent(name)}`);
}

export function logout() {
  setAccessToken();
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

export function requestPasswordChange(
  currentPassword: string,
  newPassword: string,
  passwordConfirmation: string,
) {
  return apiRequest<AuthChallenge>("/api/v1/auth/password-change/request", {
    method: "POST",
    auth: true,
    body: { currentPassword, newPassword, passwordConfirmation },
  });
}

export function confirmPasswordChange(verificationId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/password-change/confirm", {
    method: "POST",
    auth: true,
    body: { verificationId, code },
  });
}

export function requestTwoFactorChange(enabled: boolean) {
  return apiRequest<AuthChallenge>("/api/v1/auth/two-factor/request", {
    method: "POST",
    auth: true,
    body: { enabled },
  });
}

export function confirmTwoFactorChange(verificationId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/two-factor/confirm", {
    method: "POST",
    auth: true,
    body: { verificationId, code },
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

export function confirmEmailChange(verificationId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/email-change/confirm", {
    method: "POST",
    auth: true,
    body: { verificationId, code },
  });
}

export function deleteAccount() {
  return apiRequest<{ success: boolean }>("/api/v1/account", {
    method: "DELETE",
    auth: true,
  });
}
