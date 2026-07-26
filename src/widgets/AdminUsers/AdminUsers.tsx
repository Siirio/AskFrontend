import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listPlatformUsers, createPlatformUser, updatePlatformUser, deactivatePlatformUser,
  type PlatformMembershipItem,
} from "../../shared/api/platformClient";
import { Card } from "../../shared/ui/Card/Card";
import { Select } from "../../shared/ui/Select/Select";
import { useToast } from "../../shared/ui/Toast/Toast";
import { ApiError } from "../../shared/api/httpClient";

const ALL_PERMISSIONS = [
  "MANAGE_PLATFORM_USERS",
  "MANAGE_MANAGED_IMPORTS",
  "USE_AI_ITEMS_SERVICES_TOOLS",
  "PUBLISH_ITEMS_SERVICES_DURING_IMPORT",
  "MANAGE_SUPPORT_CHATS",
  "MODERATE_CONTENT",
] as const;

const PLATFORM_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;
const BUSINESS_SCOPED_CATALOG_PERMISSION = "EDIT_ITEMS_SERVICES_DURING_IMPORT";

export function AdminUsers() {
  const { t } = useTranslation();
  const toast = useToast();
  const [users, setUsers] = useState<PlatformMembershipItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", role: "MODERATOR" as string, permissions: [] as string[] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPlatformUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const togglePermission = (permission: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(permission)
        ? f.permissions.filter(p => p !== permission)
        : [...f.permissions, permission],
    }));
  };

  const startEdit = (user: PlatformMembershipItem) => {
    setEditId(user.id);
    setShowForm(true);
    setForm({
      email: user.email,
      role: user.role,
      permissions: user.permissions.filter(permission => permission !== BUSINESS_SCOPED_CATALOG_PERMISSION),
    });
  };

  const submit = async () => {
    if (form.permissions.length === 0) {
      toast.show(t("platform.users.permissionsRequired"), "error");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        const updated = await updatePlatformUser(editId, { role: form.role, permissions: form.permissions });
        setUsers(prev => prev.map(u => u.id === editId ? updated : u));
      } else {
        const created = await createPlatformUser(form);
        setUsers(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ email: "", role: "MODERATOR", permissions: [] });
      toast.show(t("platform.users.saved"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.users.saveError"), "error");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (membershipId: string) => {
    setBusy(true);
    try {
      const updated = await deactivatePlatformUser(membershipId);
      setUsers(prev => prev.map(u => u.id === membershipId ? updated : u));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.users.saveError"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.sections.users")}</h1>
      </div>
      <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
        <div className="fcw-flex-between">
          <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.users.title")}</h2>
          <button
            className="fcw-btn fcw-btn-primary fcw-btn-sm"
            onClick={() => { setShowForm(true); setEditId(null); setForm({ email: "", role: "MODERATOR", permissions: [] }); }}
          >
            {t("platform.users.add")}
          </button>
        </div>
        {showForm && (
          <Card padding="lg">
            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
              <input
                className="fcw-input"
                type="email"
                placeholder={t("platform.users.email")}
                value={form.email}
                disabled={Boolean(editId)}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
              <Select
                size="sm"
                options={PLATFORM_ROLES.map(role => ({ value: role, label: t(`platform.users.role.${role}`) }))}
                value={form.role}
                onChange={value => setForm(f => ({
                  ...f,
                  role: value,
                  permissions: value === "SUPER_ADMIN" ? [...ALL_PERMISSIONS] : f.permissions,
                }))}
              />
              <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                {ALL_PERMISSIONS.map(permission => {
                  const active = form.permissions.includes(permission);
                  return (
                    <button
                      key={permission}
                      className={`fcw-btn fcw-btn-sm ${active ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                      onClick={() => togglePermission(permission)}
                    >
                      {t(`platform.permissions.${permission}`)}
                    </button>
                  );
                })}
              </div>
              <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={busy} onClick={submit}>
                  {busy ? <Loader2 size={14} className="fcw-spin" /> : <Check size={14} />}
                  {t("platform.users.save")}
                </button>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => { setShowForm(false); setEditId(null); }}>
                  {t("platform.users.cancel")}
                </button>
              </div>
            </div>
          </Card>
        )}
        {users.map(user => (
          <Card key={user.id} padding="md">
            <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
              <div className="fcw-flex-col" style={{ gap: "0.25rem", minWidth: 0 }}>
                <span className="fcw-body fcw-weight-medium">{user.displayName || user.email}</span>
                <span className="fcw-body-s fcw-text-secondary">
                  {user.email} · {t(`platform.users.role.${user.role}`)} · {user.status}
                </span>
                <span className="fcw-body-xs fcw-text-tertiary">
                  {user.permissions
                    .filter(permission => permission !== BUSINESS_SCOPED_CATALOG_PERMISSION)
                    .map(permission => t(`platform.permissions.${permission}`))
                    .join(", ")}
                </span>
              </div>
              <div className="fcw-flex" style={{ gap: "0.5rem", flexShrink: 0 }}>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => startEdit(user)}>
                  {t("platform.users.edit")}
                </button>
                {user.status === "ACTIVE" && (
                  <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={busy} onClick={() => deactivate(user.id)}>
                    {t("platform.users.deactivate")}
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
