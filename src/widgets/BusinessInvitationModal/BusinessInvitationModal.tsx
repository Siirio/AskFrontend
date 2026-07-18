import { useEffect, useState } from "react";
import { Building2, CalendarClock, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  acceptBusinessInvitation,
  declineBusinessInvitation,
  listMyBusinessInvitations,
  type BusinessInvitation,
} from "../../shared/api/businessInvitationClient";
import { ApiError } from "../../shared/api/httpClient";
import { Modal } from "../../shared/ui/Modal/Modal";

export function BusinessInvitationModal() {
  const { t } = useTranslation();
  const { state, actions } = useAuth();
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state.authenticated) {
      setInvitations([]);
      return;
    }
    listMyBusinessInvitations()
      .then(setInvitations)
      .catch(cause => setError(cause instanceof ApiError ? cause.message : t("invitation.loadError")));
  }, [state.authenticated, state.session?.pendingInvitationsCount, t]);

  const current = invitations[0];

  const resolve = async (decision: "accept" | "decline") => {
    if (!current) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (decision === "accept") {
        await acceptBusinessInvitation(current.id);
        await actions.refreshSession();
      } else {
        await declineBusinessInvitation(current.id);
      }
      setInvitations(items => items.filter(item => item.id !== current.id));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("invitation.actionError"));
    } finally {
      setBusy(false);
    }
  };

  if (!current) {
    return null;
  }

  return (
    <Modal open onClose={() => {}} title={t("invitation.title")} size="sm">
      <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
        <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
          <Building2 size={22} style={{ color: "var(--fcw-color-primary)" }} />
          <div>
            <p className="fcw-body fcw-weight-semibold">{current.businessName}</p>
            <p className="fcw-body-s fcw-text-secondary">
              {t(`invitation.role.${current.invitedRole}`)}
            </p>
          </div>
        </div>
        <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
          <p className="fcw-body-s fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
            <UserRound size={15} />
            {t("invitation.invitedBy", { name: current.invitedByDisplayName })}
          </p>
          <p className="fcw-body-s fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
            <CalendarClock size={15} />
            {t("invitation.expiresAt", {
              date: new Date(current.expiresAt).toLocaleDateString(),
            })}
          </p>
          {current.branchIds.length > 0 && (
            <p className="fcw-body-s fcw-text-secondary">
              {t("invitation.branches", { count: current.branchIds.length })}
            </p>
          )}
        </div>
        <p className="fcw-body-s fcw-text-secondary">
          {t(`invitation.description.${current.invitedRole}`)}
        </p>
        {error && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{error}</p>}
        <div className="fcw-flex" style={{ gap: "0.5rem" }}>
          <button
            className="fcw-btn fcw-btn-primary fcw-flex-1"
            disabled={busy}
            onClick={() => resolve("accept")}
          >
            {t("invitation.accept")}
          </button>
          <button
            className="fcw-btn fcw-btn-secondary fcw-flex-1"
            disabled={busy}
            onClick={() => resolve("decline")}
          >
            {t("invitation.decline")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
