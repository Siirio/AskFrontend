import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Power, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../shared/api/httpClient";
import {
  createPlatformUser,
  deactivatePlatformUser,
  deletePlatformUser,
  listPlatformUsers,
  updatePlatformUser,
  type PlatformMembershipItem,
} from "../../shared/api/platformClient";
import { Select } from "../../shared/ui/Select/Select";
import { useToast } from "../../shared/ui/Toast/Toast";
import { PlatformSanctionDialog } from "../PlatformSanctionDialog/PlatformSanctionDialog";
import "./AdminUsers.css";

const ALL_PERMISSIONS = [
  "MANAGE_PLATFORM_USERS",
  "MANAGE_MANAGED_IMPORTS",
  "USE_AI_ITEMS_SERVICES_TOOLS",
  "PUBLISH_ITEMS_SERVICES_DURING_IMPORT",
  "MANAGE_SUPPORT_CHATS",
  "VIEW_MODERATION_QUEUE",
  "MODERATE_ITEMS",
  "MODERATE_SERVICES",
  "MODERATE_UNIQUE_OFFERS",
  "MODERATE_BUSINESSES",
  "MODERATE_BRANCHES",
  "MODERATE_BUSINESS_MEMBERS",
  "MODERATE_APP_USERS",
  "MODERATE_CHATS",
] as const;

const PLATFORM_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;
const BUSINESS_SCOPED_CATALOG_PERMISSION = "EDIT_ITEMS_SERVICES_DURING_IMPORT";

