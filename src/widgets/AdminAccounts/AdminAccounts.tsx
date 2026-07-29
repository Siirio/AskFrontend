import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, RotateCcw, Search, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { ApiError } from "../../shared/api/httpClient";
import {
  applyPlatformModerationAction,
  deletePlatformAccount,
  listPlatformAccounts,
  type PlatformAccountItem,
} from "../../shared/api/platformClient";
import { useToast } from "../../shared/ui/Toast/Toast";
import { PlatformSanctionDialog } from "../PlatformSanctionDialog/PlatformSanctionDialog";
import "./AdminAccounts.css";

type Props = {
  onEventsChanged: () => void;
};

type PendingAction = {
  account: PlatformAccountItem;
  action: "block" | "restore" | "delete";
} | null;

export function AdminAccounts({ onEventsChanged }: Props) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const toast = useToast();
  const permissions = useMemo(
    () => new Set(state.session?.platformMembership?.permissions ?? []),
    [state.session?.platformMembership?.permissions],
  );
  const [accounts, setAccounts] = useState<PlatformAccountItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const canModerate = permissions.has("MODERATE_APP_USERS") || permissions.has("MODERATE_CONTENT");
  const canDelete = permissions.has("MANAGE_PLATFORM_USERS");

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    listPlatformAccounts(0, 100, query.trim() || undefined, status === "ALL" ? undefined : status)
      .then(response => setAccounts(response.items))
      .catch(() => {
        setAccounts([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [query, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const confirmAction = async (reason: string) => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      if (pendingAction.action === "delete") {
        await deletePlatformAccount(pendingAction.account.userId, reason);
      } else {
        await applyPlatformModerationAction({
          targetType: "USER",
          targetId: pendingAction.account.userId,
          action: pendingAction.action === "block" ? "BLOCK" : "UNBLOCK",
          reasonCode: "PLATFORM_REVIEW",
          note: reason,
        });
      }
      toast.show(t("platform.sanctions.applied"), "success");
      setPendingAction(null);
      load();
      onEventsChanged();
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="platform-accounts">
      <header className="platform-page-header">
        <div>
          <h1>{t("platform.sections.accounts")}</h1>
          <p>{t("platform.accounts.subtitle")}</p>
        </div>
      </header>

      <div className="platform-list-toolbar">
        <label className="platform-search-field">
          <Search size={17} />
          <input
            value={query}
            placeholder={t("platform.accounts.search")}
            onChange={event => setQuery(event.target.value)}
          />
        </label>
        <div className="platform-filter-group" role="group" aria-label={t("platform.accounts.statusFilter")}>
          {["ALL", "ACTIVE", "BLOCKED", "DELETED"].map(value => (
            <button
              key={value}
              type="button"
              className={status === value ? "is-active" : ""}
              onClick={() => setStatus(value)}
            >
              {t(`platform.accounts.status.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="platform-data-surface">
        <div className="platform-account-head">
          <span>{t("platform.accounts.account")}</span>
          <span>{t("platform.accounts.businesses")}</span>
          <span>{t("platform.accounts.statusLabel")}</span>
          <span />
        </div>

        {loading ? (
          <div className="platform-list-loading"><span /><span /><span /></div>
        ) : failed ? (
          <div className="platform-list-empty">
            <ShieldAlert size={24} />
            <strong>{t("platform.accounts.loadError")}</strong>
            <button type="button" onClick={load}>{t("platform.accounts.retry")}</button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="platform-list-empty">
            <UserRound size={24} />
            <strong>{t("platform.accounts.empty")}</strong>
            <p>{t("platform.accounts.emptyHint")}</p>
          </div>
        ) : accounts.map(account => (
          <div className="platform-account-row" key={account.userId}>
            <div className="platform-account-identity">
              <span>{(account.displayName || account.email).slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{account.displayName || t("platform.accounts.noName")}</strong>
                <small>{account.email}</small>
              </div>
            </div>
            <span className="platform-account-businesses">
              {account.businessNames.length > 0 ? account.businessNames.join(", ") : "—"}
            </span>
            <span className={`platform-status platform-status--${account.status.toLowerCase()}`}>
              {t(`platform.accounts.status.${account.status}`)}
            </span>
            <div className="platform-row-actions">
              {canModerate && account.status === "ACTIVE" && (
                <button type="button" onClick={() => setPendingAction({ account, action: "block" })}>
                  <Ban size={15} />{t("platform.sanctions.block.action")}
                </button>
              )}
              {canModerate && account.status === "BLOCKED" && (
                <button type="button" onClick={() => setPendingAction({ account, action: "restore" })}>
                  <RotateCcw size={15} />{t("platform.sanctions.restore.action")}
                </button>
              )}
              {canDelete && account.status !== "DELETED" && (
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => setPendingAction({ account, action: "delete" })}
                >
                  <Trash2 size={15} />{t("platform.sanctions.delete.action")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <PlatformSanctionDialog
        open={Boolean(pendingAction)}
        targetName={pendingAction?.account.displayName || pendingAction?.account.email || ""}
        action={pendingAction?.action || "block"}
        busy={busy}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </section>
  );
}

