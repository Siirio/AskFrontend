import { apiRequest } from "./httpClient";

export type BusinessInvitation = {
  id: string;
  businessId: string;
  businessName: string;
  invitedEmail: string;
  invitedRole: "MANAGER" | "WORKER";
  invitedByDisplayName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  branchIds: string[];
};

export function listMyBusinessInvitations() {
  return apiRequest<BusinessInvitation[]>("/api/v1/me/invitations", { auth: true });
}

export function acceptBusinessInvitation(invitationId: string) {
  return apiRequest<BusinessInvitation>(
    `/api/v1/me/invitations/${encodeURIComponent(invitationId)}/accept`,
    { method: "POST", auth: true },
  );
}

export function declineBusinessInvitation(invitationId: string) {
  return apiRequest<BusinessInvitation>(
    `/api/v1/me/invitations/${encodeURIComponent(invitationId)}/decline`,
    { method: "POST", auth: true },
  );
}

export function createBusinessInvitation(
  businessId: string,
  request: {
    invitedEmail: string;
    invitedRole: "MANAGER" | "WORKER";
    branchIds: string[];
  },
) {
  return apiRequest<BusinessInvitation>(
    `/api/v1/businesses/${encodeURIComponent(businessId)}/invitations`,
    { method: "POST", auth: true, body: request },
  );
}

export function listBusinessInvitations(businessId: string) {
  return apiRequest<BusinessInvitation[]>(
    `/api/v1/businesses/${encodeURIComponent(businessId)}/invitations`,
    { auth: true },
  );
}
