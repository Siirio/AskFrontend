import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../shared/i18n/i18n";
import { BusinessInvitationModal } from "./BusinessInvitationModal";
import { MotionProvider } from "../../app/providers/MotionProvider";
import {
  acceptBusinessInvitation,
  declineBusinessInvitation,
  listMyBusinessInvitations,
  type BusinessInvitation,
} from "../../shared/api/businessInvitationClient";

const refreshSession = vi.fn();

vi.mock("../../app/providers/AuthProvider", () => ({
  useAuth: () => ({
    state: { authenticated: true, session: { pendingInvitationsCount: 1 } },
    actions: { refreshSession },
  }),
}));

vi.mock("../../shared/api/businessInvitationClient", () => ({
  listMyBusinessInvitations: vi.fn(),
  acceptBusinessInvitation: vi.fn(),
  declineBusinessInvitation: vi.fn(),
}));

const invitation: BusinessInvitation = {
  id: "inv-1",
  businessId: "b1",
  businessName: "Coffee Lab",
  invitedEmail: "worker@ask.kz",
  invitedRole: "WORKER",
  invitedByDisplayName: "Aida",
  status: "PENDING",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  branchIds: [],
};

function renderModal() {
  return render(
    <MotionProvider>
      <BusinessInvitationModal />
    </MotionProvider>,
  );
}

describe("BusinessInvitationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMyBusinessInvitations).mockResolvedValue([invitation]);
  });

  it("shows the pending invitation with business, role and inviter", async () => {
    renderModal();

    expect(await screen.findByText("Coffee Lab")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(i18n.t("invitation.title"));
    expect(screen.getByText(i18n.t("invitation.role.WORKER"))).toBeInTheDocument();
    expect(screen.getByText(i18n.t("invitation.invitedBy", { name: "Aida" }))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: i18n.t("invitation.accept") })).toBeEnabled();
    expect(screen.getByRole("button", { name: i18n.t("invitation.decline") })).toBeEnabled();
  });

  it("accepts the invitation and refreshes the session", async () => {
    vi.mocked(acceptBusinessInvitation).mockResolvedValue({ ...invitation, status: "ACCEPTED" });
    refreshSession.mockResolvedValue(undefined);
    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: i18n.t("invitation.accept") }));

    await waitFor(() => expect(screen.queryByText("Coffee Lab")).not.toBeInTheDocument());
    expect(acceptBusinessInvitation).toHaveBeenCalledWith("inv-1");
    expect(refreshSession).toHaveBeenCalled();
    expect(declineBusinessInvitation).not.toHaveBeenCalled();
  });

  it("declines the invitation without refreshing the session", async () => {
    vi.mocked(declineBusinessInvitation).mockResolvedValue({ ...invitation, status: "DECLINED" });
    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: i18n.t("invitation.decline") }));

    await waitFor(() => expect(screen.queryByText("Coffee Lab")).not.toBeInTheDocument());
    expect(declineBusinessInvitation).toHaveBeenCalledWith("inv-1");
    expect(acceptBusinessInvitation).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("renders nothing when there are no pending invitations", async () => {
    vi.mocked(listMyBusinessInvitations).mockResolvedValue([]);
    renderModal();

    await waitFor(() => expect(listMyBusinessInvitations).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
