import { API_BASE_URL, apiRequest, setStoredToken } from "./httpClient";

export type AuthChallenge = {
  authChallengeId: string;
  role: string;
  purpose: string;
  channel: "EMAIL" | "SMS";
  maskedDestination: string;
  expiresAt: string;
  code?: string;
};

export type RoleOption = {
  userId: string;
  role: string;
  displayName: string;
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
  requiresRoleSelection?: boolean;
  availableRoles?: RoleOption[];
  allRoles?: string[];
  requiresTwoFactor?: boolean;
  authChallengeId?: string;
  suggestRoleExpansion?: boolean;
};

function persistSession(session: AuthSession): AuthSession {
  setStoredToken(session.accessToken);
  return session;
}

export function getGoogleOAuthUrl() {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  }).then(persistSession);
}

export function selectRole(email: string, password: string, role: string) {
  return apiRequest<AuthSession>("/api/v1/auth/select-role", {
    method: "POST",
    body: { email, password, role },
  }).then(persistSession);
}

export function switchRole(role: string) {
  return apiRequest<AuthSession>("/api/v1/auth/switch-role", {
    method: "POST",
    auth: true,
    body: { role },
  }).then(persistSession);
}

export type EmailAccountInfo = {
  role: string;
  status: string;
  businessName?: string;
};

export type EmailInfoResponse = {
  exists: boolean;
  accounts: EmailAccountInfo[];
};

export function fetchEmailInfo(email: string) {
  return apiRequest<EmailInfoResponse>(`/api/v1/auth/email-info?email=${encodeURIComponent(email)}`);
}

export function registerCustomer(displayName: string, email: string, password: string) {
  return apiRequest<AuthChallenge>("/api/v1/auth/customer/register", {
    method: "POST",
    body: {
      displayName,
      email,
      password,
      passwordConfirmation: password,
      acceptedUserAgreement: true,
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
  }).then(persistSession);
}

export function verifyTwoFactor(authChallengeId: string, code: string) {
  return apiRequest<AuthSession>("/api/v1/auth/verify", {
    method: "POST",
    body: { authChallengeId, code },
  }).then(persistSession);
}

export function resolveCity(name: string) {
  return apiRequest<{ id: string; name: string }>(`/api/v1/cities/resolve?name=${encodeURIComponent(name)}`);
}

export function logout() {
  setStoredToken(null);
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
  }).then(persistSession);
}
