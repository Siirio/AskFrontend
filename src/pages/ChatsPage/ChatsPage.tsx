import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Globe,
  Instagram,
  Loader2,
  MapPin,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "../../app/routes";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  getBrandProfile,
  getChatMessages,
  listChatConversations,
  markChatRead,
  sendChatMessage,
  uploadChatFile,
} from "../../shared/api/askClient";
import type { BrandProfileDto, ChatConversationDto, ChatMessageDto } from "../../shared/api/dto";
import { MessageReadStatus } from "../../shared/ui/MessageReadStatus/MessageReadStatus";

type StatusFilter = "ALL" | "PENDING" | "IN_CHAT" | "CLOSED";

function shortTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function statusLabel(status: ChatConversationDto["conversationStatus"]) {
  if (status === "PENDING") return "Новый";
  if (status === "IN_CHAT") return "В работе";
  return "Завершён";
}

export function ChatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("conversation"));
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [profile, setProfile] = useState<BrandProfileDto | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(true);
  const [threadBusy, setThreadBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find(item => item.conversationId === selectedId) ?? null;

  useEffect(() => {
    if (!state.authenticated) {
      setBusy(false);
      return;
    }
    let active = true;
    setBusy(true);
    listChatConversations()
      .then(response => {
        if (!active) return;
        setConversations(response.items);
        const requested = searchParams.get("conversation");
        const firstId = response.items.find(item => item.conversationId === requested)?.conversationId
          ?? response.items[0]?.conversationId
          ?? null;
        setSelectedId(firstId);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : t("chats.error.title"));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [state.authenticated, t]);

  const openConversation = useCallback(async (conversationId: string) => {
    setSelectedId(conversationId);
    setSearchParams({ conversation: conversationId }, { replace: true });
    setThreadBusy(true);
    setError("");
    try {
      const response = await getChatMessages(conversationId);
      setMessages(response.items);
      await markChatRead(conversationId);
      setConversations(current => current.map(item => (
        item.conversationId === conversationId ? { ...item, customerUnreadCount: 0 } : item
      )));
    } catch (reason) {
      setMessages([]);
      setError(reason instanceof Error ? reason.message : t("chats.error.title"));
    } finally {
      setThreadBusy(false);
    }
  }, [setSearchParams, t]);

  useEffect(() => {
    if (selectedId) openConversation(selectedId);
  }, [selectedId, openConversation]);

  useEffect(() => {
    if (!selected?.businessId) {
      setProfile(null);
      return;
    }
    let active = true;
    getBrandProfile(selected.businessId)
      .then(response => {
        if (active) setProfile(response);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [selected?.businessId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversations.filter(item => {
      if (status !== "ALL" && item.conversationStatus !== status) return false;
      if (!normalized) return true;
      return `${item.subject} ${item.customerName ?? ""}`.toLowerCase().includes(normalized);
    });
  }, [conversations, query, status]);

  const send = async () => {
    const text = reply.trim();
    if (!selectedId || !text || sending) return;
    setSending(true);
    setReply("");
    try {
      const message = await sendChatMessage(selectedId, text);
      setMessages(current => [...current, message]);
    } catch (reason) {
      setReply(text);
      setError(reason instanceof Error ? reason.message : t("chats.error.title"));
    } finally {
      setSending(false);
    }
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;
    setSending(true);
    try {
      const attachmentUrl = await uploadChatFile(selectedId, file);
      const message = await sendChatMessage(selectedId, "", attachmentUrl);
      setMessages(current => [...current, message]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("chats.error.title"));
    } finally {
      setSending(false);
      event.target.value = "";
    }
  };

  if (!state.authenticated) {
    return (
      <main id="main-content" className="ask-page">
        <div className="ask-empty ask-surface">
          <div>
            <MessageCircle size={40} />
            <h2>{t("chats.auth.title")}</h2>
            <p>{t("chats.auth.description")}</p>
            <button type="button" className="ask-primary-button" onClick={() => navigate(ROUTES.auth)}>
              {t("chats.auth.login")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className={`ask-chat-page${selected ? " has-thread" : ""}`}>
      <aside className="ask-chat-list ask-surface">
        <header>
          <h1>Чаты</h1>
          <MessageCircle size={20} />
        </header>

        <label className="ask-chat-search">
          <Search size={18} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по чату" />
        </label>

        <div className="ask-chat-filters">
          {(["ALL", "PENDING", "IN_CHAT", "CLOSED"] as const).map(filter => (
            <button
              key={filter}
              type="button"
              className={status === filter ? "is-active" : ""}
              onClick={() => setStatus(filter)}
            >
              {filter === "ALL" ? "Все" : statusLabel(filter)}
            </button>
          ))}
        </div>

        <div className="ask-chat-list__items">
          {busy && Array.from({ length: 5 }).map((_, index) => <div key={index} className="ask-chat-list__skeleton" />)}
          {!busy && filtered.map(conversation => (
            <button
              type="button"
              key={conversation.conversationId}
              className={selectedId === conversation.conversationId ? "is-active" : ""}
              onClick={() => setSelectedId(conversation.conversationId)}
            >
              <span className="ask-chat-avatar">
                {(conversation.subject || conversation.customerName || "A").slice(0, 1).toUpperCase()}
              </span>
              <span className="ask-chat-list__copy">
                <strong>{conversation.subject || conversation.customerName}</strong>
                <small>{statusLabel(conversation.conversationStatus)}</small>
              </span>
              <span className="ask-chat-list__time">
                {conversation.lastMessageAt && shortTime(conversation.lastMessageAt)}
                {conversation.customerUnreadCount > 0 && <b>{conversation.customerUnreadCount}</b>}
              </span>
            </button>
          ))}
          {!busy && filtered.length === 0 && <div className="ask-empty"><p>Чатов пока нет</p></div>}
        </div>
      </aside>

      <section className="ask-chat-thread ask-surface">
        {selected ? (
          <>
            <header className="ask-chat-thread__header">
              <button type="button" className="ask-chat-back" onClick={() => setSelectedId(null)} aria-label="К списку">
                <ArrowLeft size={19} />
              </button>
              <span className="ask-chat-avatar">{(profile?.businessName || selected.subject).slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{profile?.businessName || selected.subject}</strong>
                <small className={selected.conversationStatus === "IN_CHAT" ? "is-live" : ""}>
                  {statusLabel(selected.conversationStatus)}
                </small>
              </span>
            </header>

            <div className="ask-chat-messages">
              {threadBusy && <Loader2 className="fcw-animate-spin" size={24} />}
              {!threadBusy && messages.map(message => {
                const own = message.senderType === "CUSTOMER";
                const system = message.senderType === "SYSTEM";
                return (
                  <div
                    key={message.messageId}
                    className={`ask-message ask-message--${message.senderType.toLowerCase()}${own ? " is-own" : ""}${system ? " is-system" : ""}`}
                  >
                    {message.text && <p>{message.text}</p>}
                    {message.attachmentUrl && (
                      <a href={message.attachmentUrl} target="_blank" rel="noreferrer">
                        <Paperclip size={15} />
                        Скачать вложение
                      </a>
                    )}
                    <span className="ask-message__meta">
                      <time>{shortTime(message.createdAt)}</time>
                      {own && <MessageReadStatus readAt={message.readAt} compact />}
                    </span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {error && <p className="ask-chat-error">{error}</p>}

            <footer className="ask-chat-composer">
              <input ref={fileRef} hidden type="file" onChange={upload} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Прикрепить файл">
                <Paperclip size={20} />
              </button>
              <textarea
                value={reply}
                onChange={event => setReply(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={t("chats.conversations.placeholder")}
                rows={1}
                disabled={selected.conversationStatus === "CLOSED"}
              />
              <button type="button" className="is-send" onClick={send} disabled={!reply.trim() || sending}>
                {sending ? <Loader2 className="fcw-animate-spin" size={19} /> : <Send size={20} />}
              </button>
            </footer>
          </>
        ) : (
          <div className="ask-empty">
            <div>
              <MessageCircle size={42} />
              <h2>Выберите чат</h2>
              <p>Переписка откроется здесь</p>
            </div>
          </div>
        )}
      </section>

      <aside className="ask-chat-context">
        {selected && (
          <>
            <section className="ask-surface ask-chat-business">
              <div
                className="ask-chat-business__logo"
                style={{ backgroundImage: profile?.logoUrl ? `url(${profile.logoUrl})` : undefined }}
              >
                {!profile?.logoUrl && <Store size={34} />}
              </div>
              <div>
                <h2>{profile?.businessName || selected.subject}</h2>
                {profile?.description && <p>{profile.description}</p>}
              </div>
              <span className="ask-status ask-status--success">Чат открыт</span>
            </section>

            <section className="ask-surface ask-chat-context__actions">
              <h3>Контакты бизнеса</h3>
              {profile?.instagramUrl && (
                <a href={profile.instagramUrl} target="_blank" rel="noreferrer">
                  <Instagram size={18} /> Instagram <ExternalLink size={13} />
                </a>
              )}
              {profile?.telegramUrl && (
                <a href={profile.telegramUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> Telegram <ExternalLink size={13} />
                </a>
              )}
              {profile?.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noreferrer">
                  <Globe size={18} /> Сайт <ExternalLink size={13} />
                </a>
              )}
              {!profile?.instagramUrl && !profile?.telegramUrl && !profile?.websiteUrl && (
                <p>Публичные ссылки не указаны</p>
              )}
            </section>

            <section className="ask-surface ask-chat-context__facts">
              <div><Clock3 size={18} /><span>Статус</span><strong>{statusLabel(selected.conversationStatus)}</strong></div>
              <div><MapPin size={18} /><span>Контекст</span><strong>{selected.subject}</strong></div>
            </section>
          </>
        )}
      </aside>
    </main>
  );
}