export function AdminUsers() {
  const { t } = useTranslation();
  const toast = useToast();
  const [users, setUsers] = useState<PlatformMembershipItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformMembershipItem | null>(null);
  const [form, setForm] = useState({ email: "", role: "MODERATOR", permissions: [] as string[] });
  const [busy, setBusy] = useState(false);

  const activeCount = useMemo(() => users.filter(user => user.status === "ACTIVE").length, [users]);

  const load = () => {
    listPlatformUsers()
      .then(items => setUsers(items.map(user => ({
        ...user,
        status: user.status || "ACTIVE",
        permissions: user.permissions ?? [],
      }))))
      .catch(() => setUsers([]));
  };

  useEffect(load, []);

  const startCreate = () => {
    setEditId(null);
    setForm({ email: "", role: "MODERATOR", permissions: ["VIEW_MODERATION_QUEUE", "MODERATE_ITEMS", "MODERATE_SERVICES", "MODERATE_CHATS", "MANAGE_SUPPORT_CHATS"] });
    setShowForm(true);
  };

  const startEdit = (user: PlatformMembershipItem) => {
    setEditId(user.id);
    setForm({
      email: user.email,
      role: user.role,
      permissions: user.permissions.filter(permission => permission !== BUSINESS_SCOPED_CATALOG_PERMISSION),
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.email.trim() || form.permissions.length === 0) {
      toast.show(t("platform.users.permissionsRequired"), "error");
      return;
    }
    setBusy(true);
    try {
      const updated = editId
        ? await updatePlatformUser(editId, { role: form.role, permissions: form.permissions })
        : await createPlatformUser(form);
      setUsers(current => editId
        ? current.map(user => user.id === editId ? updated : user)
        : [updated, ...current]);
      setShowForm(false);
      setEditId(null);
      toast.show(t("platform.users.saved"), "success");
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.users.saveError"), "error");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (membershipId: string) => {
    setBusy(true);
    try {
      const updated = await deactivatePlatformUser(membershipId);
      setUsers(current => current.map(user => user.id === membershipId ? updated : user));
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.users.saveError"), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deletePlatformUser(deleteTarget.id);
      setUsers(current => current.filter(user => user.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.show(t("platform.sanctions.applied"), "success");
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.users.saveError"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="platform-team">
      <header className="platform-page-header">
        <div>
          <h1>{t("platform.sections.team")}</h1>
          <p>{t("platform.team.subtitle")}</p>
        </div>
        <button type="button" className="platform-team-add" onClick={startCreate}>
          <Plus size={16} />{t("platform.users.add")}
        </button>
      </header>

      <div className="platform-team-summary">
        <div><ShieldCheck size={18} /><span>{t("platform.team.active")}</span><strong>{activeCount}</strong></div>
        <div><UserRoundCog size={18} /><span>{t("platform.team.total")}</span><strong>{users.length}</strong></div>
      </div>

      {showForm && (
        <div className="platform-team-form">
          <div className="platform-team-form-heading">
            <div>
              <h2>{t(editId ? "platform.team.editTitle" : "platform.team.createTitle")}</h2>
              <p>{t("platform.team.formHint")}</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)}>{t("platform.users.cancel")}</button>
          </div>
          <div className="platform-team-form-controls">
            <input
              className="ask-field"
              type="email"
              value={form.email}
              disabled={Boolean(editId)}
              placeholder={t("platform.users.email")}
              onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
            />
            <Select
              size="sm"
              options={PLATFORM_ROLES.map(role => ({ value: role, label: t(`platform.users.role.${role}`) }))}
              value={form.role}
              onChange={role => setForm(current => ({
                ...current,
                role,
                permissions: role === "SUPER_ADMIN" ? [...ALL_PERMISSIONS] : current.permissions,
              }))}
            />
          </div>
          <div className="platform-permission-grid">
            {ALL_PERMISSIONS.map(permission => {
              const active = form.permissions.includes(permission);
              return (
                <button
                  key={permission}
                  type="button"
                  className={active ? "is-active" : ""}
                  onClick={() => setForm(current => ({
                    ...current,
                    permissions: active
                      ? current.permissions.filter(value => value !== permission)
                      : [...current.permissions, permission],
                  }))}
                >
                  <span>{active && <Check size={13} />}</span>
                  {t(`platform.permissions.${permission}`)}
                </button>
              );
            })}
          </div>
          <div className="platform-team-form-actions">
            <button type="button" className="ask-primary-button" disabled={busy} onClick={submit}>
              <Check size={15} />{t("platform.users.save")}
            </button>
          </div>
        </div>
      )}

      <div className="platform-team-list">
        <div className="platform-team-head">
          <span>{t("platform.team.member")}</span>
          <span>{t("platform.team.role")}</span>
          <span>{t("platform.team.permissions")}</span>
          <span>{t("platform.accounts.statusLabel")}</span>
          <span />
        </div>
        {users.length === 0 ? (
          <div className="platform-list-empty">
            <UserRoundCog size={25} />
            <strong>{t("platform.team.empty")}</strong>
          </div>
        ) : users.map(user => (
          <div className="platform-team-row" key={user.id}>
            <div className="platform-account-identity">
              <span>{(user.displayName || user.email).slice(0, 1).toUpperCase()}</span>
              <div><strong>{user.displayName || user.email}</strong><small>{user.email}</small></div>
            </div>
            <span>{t(`platform.users.role.${user.role}`)}</span>
            <span className="platform-team-permissions">
              {t("platform.team.permissionsCount", {
                count: user.permissions.filter(permission => permission !== BUSINESS_SCOPED_CATALOG_PERMISSION).length,
              })}
            </span>
            <span className={`platform-status platform-status--${(user.status || "active").toLowerCase()}`}>
              {user.status || "ACTIVE"}
            </span>
            <div className="platform-row-actions">
              <button type="button" onClick={() => startEdit(user)}><Pencil size={14} />{t("platform.users.edit")}</button>
              {user.status === "ACTIVE" && (
                <button type="button" disabled={busy} onClick={() => deactivate(user.id)}>
                  <Power size={14} />{t("platform.users.deactivate")}
                </button>
              )}
              <button type="button" className="is-danger" onClick={() => setDeleteTarget(user)}>
                <Trash2 size={14} />{t("platform.sanctions.delete.action")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <PlatformSanctionDialog
        open={Boolean(deleteTarget)}
        targetName={deleteTarget?.displayName || deleteTarget?.email || ""}
        action="delete"
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </section>
  );
}
