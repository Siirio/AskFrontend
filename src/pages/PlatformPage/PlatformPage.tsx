import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, Upload, Users, MessageCircle, Flag, Send, X, Check, Loader2, Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { buildRoute, ROUTES } from "../../app/routes";
import { Card } from "../../shared/ui/Card/Card";
import { Loading } from "../../shared/ui/Loading/Loading";
import { Select } from "../../shared/ui/Select/Select";
import { useToast } from "../../shared/ui/Toast/Toast";
import { ApiError } from "../../shared/api/httpClient";
import type { ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
import { uploadChatFile } from "../../shared/api/askClient";
import {
  activateManagedImport,
  listPlatformManagedImports,
  type ManagedImportItem,
} from "../../shared/api/managedImportClient";
import {
  listPlatformConversations, getPlatformChatMessages, sendPlatformChatMessage,
  markPlatformChatRead, closePlatformConversation,
  listPlatformUsers, createPlatformUser, updatePlatformUser, deactivatePlatformUser,
  listOpenReports, listCatalogReviews, reviewCatalog, resolveReport, moderateBusiness, moderateProduct,
  type PlatformMembershipItem, type ContentReportItem, type CatalogReviewItem,
} from "../../shared/api/platformClient";

type PlatformSection = "managedImports" | "users" | "support" | "moderation";

const ALL_PERMISSIONS = [
  "MANAGE_PLATFORM_USERS",
  "MANAGE_MANAGED_IMPORTS",
  "EDIT_CATALOG_DURING_IMPORT",
  "USE_AI_CATALOG_TOOLS",
  "PUBLISH_CATALOG_DURING_IMPORT",
  "MANAGE_SUPPORT_CHATS",
  "MODERATE_CONTENT",
  "SUSPEND_BUSINESS",
  "BAN_BUSINESS",
] as const;

const PLATFORM_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;

export function PlatformPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const membership = state.session?.platformMembership;
  const permissions = new Set(membership?.permissions ?? []);
  const canManageImports = permissions.has("MANAGE_MANAGED_IMPORTS");
  const canManageUsers = permissions.has("MANAGE_PLATFORM_USERS");
  const canSupport = permissions.has("MANAGE_SUPPORT_CHATS") || canManageImports;
  const canCloseChats = permissions.has("MANAGE_SUPPORT_CHATS");
  const canModerate = permissions.has("MODERATE_CONTENT")
    || permissions.has("SUSPEND_BUSINESS") || permissions.has("BAN_BUSINESS");

  const sections: { key: PlatformSection; visible: boolean; icon: typeof Upload }[] = [
    { key: "managedImports", visible: canManageImports, icon: Upload },
    { key: "users", visible: canManageUsers, icon: Users },
    { key: "support", visible: canSupport, icon: MessageCircle },
    { key: "moderation", visible: canModerate, icon: Flag },
  ];
  const visibleSections = sections.filter(section => section.visible);
  const [section, setSection] = useState<PlatformSection | null>(null);
  const activeSection = section ?? visibleSections[0]?.key ?? null;

  const [managedImports, setManagedImports] = useState<ManagedImportItem[]>([]);
  const [busyId, setBusyId] = useState("");

  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [messagesBusy, setMessagesBusy] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);

  const [users, setUsers] = useState<PlatformMembershipItem[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ email: "", role: "MODERATOR" as string, permissions: [] as string[] });
  const [userBusy, setUserBusy] = useState(false);

  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [catalogReviews, setCatalogReviews] = useState<CatalogReviewItem[]>([]);
  const [reportBusyId, setReportBusyId] = useState("");
  const [reportResolutions, setReportResolutions] = useState<Record<string, string>>({});

  const loadConversations = useCallback(() => {
    listPlatformConversations().then(res => setConversations(res.items)).catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    if (activeSection === "managedImports" && canManageImports) {
      listPlatformManagedImports().then(setManagedImports).catch(() => setManagedImports([]));
    }
    if (activeSection === "support" && canSupport) {
      loadConversations();
    }
    if (activeSection === "users" && canManageUsers) {
      listPlatformUsers().then(setUsers).catch(() => setUsers([]));
    }
    if (activeSection === "moderation" && canModerate) {
      listOpenReports().then(setReports).catch(() => setReports([]));
      listCatalogReviews().then(setCatalogReviews).catch(() => setCatalogReviews([]));
    }
  }, [activeSection, canManageImports, canSupport, canManageUsers, canModerate, loadConversations]);

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!membership) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const activate = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const updated = await activateManagedImport(requestId);
      setManagedImports(items => items.map(item => item.id === requestId ? updated : item));
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const handleCatalogReview = async (businessId: string, approved: boolean) => {
    setReportBusyId(businessId);
    try {
      await reviewCatalog(businessId, approved);
      setCatalogReviews(items => items.filter(item => item.businessId !== businessId));
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setReportBusyId("");
    }
  };

  const openConversation = async (conversationId: string) => {
    setSection("support");
    setSelectedConversationId(conversationId);
    setMessagesBusy(true);
    try {
      const res = await getPlatformChatMessages(conversationId);
      setMessages(res.items);
      await markPlatformChatRead(conversationId).catch(() => undefined);
      setConversations(items => items.map(item =>
        item.conversationId === conversationId ? { ...item, businessUnreadCount: 0 } : item));
    } catch {
      setMessages([]);
    } finally {
      setMessagesBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selectedConversationId || (!replyText.trim() && !replyFile)) return;
    const text = replyText.trim();
    setReplyText("");
    try {
      const attachmentUrl = replyFile
        ? await uploadChatFile(selectedConversationId, replyFile)
        : undefined;
      const msg = await sendPlatformChatMessage(selectedConversationId, text, attachmentUrl);
      setReplyFile(null);
      setMessages(prev => [...prev, msg]);
      loadConversations();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.support.sendError"), "error");
    }
  };

  const closeConversation = async () => {
    if (!selectedConversationId) return;
    try {
      await closePlatformConversation(selectedConversationId);
      toast.show(t("platform.support.closed"), "success");
      setSelectedConversationId(null);
      setMessages([]);
      loadConversations();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.support.sendError"), "error");
    }
  };

  const togglePermission = (permission: string) => {
    setUserForm(form => ({
      ...form,
      permissions: form.permissions.includes(permission)
        ? form.permissions.filter(item => item !== permission)
        : [...form.permissions, permission],
    }));
  };

  const startEditUser = (user: PlatformMembershipItem) => {
    setEditUserId(user.id);
    setShowUserForm(true);
    setUserForm({ email: user.email, role: user.role, permissions: [...user.permissions] });
  };

  const submitUserForm = async () => {
    if (userForm.permissions.length === 0) {
      toast.show(t("platform.users.permissionsRequired"), "error");
      return;
    }
    setUserBusy(true);
    try {
      if (editUserId) {
        const updated = await updatePlatformUser(editUserId, { role: userForm.role, permissions: userForm.permissions });
        setUsers(items => items.map(item => item.id === editUserId ? updated : item));
      } else {
        const created = await createPlatformUser(userForm);
        setUsers(items => [created, ...items]);
      }
      setShowUserForm(false);
      setEditUserId(null);
      setUserForm({ email: "", role: "MODERATOR", permissions: [] });
      toast.show(t("platform.users.saved"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.users.saveError"), "error");
    } finally {
      setUserBusy(false);
    }
  };

  const deactivateUser = async (membershipId: string) => {
    setUserBusy(true);
    try {
      const updated = await deactivatePlatformUser(membershipId);
      setUsers(items => items.map(item => item.id === membershipId ? updated : item));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.users.saveError"), "error");
    } finally {
      setUserBusy(false);
    }
  };

  const handleReport = async (report: ContentReportItem, status: "RESOLVED" | "REJECTED") => {
    const resolution = reportResolutions[report.id]?.trim();
    if (!resolution) return;
    setReportBusyId(report.id);
    try {
      await resolveReport(report.id, status, resolution);
      setReports(items => items.filter(item => item.id !== report.id));
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setReportBusyId("");
    }
  };

  const handleModerateTarget = async (report: ContentReportItem, action: "SUSPENDED" | "BANNED" | "HIDE") => {
    setReportBusyId(report.id);
    try {
      if (action === "HIDE") {
        await moderateProduct(report.targetId, true);
      } else {
        await moderateBusiness(report.targetId, action);
      }
      toast.show(t("platform.moderation.applied"), "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : t("platform.moderation.error"), "error");
    } finally {
      setReportBusyId("");
    }
  };

  const selectedConversation = conversations.find(item => item.conversationId === selectedConversationId);

  return (
    <main id="main-content">
      <div className="fcw-container fcw-section">
        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
          <div>
            <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
              <Shield size={22} style={{ color: "var(--fcw-color-primary)" }} />
              <h1 className="fcw-h2">{t("platform.title")}</h1>
            </div>
            <p className="fcw-body fcw-text-secondary">{t("platform.subtitle")}</p>
          </div>

          <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
            {visibleSections.map(item => {
              const Icon = item.icon;
              const active = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  className={`fcw-btn fcw-btn-sm ${active ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                  onClick={() => setSection(item.key)}
                  style={{ gap: "0.375rem" }}
                >
                  <Icon size={15} />
                  {t(`platform.sections.${item.key}`)}
                </button>
              );
            })}
          </div>

          {activeSection === "managedImports" && canManageImports && (
            <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              {managedImports.length === 0 && (
                <Card padding="md">
                  <p className="fcw-body-s fcw-text-secondary">{t("platform.managed.empty")}</p>
                </Card>
              )}
              {managedImports.map(item => (
                <Card key={item.id} padding="lg">
                  <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                    <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                      <div>
                        <h3 className="fcw-body-l fcw-weight-semibold">{item.businessName}</h3>
                        <p className="fcw-body-s fcw-text-secondary">{item.requestedByName} · {item.status}</p>
                      </div>
                      <span className="fcw-label">{item.catalogScope} · {item.sourceTypes.join(", ")}</span>
                    </div>
                    <p className="fcw-body-s">{item.preferredContactChannel}: {item.preferredContactValue}</p>
                    {item.expiresAt && (
                      <p className="fcw-body-s fcw-text-secondary">
                        Доступ и чат до {new Date(item.expiresAt).toLocaleString("ru-KZ")}
                      </p>
                    )}
                    {item.sourceLinks && <p className="fcw-body-s fcw-text-secondary">{item.sourceLinks}</p>}
                    <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                      {item.status === "PENDING" && (
                        <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={busyId === item.id} onClick={() => activate(item.id)}>
                          {t("platform.managed.activate")}
                        </button>
                      )}
                      {item.status === "ACTIVE" && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => navigate(buildRoute(ROUTES.business, { businessId: item.businessId }))}>
                          {t("platform.managed.workspace")}
                        </button>
                      )}
                      {item.conversationId && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => openConversation(item.conversationId as string)}>
                          {t("platform.managed.chat")}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}

          {activeSection === "support" && canSupport && (
            <section className="fcw-grid" style={{ gridTemplateColumns: "minmax(240px, 1fr) 2fr", gap: "var(--fcw-space-md)", alignItems: "start" }}>
              <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                {conversations.length === 0 && (
                  <Card padding="md">
                    <p className="fcw-body-s fcw-text-secondary">{t("platform.support.empty")}</p>
                  </Card>
                )}
                {conversations.map(conv => (
                  <Card
                    key={conv.conversationId}
                    padding="md"
                    className="fcw-card-clickable"
                    onClick={() => openConversation(conv.conversationId)}
                    style={selectedConversationId === conv.conversationId
                      ? { borderColor: "var(--fcw-color-primary)" } : undefined}
                  >
                    <div className="fcw-flex-between" style={{ gap: "0.5rem" }}>
                      <div className="fcw-flex-col" style={{ gap: "0.125rem", minWidth: 0 }}>
                        <span className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {conv.subject || conv.customerName}
                        </span>
                        <span className="fcw-body-xs fcw-text-tertiary">
                          {t(`platform.support.status.${conv.conversationStatus}`)}
                        </span>
                      </div>
                      {conv.businessUnreadCount > 0 && (
                        <span className="fcw-body-xs" style={{
                          color: "var(--fcw-color-accent)",
                          backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "var(--fcw-radius-full)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {conv.businessUnreadCount}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <Card padding="md">
                {!selectedConversationId && (
                  <p className="fcw-body-s fcw-text-secondary">{t("platform.support.select")}</p>
                )}
                {selectedConversationId && (
                  <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                    <div className="fcw-flex-between" style={{ gap: "0.5rem" }}>
                      <span className="fcw-body fcw-weight-semibold">
                        {selectedConversation?.subject || selectedConversation?.customerName}
                      </span>
                      {canCloseChats && selectedConversation?.conversationStatus !== "CLOSED" && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={closeConversation}>
                          <X size={14} />
                          {t("platform.support.close")}
                        </button>
                      )}
                    </div>
                    <div className="fcw-flex-col" style={{ gap: "0.5rem", maxHeight: "50vh", overflowY: "auto" }}>
                      {messagesBusy && <Loader2 size={18} className="fcw-spin" />}
                      {!messagesBusy && messages.map(msg => (
                        <div
                          key={msg.messageId}
                          style={{
                            alignSelf: msg.senderType === "PLATFORM" ? "flex-end" : "flex-start",
                            maxWidth: "80%",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "var(--fcw-radius-md)",
                            backgroundColor: msg.senderType === "PLATFORM"
                              ? "color-mix(in srgb, var(--fcw-color-primary) 12%, transparent)"
                              : "var(--fcw-color-surface-secondary)",
                          }}
                        >
                          <span className="fcw-body-xs fcw-text-tertiary">{t(`platform.support.sender.${msg.senderType}`)}</span>
                          {msg.text && <p className="fcw-body-s" style={{ margin: 0 }}>{msg.text}</p>}
                          {msg.attachmentUrl && (
                            <a className="fcw-body-s" href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                              {t("platform.support.attachment")}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    {selectedConversation?.conversationStatus !== "CLOSED" && (
                      <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                        <label className="fcw-btn fcw-btn-secondary fcw-btn-sm">
                          <Paperclip size={14} />
                          <input type="file" style={{ display: "none" }} onChange={event => setReplyFile(event.target.files?.[0] || null)} />
                        </label>
                        <input
                          className="fcw-input"
                          style={{ flex: 1 }}
                          value={replyText}
                          placeholder={t("platform.support.placeholder")}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") sendReply(); }}
                        />
                        <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={sendReply} disabled={!replyText.trim() && !replyFile}>
                          <Send size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </section>
          )}

          {activeSection === "users" && canManageUsers && (
            <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <div className="fcw-flex-between">
                <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.users.title")}</h2>
                <button
                  className="fcw-btn fcw-btn-primary fcw-btn-sm"
                  onClick={() => { setShowUserForm(true); setEditUserId(null); setUserForm({ email: "", role: "MODERATOR", permissions: [] }); }}
                >
                  {t("platform.users.add")}
                </button>
              </div>
              {showUserForm && (
                <Card padding="lg">
                  <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                    <input
                      className="fcw-input"
                      type="email"
                      placeholder={t("platform.users.email")}
                      value={userForm.email}
                      disabled={Boolean(editUserId)}
                      onChange={e => setUserForm(form => ({ ...form, email: e.target.value }))}
                    />
                    <Select
                      size="sm"
                      options={PLATFORM_ROLES.map(role => ({ value: role, label: t(`platform.users.role.${role}`) }))}
                      value={userForm.role}
                      onChange={value => setUserForm(form => ({ ...form, role: value }))}
                    />
                    <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                      {ALL_PERMISSIONS.map(permission => {
                        const active = userForm.permissions.includes(permission);
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
                      <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={userBusy} onClick={submitUserForm}>
                        {userBusy ? <Loader2 size={14} className="fcw-spin" /> : <Check size={14} />}
                        {t("platform.users.save")}
                      </button>
                      <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => { setShowUserForm(false); setEditUserId(null); }}>
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
                        {user.permissions.map(permission => t(`platform.permissions.${permission}`)).join(", ")}
                      </span>
                    </div>
                    <div className="fcw-flex" style={{ gap: "0.5rem", flexShrink: 0 }}>
                      <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => startEditUser(user)}>
                        {t("platform.users.edit")}
                      </button>
                      {user.status === "ACTIVE" && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={userBusy} onClick={() => deactivateUser(user.id)}>
                          {t("platform.users.deactivate")}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}

          {activeSection === "moderation" && canModerate && (
            <section className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <h2 className="fcw-h3" style={{ margin: 0 }}>{t("platform.moderation.title")}</h2>
              {catalogReviews.map(item => (
                <Card key={item.businessId} padding="lg">
                  <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem" }}>
                    <div>
                      <span className="fcw-body fcw-weight-semibold">{item.businessName}</span>
                      <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0" }}>
                        Каталог ожидает решения модератора
                      </p>
                    </div>
                    <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                      <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={reportBusyId === item.businessId} onClick={() => handleCatalogReview(item.businessId, true)}>
                        Одобрить
                      </button>
                      <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={reportBusyId === item.businessId} onClick={() => handleCatalogReview(item.businessId, false)}>
                        Ограничить
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              {reports.length === 0 && catalogReviews.length === 0 && (
                <Card padding="md">
                  <p className="fcw-body-s fcw-text-secondary">{t("platform.moderation.empty")}</p>
                </Card>
              )}
              {reports.map(report => (
                <Card key={report.id} padding="lg">
                  <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                    <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                      <span className="fcw-body fcw-weight-semibold">
                        {t(`platform.moderation.target.${report.targetType}`)} · {report.reasonCode}
                      </span>
                      <span className="fcw-body-xs fcw-text-tertiary">{report.reporterName}</span>
                    </div>
                    {report.details && <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>{report.details}</p>}
                    <textarea
                      className="fcw-input"
                      rows={2}
                      value={reportResolutions[report.id] ?? ""}
                      placeholder={t("platform.moderation.resolution")}
                      onChange={event => setReportResolutions(current => ({
                        ...current,
                        [report.id]: event.target.value,
                      }))}
                    />
                    <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                      <button className="fcw-btn fcw-btn-primary fcw-btn-sm" disabled={reportBusyId === report.id || !reportResolutions[report.id]?.trim()} onClick={() => handleReport(report, "RESOLVED")}>
                        {t("platform.moderation.resolve")}
                      </button>
                      <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={reportBusyId === report.id || !reportResolutions[report.id]?.trim()} onClick={() => handleReport(report, "REJECTED")}>
                        {t("platform.moderation.reject")}
                      </button>
                      {report.targetType === "PRODUCT" && permissions.has("MODERATE_CONTENT") && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={reportBusyId === report.id} onClick={() => handleModerateTarget(report, "HIDE")}>
                          {t("platform.moderation.hideProduct")}
                        </button>
                      )}
                      {report.targetType === "BUSINESS" && permissions.has("SUSPEND_BUSINESS") && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={reportBusyId === report.id} onClick={() => handleModerateTarget(report, "SUSPENDED")}>
                          {t("platform.moderation.suspend")}
                        </button>
                      )}
                      {report.targetType === "BUSINESS" && permissions.has("BAN_BUSINESS") && (
                        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" disabled={reportBusyId === report.id} onClick={() => handleModerateTarget(report, "BANNED")}>
                          {t("platform.moderation.ban")}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
