import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../shared/api/httpClient";
import {
  closePlatformConversation,
  getPlatformChatMessages,
  listOpenReports,
  listPlatformConversations,
  markPlatformChatRead,
  resolveReport,
  sendPlatformChatMessage,
  type ContentReportItem,
} from "../../shared/api/platformClient";
import {
  activateManagedImport,
  listPlatformManagedImports,
  type ManagedImportItem,
} from "../../shared/api/managedImportClient";
import type { ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
import { useToast } from "../../shared/ui/Toast/Toast";
import { PLATFORM_CHAT_TABS } from "../PlatformShell/platformTypes";
import "./AdminSupport.css";

type Props = {
  onEventsChanged: () => void;
};

type ChatType = typeof PLATFORM_CHAT_TABS[number]["type"];

export function AdminSupport({ onEventsChanged }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState<ChatType>("PLATFORM_SUPPORT");
  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [imports, setImports] = useState<ManagedImportItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      listPlatformConversations(),
      listOpenReports(),
      listPlatformManagedImports(),
    ])
      .then(([conversationResponse, reportResponse, importResponse]) => {
        setConversations(conversationResponse.items);
        setReports(reportResponse.filter(report => report.targetType === "MESSAGE"));
        setImports(importResponse);
      })
      .catch(() => {
        setConversations([]);
        setReports([]);
        setImports([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    setSelectedId(null);
    setMessages([]);
  }, [tab]);

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversations.filter(conversation => (
      conversation.conversationType === tab
      && (!normalized
        || conversation.subject?.toLowerCase().includes(normalized)
        || conversation.customerName?.toLowerCase().includes(normalized))
    ));
  }, [conversations, query, tab]);

  const selected = conversations.find(item => item.conversationId === selectedId) ?? null;
  const activeImport = imports.find(item => item.conversationId === selectedId) ?? null;
  const pendingImports = tab === "MANAGED_IMPORT"
    ? imports.filter(item => item.status === "PENDING")
    : [];

  const openConversation = async (conversationId: string) => {
    setSelectedId(conversationId);
    setThreadLoading(true);
    try {
      const response = await getPlatformChatMessages(conversationId);
      setMessages(response.items);
      await markPlatformChatRead(conversationId);
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.support.sendError"), "error");
    } finally {
      setThreadLoading(false);
    }
  };

  const send = async () => {
    const value = text.trim();
    if (!selectedId || !value || sending || selected?.conversationType === "GENERAL_SUPPORT") return;
    setSending(true);
    try {
      const message = await sendPlatformChatMessage(selectedId, value);
      setMessages(current => [...current, message]);
      setText("");
      load();
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.support.sendError"), "error");
    } finally {
      setSending(false);
    }
  };

  const activate = async (request: ManagedImportItem) => {
    setBusyId(request.id);
    try {
      const updated = await activateManagedImport(request.id);
      setImports(current => current.map(item => item.id === updated.id ? updated : item));
      toast.show(t("platform.managed.started"), "success");
      if (updated.conversationId) await openConversation(updated.conversationId);
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const resolveViolation = async (report: ContentReportItem) => {
    setBusyId(report.id);
    try {
      await resolveReport(report.id, "VALID", t("platform.chats.reviewedResolution"));
      setReports(current => current.filter(item => item.id !== report.id));
      onEventsChanged();
      toast.show(t("platform.chats.reviewed"), "success");
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const blockViolation = async (report: ContentReportItem) => {
    setBusyId(report.id);
    try {
      await resolveReport(report.id, "BANNED", t("platform.chats.blockedResolution"));
      setReports(current => current.filter(item => item.id !== report.id));
      onEventsChanged();
      toast.show(t("platform.chats.blocked"), "success");
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    setBusyId(selectedId);
    try {
      const updated = await closePlatformConversation(selectedId);
      setConversations(current => current.map(item => item.conversationId === selectedId ? updated : item));
    } catch (cause) {
      toast.show(cause instanceof ApiError ? cause.message : t("platform.moderation.error"), "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="platform-chats">
      <header className="platform-page-header">
        <div>
          <h1>{t("platform.sections.chats")}</h1>
          <p>{t("platform.chats.subtitle")}</p>
        </div>
      </header>

      <div className="platform-chat-tabs" role="tablist">
        {PLATFORM_CHAT_TABS.map(chatTab => {
          const count = conversations.filter(item => item.conversationType === chatTab.type).length
            + (chatTab.type === "MANAGED_IMPORT" ? pendingImports.length : 0);
          const violationCount = reports.filter(report => (
            conversations.some(conversation => conversation.conversationType === chatTab.type)
            && report.status === "BEING_DISCUSSED"
          )).length;
          return (
            <button
              key={chatTab.type}
              type="button"
              role="tab"
              aria-selected={tab === chatTab.type}
              className={tab === chatTab.type ? "is-active" : ""}
              onClick={() => setTab(chatTab.type)}
            >
              {t(chatTab.labelKey)}
              <span>{count}</span>
              {violationCount > 0 && <b>{violationCount}</b>}
            </button>
          );
        })}
      </div>

      <div className={`platform-chat-workspace${selectedId ? " has-selected" : ""}`}>
        <aside className="platform-conversation-list">
          <label className="platform-chat-search">
            <Search size={16} />
            <input value={query} placeholder={t("platform.chats.search")} onChange={event => setQuery(event.target.value)} />
          </label>

          {tab === "MANAGED_IMPORT" && pendingImports.map(request => (
            <div className="platform-import-request" key={request.id}>
              <span>{t("platform.managed.pending")}</span>
              <strong>{request.businessName}</strong>
              <small>{request.businessScope} · {request.requestedByName}</small>
              <button type="button" disabled={busyId === request.id} onClick={() => activate(request)}>
                {busyId === request.id && <Loader2 size={14} className="fcw-spin" />}
                {t("platform.managed.startWork")}
              </button>
            </div>
          ))}

          {loading ? (
            <div className="platform-chat-loading"><span /><span /><span /></div>
          ) : visibleConversations.length === 0 && pendingImports.length === 0 ? (
            <div className="platform-chat-empty">
              <MessageSquareText size={23} />
              <strong>{t("platform.support.empty")}</strong>
              <p>{t("platform.chats.emptyHint")}</p>
            </div>
          ) : visibleConversations.map(conversation => {
            const violationCount = reports.filter(report => (
              report.status === "BEING_DISCUSSED"
              && messages.some(message => message.messageId === report.targetId)
            )).length;
            return (
              <button
                key={conversation.conversationId}
                type="button"
                className={selectedId === conversation.conversationId ? "platform-conversation-row is-active" : "platform-conversation-row"}
                onClick={() => openConversation(conversation.conversationId)}
              >
                <span className="platform-conversation-avatar">
                  {(conversation.customerName || conversation.subject || "A").slice(0, 1).toUpperCase()}
                </span>
                <span className="platform-conversation-copy">
                  <strong>{conversation.subject || conversation.customerName || t("platform.support.noSubject")}</strong>
                  <small>{t(`platform.support.status.${conversation.conversationStatus}`)}</small>
                </span>
                <span className="platform-conversation-meta">
                  {conversation.lastMessageAt && new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {violationCount > 0 && <b>{violationCount}</b>}
                </span>
              </button>
            );
          })}
        </aside>

        <main className="platform-chat-thread">
          {!selected ? (
            <div className="platform-chat-empty platform-chat-empty--thread">
              <MessageSquareText size={27} />
              <strong>{t("platform.support.select")}</strong>
              <p>{t("platform.chats.selectHint")}</p>
            </div>
          ) : (
            <>
              <header className="platform-thread-header">
                <button type="button" className="platform-thread-back" onClick={() => setSelectedId(null)}>
                  <ArrowLeft size={17} />
                </button>
                <div>
                  <strong>{selected.subject || selected.customerName}</strong>
                  <span>{t(`platform.support.status.${selected.conversationStatus}`)}</span>
                </div>
                {selected.conversationStatus !== "CLOSED"
                  && selected.conversationType !== "GENERAL_SUPPORT" && (
                  <button type="button" onClick={closeConversation}>{t("platform.support.close")}</button>
                )}
              </header>

              <div className="platform-thread-messages">
                {threadLoading ? (
                  <div className="platform-chat-loading"><span /><span /><span /></div>
                ) : messages.length === 0 ? (
                  <div className="platform-chat-empty">
                    <strong>{t("platform.chats.noMessages")}</strong>
                  </div>
                ) : messages.map(message => {
                  const report = reports.find(
                    item => item.targetId === message.messageId
                      && item.status === "BEING_DISCUSSED",
                  );
                  return (
                    <div
                      className={`platform-message platform-message--${message.senderType.toLowerCase()}${report ? " has-violation" : ""}`}
                      key={message.messageId}
                    >
                      {report && (
                        <div className={`platform-message-risk${report.severity === "CRITICAL" ? " is-critical" : ""}`}>
                          <ShieldAlert size={14} />
                          <span>{t(report.severity === "CRITICAL" ? "platform.severity.critical" : "platform.severity.review")}</span>
                        </div>
                      )}
                      {message.text && <p>{message.text}</p>}
                      {message.attachmentUrl && <a href={message.attachmentUrl}>{t("platform.support.attachment")}</a>}
                      <footer>
                        <span>{t(`platform.support.sender.${message.senderType}`)}</span>
                        <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                      </footer>
                      {report && (
                        <div className="platform-message-moderation">
                          <button type="button" disabled={busyId === report.id} onClick={() => resolveViolation(report)}>
                            <CheckCircle2 size={14} />{t("platform.chats.markReviewed")}
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            disabled={busyId === report.id}
                            onClick={() => blockViolation(report)}
                          >
                            <ShieldAlert size={14} />{t("platform.chats.blockMessage")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selected.conversationType === "GENERAL_SUPPORT" ? (
                <div className="platform-thread-readonly">
                  <ShieldAlert size={16} />
                  <span>{t("platform.chats.readOnly")}</span>
                </div>
              ) : selected.conversationStatus !== "CLOSED" && (
                <div className="platform-thread-compose">
                  <textarea
                    rows={1}
                    value={text}
                    placeholder={t("platform.support.placeholder")}
                    onChange={event => setText(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button type="button" disabled={!text.trim() || sending} onClick={send}>
                    {sending ? <Loader2 size={16} className="fcw-spin" /> : <Send size={16} />}
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        <aside className="platform-chat-context">
          {selected && (
            <>
              <h2>{t("platform.chats.context")}</h2>
              <dl>
                <div><dt>{t("platform.chats.type")}</dt><dd>{t(`platform.chats.tabs.${tab === "PLATFORM_SUPPORT" ? "support" : tab === "MANAGED_IMPORT" ? "import" : "general"}`)}</dd></div>
                <div><dt>{t("platform.chats.status")}</dt><dd>{t(`platform.support.status.${selected.conversationStatus}`)}</dd></div>
                <div><dt>{t("platform.chats.created")}</dt><dd>{new Date(selected.createdAt).toLocaleDateString()}</dd></div>
              </dl>
              {activeImport?.expiresAt && (
                <div className="platform-grant-time">
                  <Clock3 size={17} />
                  <div>
                    <strong>{t("platform.managed.accessUntil")}</strong>
                    <span>{new Date(activeImport.expiresAt).toLocaleString()}</span>
                    <small>{activeImport.businessScope}</small>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
