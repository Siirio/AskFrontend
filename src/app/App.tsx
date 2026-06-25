import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Search, History, UserRound, ShoppingBag, Building2, LogOut, Phone, MapPin,
  MessageCircle, Send, ShieldCheck, Clock, FileSpreadsheet, Plus, Settings2,
  Inbox, Bell, Copy, Check, X, Upload, ArrowRight, ChevronLeft,
  Package, Scissors, Users, Store, BarChart3, Home, Star, RefreshCw
} from "lucide-react";
import { loginWithPassword, logout as clearSession, registerBusiness, registerCustomer, updateProfile, verifyCode } from "../shared/api/authClient";
import type { AuthChallenge } from "../shared/api/authClient";
import { ApiError, API_BASE_URL, transformKeys } from "../shared/api/httpClient";
import { searchAsk, createFallbackRequest, getSupplierTasks, getCustomerHistory, getCustomerRequestDetail, getSupplierTaskDetail, respondToTask, listProducts, createProduct, updateProduct, deleteProduct, listServices, createService, updateService, listStaff, createStaff, resetStaffPassword, updateStaff, listCities, listCategories, listBranches, createBranch } from "../shared/api/askClient";
import type { SearchResult } from "../entities/search-result/model";
import type { CustomerRequest } from "../entities/request/model";
import type { SupplierTask } from "../entities/supplier/model";

/* ── Types ── */
type Scope = "PRODUCT" | "SERVICE";
type MainMode = "auth" | "client" | "business";
type ClientTab = "search" | "history" | "profile";
type ResultTab = "found" | "suppliers" | "chats";
type BusinessTab = "activity" | "products" | "services" | "profile";
type StaffStatus = "PENDING_ACTIVATION" | "ACTIVE" | "PASSWORD_RESET_REQUIRED" | "DISABLED";
type ImportStep = "upload" | "mapping" | "preview" | "approved";

type UserRole = "customer" | "business";
type AuthMode = "login" | "register";

interface BusinessProduct {
  id: string; productOfferId: string; name: string; category: string; sku: string; price: string; enabled: boolean; source: string;
}

interface BusinessService {
  id: string; serviceBranchOfferId: string; name: string; category: string; price: string; duration: string; active: boolean; schedule: string;
}

interface StaffMember {
  id: string; name: string; email: string; status: StaffStatus; tempPassword: string; activatedAt: string;
}

interface ChatMessage { id: string; role: "customer" | "business" | "system"; text: string; }

interface SupplierCheck {
  id: string; business: string; status: string; statusLabel: string; price: string;
  hint: string; comment: string; address: string; distance: string; repliedAt: string;
  hasChat: boolean; expanded: boolean;
}

interface ChatThread {
  id: string; with: string; context: string; lastMessage: string; time: string; unread: number;
}

/* ── Constants ── */
const staffStatusRu: Record<StaffStatus, string> = { PENDING_ACTIVATION: "Ожидает активации", ACTIVE: "Активен", PASSWORD_RESET_REQUIRED: "Требуется смена пароля", DISABLED: "Заблокирован" };
const staffStatusClass: Record<StaffStatus, string> = { PENDING_ACTIVATION: "staff-pending", ACTIVE: "staff-active", PASSWORD_RESET_REQUIRED: "staff-reset", DISABLED: "staff-disabled" };

const initialSuppliers: SupplierCheck[] = [
  { id: "s1", business: "Oldschool Market", status: "HAS_ANALOG", statusLabel: "Есть аналог", price: "38 000 ₸", hint: "Кожаная куртка 90s", comment: "Можем показать похожую модель.", address: "ул. Панфилова 22", distance: "800 м", repliedAt: "10:24", hasChat: true, expanded: false },
  { id: "s2", business: "Kaspi POS Store", status: "HAS_ITEM", statusLabel: "Есть в наличии", price: "99 000 ₸", hint: "Mercury MPRINT G80", comment: "Есть в магазине на Абая.", address: "ул. Абая 45", distance: "350 м", repliedAt: "10:30", hasChat: false, expanded: false },
  { id: "s3", business: "Vintage Room", status: "SENT", statusLabel: "Отправлено", price: "", hint: "Ждем ответ", comment: "Автоматическая проверка отправлена.", address: "пр. Республика 10", distance: "1.8 км", repliedAt: "ожидаем", hasChat: false, expanded: false },
  { id: "s4", business: "Drop Archive", status: "NEED_CLARIFICATION", statusLabel: "Нужно уточнение", price: "", hint: "Нужен размер", comment: "Напишите размер и материал.", address: "ул. Тауелсиздик 3", distance: "3.1 км", repliedAt: "10:38", hasChat: true, expanded: false },
];

const initialMessages: ChatMessage[] = [
  { id: "m1", role: "system", text: "Автоматическая проверка. Клиентское сообщение не создано." },
  { id: "m2", role: "business", text: "Здравствуйте. Есть аналог, можем показать фото." },
  { id: "m3", role: "customer", text: "Подойдет, если размер M и натуральная кожа." },
];

const initialChatThreads: ChatThread[] = [
  { id: "ct1", with: "Oldschool Market", context: "Кожаная куртка 90s", lastMessage: "Подойдет, если размер M", time: "10:42", unread: 1 },
  { id: "ct2", with: "Barber Point", context: "Мужская стрижка", lastMessage: "Завтра в 18:00 подходит", time: "09:15", unread: 0 },
  { id: "ct3", with: "Drop Archive", context: "Нужен размер и материал", lastMessage: "Напишите детали", time: "вчера", unread: 0 },
];

/* ── Helpers ── */
function extractError(error: unknown): string {
  if (error instanceof ApiError) return error.message || `Ошибка ${error.status}`;
  return "Не удалось выполнить запрос. Проверьте соединение.";
}

/* ── Main App ── */
export function App() { return <AppShell />; }

function AppShell() {
  const [mode, setMode] = useState<MainMode>("auth");
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [session, setSession] = useState<{
    token: string; role: string; userId: string; displayName: string; email: string;
    businessId?: string; businessName?: string; branchId?: string; branchName?: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function onLogin(s: typeof session, role: UserRole) {
    setSession(s);
    setUserRole(role);
    setMode(role === "customer" ? "client" : "business");
  }

  function onLogout() {
    clearSession();
    setSession(null);
    setMode("auth");
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  useEffect(() => {
    const stored = window.localStorage.getItem("ask.accessToken");
    if (stored) {
      fetch(`${API_BASE_URL}/api/v1/auth/session`, {
        headers: { Authorization: `Bearer ${stored}` },
      }).then(r => r.ok ? r.json().then(raw => transformKeys(raw) as any) : Promise.reject()).then(data => {
        const isBiz = !!(data.business || data.role?.startsWith("ROLE_BUSINESS"));
        onLogin({
          token: stored, role: data.role, userId: data.user?.userId ?? "", displayName: data.user?.displayName ?? "", email: data.user?.email ?? "",
          businessId: data.business?.businessId, businessName: data.business?.businessName,
          branchId: data.business?.branchId, branchName: data.business?.branchName,
        }, isBiz ? "business" : "customer");
      }).catch(() => window.localStorage.removeItem("ask.accessToken"));
    }
  }, []);

  if (mode === "auth") return <AuthScreen onLogin={onLogin} onToast={showToast} />;
  if (mode === "client") return <CustomerShell session={session!} onLogout={onLogout} showToast={showToast} />;
  return <BusinessShell session={session!} onLogout={onLogout} showToast={showToast} />;
}

/* ── Auth Screen ── */
function AuthScreen({ onLogin, onToast }: { onLogin: (s: any, r: UserRole) => void; onToast: (m: string) => void }) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCityId, setBranchCityId] = useState("");
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { listCities().then(setCities).catch(() => {}); }, []);

  function reset() { setError(null); setChallenge(null); setCode(""); }

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const s = await loginWithPassword(email, password);
      const isBiz = s.role?.startsWith("ROLE_BUSINESS");
      if (s.activationRequired) { onToast("Требуется активация аккаунта. Проверьте лог сервера."); setLoading(false); return; }
      let biz = s.business;
      if (isBiz && !biz) {
        try {
          const sess = await fetch(`${API_BASE_URL}/api/v1/auth/session`, { headers: { Authorization: `Bearer ${s.accessToken}` } }).then(r => r.ok ? r.json().then(raw => transformKeys(raw) as any) : null);
          if (sess?.business) biz = sess.business;
        } catch { /* session fetch best-effort */ }
      }
      onLogin({ token: s.accessToken, role: s.role, userId: s.user?.userId ?? "", displayName: s.user?.displayName ?? "", email: email,
        businessId: biz?.businessId, businessName: biz?.businessName, branchId: biz?.branchId, branchName: biz?.branchName,
      }, isBiz ? "business" : "customer");
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const ch = selectedRole === "customer"
        ? await registerCustomer(displayName, email, password)
        : await registerBusiness({ email, password, businessName, branchName, branchCityId: branchCityId, branchAddress: branchName });
      setChallenge(ch);
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault(); if (!challenge) return; setError(null); setLoading(true);
    try {
      const s = await verifyCode(challenge.auth_challenge_id, code);
      const isBiz = s.role?.startsWith("ROLE_BUSINESS");
      if (s.activationRequired) { onToast("Требуется активация. Проверьте лог сервера для кода."); setLoading(false); return; }
      onLogin({ token: s.accessToken, role: s.role, userId: s.user?.userId ?? "", displayName: s.user?.displayName ?? "", email: email,
        businessId: s.business?.businessId, businessName: s.business?.businessName, branchId: s.business?.branchId, branchName: s.business?.branchName,
      }, isBiz ? "business" : "customer");
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  return (
    <main className="auth-main">
      <section className="auth-shell">
        <div className="auth-hero">
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>A</div>
          <h1>{challenge ? "Подтвердите вход" : "Найдите товар, услугу или поставщика"}</h1>
          <p>Ask — поиск товаров и услуг с подтверждением от местных поставщиков. Вход и регистрация через код подтверждения (SMTP пока не настроен — код в логах сервера).</p>
        </div>

        {challenge ? (
          <form className="auth-panel" onSubmit={handleVerify}>
            <p style={{ margin: 0, color: "#40505c", lineHeight: 1.5 }}>Код отправлен на <strong>{challenge.masked_destination}</strong>. Введите 6 цифр из лога сервера.</p>
            <label>Код подтверждения<input value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength={6} autoComplete="one-time-code" /></label>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary btn-full" type="submit" disabled={loading}><ShieldCheck size={18} />{loading ? "Проверка..." : "Подтвердить"}</button>
            <button type="button" className="btn-ghost" onClick={reset}>Назад</button>
          </form>
        ) : (
          <form className="auth-panel" onSubmit={authMode === "login" ? handleLogin : handleRegister}>
            <div className="role-switch">
              <button type="button" className={selectedRole === "customer" ? "active" : ""} onClick={() => setSelectedRole("customer")}><UserRound size={18} />Клиент</button>
              <button type="button" className={selectedRole === "business" ? "active" : ""} onClick={() => setSelectedRole("business")}><ShoppingBag size={18} />Продавец</button>
            </div>
            <div className="role-switch">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Вход</button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Регистрация</button>
            </div>
            <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username" /></label>
            <label>Пароль<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>
            {authMode === "register" && selectedRole === "customer" && <label>Имя<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ваше имя" /></label>}
            {authMode === "register" && selectedRole === "business" && <>
              <label>Название бизнеса<input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="ИП / ТОО" /></label>
              <label>Филиал / адрес<input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="ул. Абая, 1" /></label>
              <label>Город
                <select value={branchCityId} onChange={e => setBranchCityId(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
                  <option value="">Выберите город</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </>}
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary btn-full" type="submit" disabled={loading}>
              <ShieldCheck size={18} />
              {loading ? "Отправка..." : authMode === "login" ? `Войти как ${selectedRole === "customer" ? "клиент" : "продавец"}` : "Зарегистрироваться"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

/* ── Customer Shell ── */
function CustomerShell({ session, onLogout, showToast }: { session: any; onLogout: () => void; showToast: (m: string) => void }) {
  const [tab, setTab] = useState<ClientTab>("search");
  return (
    <div className="customer-shell">
      <CustomerTopbar city="Кызылорда" onLogout={onLogout} />
      <div className="customer-content">
        {tab === "search" && <SearchPage showToast={showToast} />}
        {tab === "history" && <HistoryPage />}
        {tab === "profile" && <ProfilePage session={session} onLogout={onLogout} />}
      </div>
      <BottomTabbar tab={tab} onTabChange={setTab} />
    </div>
  );
}

function CustomerTopbar({ city, onLogout }: { city: string; onLogout: () => void }) {
  return (
    <header className="customer-topbar">
      <div>
        <span className="city-label">КЛИЕНТ</span>
        <span className="city-name">{city}</span>
      </div>
      <button onClick={onLogout} className="btn-ghost" style={{ minHeight: 38 }}><LogOut size={18} />Выйти</button>
    </header>
  );
}

function BottomTabbar({ tab, onTabChange }: { tab: ClientTab; onTabChange: (t: ClientTab) => void }) {
  return (
    <nav className="bottom-tabbar">
      <button className={tab === "search" ? "active" : ""} onClick={() => onTabChange("search")}><Search size={20} /><span>Поиск</span></button>
      <button className={tab === "history" ? "active" : ""} onClick={() => onTabChange("history")}><History size={20} /><span>История</span></button>
      <button className={tab === "profile" ? "active" : ""} onClick={() => onTabChange("profile")}><UserRound size={20} /><span>Профиль</span></button>
    </nav>
  );
}

/* ── Search Page ── */
function SearchPage({ showToast }: { showToast: (m: string) => void }) {
  const [query, setQuery] = useState("зимние шины R16");
  const [cityId, setCityId] = useState("");
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [scope, setScope] = useState<"all" | "product" | "service">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("found");
  const [suppliers, setSuppliers] = useState<SupplierCheck[]>(initialSuppliers);
  const [chats] = useState<ChatThread[]>(initialChatThreads);
  const [activeChat, setActiveChat] = useState<ChatThread | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState("");
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listCities().then(setCities).catch(() => {});
  }, []);

  async function doSearch() {
    setLoading(true);
    try { const r = await searchAsk(query, scope); setResults(r); setResultTab("found"); } catch { setResults([]); } finally { setLoading(false); }
  }

  async function doFallback(s: "product" | "service") {
    setSending(true);
    try {
      const selectedCity = cities.find(c => c.id === cityId);
      const r = await createFallbackRequest(query, s, selectedCity?.name || "Кызылорда");
      setRequest(r); setResultTab("suppliers"); showToast("Запрос отправлен поставщикам");
    } catch (e) { showToast(extractError(e)); } finally { setSending(false); }
  }

  function sendChatMsg() {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now().toString(), role: "customer", text: chatInput.trim() }]);
    setChatInput("");
  }

  useEffect(() => { void doSearch(); }, []);

  return (
    <div>
      <section className="search-shell">
        <div className="search-topline">
          <div>
            <p className="eyebrow">Smart Search</p>
            <h1>Найдите товар, услугу или поставщика</h1>
          </div>
          <label className="city-select"><span>Город</span>
            <select value={cityId} onChange={e => setCityId(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, minWidth: 160 }}>
              <option value="">Выберите город</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <div className="search-input-row">
          <Search size={22} />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") doSearch(); }} placeholder="Что ищете? Например: зимние шины R16" />
          <button className="btn-primary" onClick={doSearch} disabled={loading}>{loading ? "Поиск..." : "Найти"}</button>
        </div>
        <div className="segmented">
          {[["all","Все"],["product","Товары"],["service","Услуги"]].map(([v,l]) => (
            <button key={v} className={scope === v ? "active" : ""} onClick={() => setScope(v as any)}>{l}</button>
          ))}
        </div>
      </section>

      {loading && <div className="empty-state">Ищем по товарам, услугам и профилям поставщиков...</div>}

      {!loading && (results.length > 0 || true) && (
        <>
          <div className="result-tabs">
            <button className={resultTab === "found" ? "active" : ""} onClick={() => setResultTab("found")}>Найденное<span className="tab-badge">{results.length}</span></button>
            <button className={resultTab === "suppliers" ? "active" : ""} onClick={() => setResultTab("suppliers")}>Подходящие магазины<span className="tab-badge">{suppliers.length}</span></button>
            <button className={resultTab === "chats" ? "active" : ""} onClick={() => setResultTab("chats")}>Чаты<span className="tab-badge">{chats.length}</span></button>
          </div>

          {resultTab === "found" && (
            <>
              {results.length === 0 ? (
                <div className="empty-state"><Search size={32} /><p>Точных совпадений нет. Отправьте запрос поставщикам для ручного подтверждения.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-primary" onClick={() => doFallback("product")}><Send size={16} />Запросить товар</button>
                    <button className="btn-outline" onClick={() => doFallback("service")}><ShieldCheck size={16} />Запросить услугу</button>
                  </div>
                </div>
              ) : (
                <div className="result-grid">
                  {results.map(r => <ResultCard key={r.id} result={r} />)}
                </div>
              )}
            </>
          )}

          {resultTab === "suppliers" && (
            <div>
              {request && (
                <div className="waiting-state" style={{ marginBottom: 12 }}>
                  <Clock size={22} /><div><strong>Запрос отправлен</strong><span>{request.matchedSuppliers} поставщиков могут ответить по запросу «{request.query}»</span></div>
                </div>
              )}
              <div className="supplier-list">
                {suppliers.map(s => <SupplierRow key={s.id} supplier={s} onChat={() => { const ct = chats.find(c => c.with === s.business); if (ct) { setActiveChat(ct); setResultTab("chats"); } }} />)}
              </div>
              {!request && (
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={() => doFallback("product")}><Send size={16} />Запросить товар</button>
                  <button className="btn-outline" onClick={() => doFallback("service")}><ShieldCheck size={16} />Запросить услугу</button>
                </div>
              )}
            </div>
          )}

          {resultTab === "chats" && (
            activeChat ? (
              <ChatWindow chat={activeChat} messages={chatMessages} input={chatInput} onInputChange={setChatInput} onSend={sendChatMsg} onBack={() => setActiveChat(null)} />
            ) : (
              <div className="chat-list">
                {chats.map(c => <ChatRow key={c.id} chat={c} onClick={() => setActiveChat(c)} />)}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const kindLabel: Record<string, string> = { product: "Товар", service: "Услуга", business: "Поставщик" };
  return (
    <article className="result-card">
      <div className="result-card-head">
        <span className="kind-pill">{kindLabel[result.kind]}</span>
        <span className={`conf-badge conf-${result.confidence}`}>{result.confidence === "high" ? "Высокая" : result.confidence === "medium" ? "Средняя" : "Низкая"} точность</span>
      </div>
      <h3>{result.title}</h3>
      <div className="supplier-line"><strong>{result.supplierName}</strong><span>{result.category}</span></div>
      <p>{result.note}</p>
      <div className="result-meta">
        <span className="price">{result.priceLabel ?? "Цена после уточнения"}</span>
        <span>{result.sourceLabel}</span>
        <span>{result.branch}</span>
      </div>
      <div className="card-actions">
        {result.actions.includes("call") && <button className="icon-only" aria-label="Позвонить"><Phone size={17} /></button>}
        {result.actions.includes("map") && <button className="icon-only" aria-label="Карта"><MapPin size={17} /></button>}
        {result.actions.includes("chat") && <button className="icon-only" aria-label="Чат"><MessageCircle size={17} /></button>}
        {result.actions.includes("request") && <button className="btn-primary"><Send size={16} />Подтвердить</button>}
      </div>
    </article>
  );
}

function SupplierRow({ supplier, onChat }: { supplier: SupplierCheck; onChat: () => void }) {
  const sc = `status-${supplier.status.toLowerCase().replace(/_/g, "-")}`;
  const cls = sc === "status-has-item" ? "status-has-item" : sc === "status-has-analog" ? "status-has-analog" : sc === "status-sent" ? "status-sent" : sc === "status-need-clarification" ? "status-need-clarification" : sc === "status-no-item" ? "status-no-item" : "status-sent";
  return (
    <div className="supplier-row">
      <Store size={18} color="#66737e" />
      <div className="supplier-info">
        <strong>{supplier.business}</strong>
        <span>{supplier.hint} · {supplier.address} · {supplier.distance}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className={`status-chip ${cls}`}>{supplier.statusLabel}</span>
        {supplier.price && <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{supplier.price}</span>}
        {supplier.hasChat && <button className="btn-outline" style={{ minHeight: 34, fontSize: 13 }} onClick={onChat}><MessageCircle size={14} />Чат</button>}
      </div>
    </div>
  );
}

function ChatRow({ chat, onClick }: { chat: ChatThread; onClick: () => void }) {
  return (
    <div className="chat-row" onClick={onClick}>
      <div className="chat-avatar">{chat.with[0]}</div>
      <div className="chat-info"><strong>{chat.with}</strong><span>{chat.context} — {chat.lastMessage}</span></div>
      <div className="chat-meta"><span className="time">{chat.time}</span>{chat.unread > 0 && <span className="unread">{chat.unread}</span>}</div>
    </div>
  );
}

function ChatWindow({ chat, messages, input, onInputChange, onSend, onBack }: { chat: ChatThread; messages: ChatMessage[]; input: string; onInputChange: (v: string) => void; onSend: () => void; onBack: () => void }) {
  return (
    <div className="chat-window">
      <div className="chat-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="btn-ghost" onClick={onBack} style={{ minHeight: 34, padding: "0 6px" }}><ChevronLeft size={18} /></button><Store size={18} color="var(--primary)" /><span>{chat.with}</span></div>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{chat.context}</span>
      </div>
      <div className="chat-messages">
        {messages.map(m => <div key={m.id} className={`chat-msg ${m.role}`}>{m.text}</div>)}
      </div>
      <div className="chat-input-row">
        <input value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onSend(); }} placeholder="Сообщение..." />
        <button className="btn-primary" onClick={onSend} style={{ borderRadius: 999, width: 42, padding: 0 }}><Send size={16} /></button>
      </div>
    </div>
  );
}

/* ── History Page ── */
function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getCustomerHistory().then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function openSnapshot(requestId: string) {
    setDetailLoading(true);
    try {
      const d = await getCustomerRequestDetail(requestId);
      setDetail(d);
    } catch {} finally { setDetailLoading(false); }
  }

  return (
    <div>
      <div className="section-heading" style={{ marginBottom: 16 }}><p className="eyebrow">История</p><h2>Последние поиски</h2></div>
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div className="history-list">
          {history.map((h: any) => (
            <div className="history-card" key={h.id} onClick={() => openSnapshot(h.id)} style={{ cursor: "pointer" }}>
              <div className="history-card-head">
                <h3>{h.query}</h3>
                <span className="time">{new Date(h.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="history-meta">
                <span>{h.scope === "PRODUCT" ? <><Package size={14} /> Товары</> : <><Scissors size={14} /> Услуги</>}</span>
                <span>{h.city}</span>
                <span>{h.matchedSuppliers} магазина</span>
                <span>{h.replyCount} ответа</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && history.length === 0 && <div className="empty-state"><History size={32} /><p>История поиска пока пуста</p></div>}

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2>Снимок запроса</h2>
              <button className="btn-ghost" onClick={() => setDetail(null)}><X size={18} /></button>
            </div>
            <div className="profile-section" style={{ marginBottom: 16 }}>
              <div className="profile-field"><label>Запрос</label><strong>{detail.query}</strong></div>
              <div className="profile-field"><label>Тип</label><span>{detail.scope === "PRODUCT" ? "Товар" : "Услуга"}</span></div>
              <div className="profile-field"><label>Город</label><span>{detail.city}</span></div>
              <div className="profile-field"><label>Дата</label><span>{new Date(detail.createdAt).toLocaleString("ru-RU")}</span></div>
              <div className="profile-field"><label>Поставщиков</label><span>{detail.matchedSuppliers}</span></div>
            </div>
            <h3 style={{ marginBottom: 8 }}>Ответы поставщиков ({detail.replies?.length || 0})</h3>
            {detailLoading && <div className="empty-state"><RefreshCw size={20} className="spin" /><p>Загрузка...</p></div>}
            {!detailLoading && detail.replies?.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>Пока нет ответов</p>}
            {!detailLoading && detail.replies?.map((r: any) => (
              <div key={r.id} className="supplier-row" style={{ marginBottom: 8 }}>
                <Store size={18} color="#66737e" />
                <div className="supplier-info">
                  <strong>{r.supplierName}</strong>
                  <span>{r.branchName}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="status-chip status-has-item">{r.statusLabel}</span>
                  {r.price && <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{Number(r.price).toLocaleString("ru-RU")} ₸</span>}
                  {r.comment && <span style={{ fontSize: 12, color: "var(--muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{r.comment}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Profile Page ── */
function ProfilePage({ session, onLogout }: { session: any; onLogout: () => void }) {
  const [editing, setEditing] = useState(false);
  const [dispName, setDispName] = useState(session.displayName || "");
  const [email, setEmail] = useState(session.email || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    try {
      const s = await updateProfile({ displayName: dispName.trim() || undefined, email: email.trim() || undefined });
      session.displayName = s.user?.displayName || dispName;
      session.email = s.user?.email || email;
      setEditing(false);
      setToast("Профиль обновлен");
      setTimeout(() => setToast(null), 2500);
    } catch (e) { setToast(extractError(e)); setTimeout(() => setToast(null), 2500); } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="section-heading" style={{ marginBottom: 16 }}><p className="eyebrow">Профиль</p><h2>Личные данные</h2></div>
      {toast && <div className="auth-error" style={{ marginBottom: 12, color: toast.includes("обновлен") ? "var(--green)" : undefined }}>{toast}</div>}
      <div className="profile-section">
        <div className="profile-field">
          <label>Email</label>
          {editing ? <input value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 14, width: "100%" }} /> : <span>{session.email || "—"}</span>}
        </div>
        <div className="profile-field">
          <label>Имя</label>
          {editing ? <input value={dispName} onChange={e => setDispName(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 14, width: "100%" }} /> : <span>{session.displayName || "—"}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {editing ? (
          <>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Отмена</button>
          </>
        ) : (
          <button className="btn-outline" onClick={() => setEditing(true)}><Settings2 size={16} />Редактировать</button>
        )}
        <button className="btn-danger" onClick={onLogout}><LogOut size={18} />Выйти</button>
      </div>
    </div>
  );
}

/* ── Business Shell ── */
function BusinessShell({ session, onLogout, showToast }: { session: any; onLogout: () => void; showToast: (m: string) => void }) {
  const [tab, setTab] = useState<BusinessTab>("activity");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const bizName = session.businessName || "Мой бизнес";
  const branchName = session.branchName || "Филиал";

  return (
    <div className="business-shell">
      <BusinessSidebar tab={tab} onTabChange={setTab} bizName={bizName} branchName={branchName} onLogout={onLogout} />
      <div className="business-content">
        <MobileBizHeader bizName={bizName} branchName={branchName} tab={tab} onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} onLogout={onLogout} />
        {mobileMenuOpen && <MobileBizMenu tab={tab} onTabChange={(t) => { setTab(t); setMobileMenuOpen(false); }} onLogout={onLogout} />}
        {showImport && <ImportPage showToast={showToast} session={session} onClose={() => setShowImport(false)} />}
        {!showImport && tab === "activity" && <ActivityPage session={session} showToast={showToast} />}
        {!showImport && tab === "products" && <ProductsPage showToast={showToast} session={session} onImport={() => setShowImport(true)} />}
        {!showImport && tab === "services" && <ServicesPage showToast={showToast} session={session} />}
        {!showImport && tab === "profile" && <BizProfilePage session={session} showToast={showToast} />}
      </div>
    </div>
  );
}

function BusinessSidebar({ tab, onTabChange, bizName, branchName, onLogout }: { tab: BusinessTab; onTabChange: (t: BusinessTab) => void; bizName: string; branchName: string; onLogout: () => void }) {
  const items: Array<{ id: BusinessTab; label: string; icon: typeof BarChart3 }> = [
    { id: "activity", label: "Активность", icon: BarChart3 },
    { id: "products", label: "Товары", icon: Package },
    { id: "services", label: "Услуги", icon: Scissors },
    { id: "profile", label: "Профиль", icon: Store },
  ];
  return (
    <aside className="business-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">A</div>
        <div>
          <div style={{ fontSize: 16, lineHeight: 1.2 }}>{bizName}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{branchName}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => onTabChange(item.id)}><Icon size={18} />{item.label}</button>; })}
      </nav>
      <div className="sidebar-footer">
        <button onClick={onLogout}><LogOut size={18} />Выйти</button>
      </div>
    </aside>
  );
}

function MobileBizHeader({ bizName, branchName, tab, onMenuToggle, onLogout }: { bizName: string; branchName: string; tab: BusinessTab; onMenuToggle: () => void; onLogout: () => void }) {
  const labels: Record<BusinessTab, string> = { activity: "Активность", products: "Товары", services: "Услуги", profile: "Профиль" };
  return (
    <header className="customer-topbar" style={{ display: "none" }}>
      <div>
        <span className="city-label">{bizName}</span>
        <span className="city-name">{labels[tab]}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-ghost" onClick={onMenuToggle} style={{ minHeight: 38 }}><Bell size={18} /></button>
        <button className="btn-ghost" onClick={onLogout} style={{ minHeight: 38 }}><LogOut size={18} /></button>
      </div>
    </header>
  );
}

function MobileBizMenu({ tab, onTabChange, onLogout }: { tab: BusinessTab; onTabChange: (t: BusinessTab) => void; onLogout: () => void }) { return null; }

/* ── Activity Page ── */
function ActivityPage({ session, showToast }: { session: any; showToast: (m: string) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<{ taskId: string; customerName: string } | null>(null);
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInp, setChatInp] = useState("");
  const [sending, setSending] = useState(false);

  const branchId = session.branchId;

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    getSupplierTasks(branchId).then(setTasks).catch(() => {}).finally(() => setLoading(false));
  }, [branchId]);

  async function openChat(task: any) {
    setChat({ taskId: task.id, customerName: task.query });
    setChatMsgs([]);
    setChatLoading(true);
    try {
      const detail = await getSupplierTaskDetail(branchId, task.id);
      setChatMsgs(detail.messages || []);
    } catch {} finally { setChatLoading(false); }
  }

  async function sendMsg() {
    if (!chatInp.trim() || !chat) return;
    setSending(true);
    try {
      const detail = await respondToTask(branchId, chat.taskId, { status: "HAS_ITEM", comment: chatInp.trim() });
      setChatMsgs(detail.messages || []);
      showToast("Ответ отправлен");
      const updated = await getSupplierTasks(branchId);
      setTasks(updated);
    } catch (e) { showToast(extractError(e)); } finally { setSending(false); setChatInp(""); }
  }

  if (!branchId) {
    return (
      <div>
        <div className="manage-header"><h2>Активность</h2></div>
        <div className="empty-state"><p>Не найден филиал.</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="manage-header"><h2>Активность</h2><span style={{ color: "var(--muted)", fontSize: 14 }}>{tasks.length} запроса</span></div>
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table className="activity-table">
            <thead><tr><th>Тип</th><th>Запрос</th><th>Город</th><th>Категория</th><th>Возраст</th><th>Точность</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {tasks.map((t: any) => (
                <tr key={t.id}>
                  <td><span className="kind-pill">Запрос</span></td>
                  <td><strong>{t.query}</strong></td>
                  <td>{t.customerArea}</td>
                  <td>{t.category || "—"}</td>
                  <td>{t.ageLabel}</td>
                  <td><span className={`conf-badge conf-${t.confidenceLabel}`}>{t.confidenceLabel === "high" ? "Высокая" : "Средняя"}</span></td>
                  <td><span className={`activity-status ${t.status === "new" ? "activity-discussing" : t.status === "needs_reply" ? "activity-discussing" : "activity-confirmed"}`}>{t.status === "new" ? "Новый" : t.status === "needs_reply" ? "Требует ответа" : "Отвечен"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-outline" style={{ minHeight: 30, fontSize: 12 }} onClick={() => openChat(t)}><MessageCircle size={14} />Ответить</button>
                    </div>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Нет активных запросов</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {chat && (
        <div className="modal-overlay" onClick={() => setChat(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2>Чат по запросу</h2>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{chat.customerName}</span>
              </div>
              <button className="btn-ghost" onClick={() => setChat(null)}><X size={18} /></button>
            </div>
            {chatLoading && <div className="empty-state"><RefreshCw size={20} className="spin" /><p>Загрузка сообщений...</p></div>}
            {!chatLoading && (
              <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {chatMsgs.map((m: any) => (
                  <div key={m.id} className={`chat-msg ${m.role}`}>
                    <div>{m.text}</div>
                    {m.price && <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{Number(m.price).toLocaleString("ru-RU")} ₸</div>}
                  </div>
                ))}
                {chatMsgs.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: 16 }}>Нет сообщений</p>}
              </div>
            )}
            <div className="chat-input-row" style={{ padding: 0 }}>
              <input value={chatInp} onChange={e => setChatInp(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !sending) sendMsg(); }} placeholder="Напишите ответ..." disabled={sending} />
              <button className="btn-primary" onClick={sendMsg} disabled={sending || !chatInp.trim()} style={{ borderRadius: 999, width: 42, padding: 0 }}><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Products Page ── */
function ProductsPage({ showToast, session, onImport }: { showToast: (m: string) => void; session: any; onImport?: () => void }) {
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const branchId = session.branchId;

  useEffect(() => {
    listCategories().then(cats => {
      const flat: Array<{ id: string; name: string }> = [];
      function walk(list: Array<{ id: string; name: string; children?: Array<{ id: string; name: string }> }>) {
        for (const c of list) {
          flat.push({ id: c.id, name: c.name });
          if (c.children) walk(c.children);
        }
      }
      walk(cats);
      setCategories(flat);
    }).catch(() => {});
  }, []);

  function load() {
    if (!branchId) return;
    setLoading(true);
    listProducts(branchId).then(res => {
      setProducts(res.items.map(p => ({
        id: p.productId, productOfferId: p.productOfferId, name: p.name, category: p.categoryId,
        sku: p.sku || "", price: p.price ? `${Number(p.price).toLocaleString("ru-RU")} ₸` : "—",
        enabled: p.enabled, source: "ADMIN",
      })));
    }).catch(() => showToast(extractError(new Error("Ошибка загрузки товаров")))).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [branchId]);

  async function toggle(id: string, offerId: string, enabled: boolean) {
    try {
      await updateProduct(branchId, id, { enabled: !enabled });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, enabled: !enabled } : p));
      showToast("Статус товара обновлен");
    } catch (e) { showToast(extractError(e)); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduct(branchId, id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast("Товар удален");
    } catch (e) { showToast(extractError(e)); }
  }

  function openEdit(p: BusinessProduct) {
    setEditId(p.id);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormPrice(p.price === "—" ? "" : p.price.replace(/[^0-9]/g, ""));
    setFormCategoryId(p.category);
    setFormEnabled(p.enabled);
  }

  function openAdd() {
    setShowAdd(true); setEditId(null);
    setFormName(""); setFormSku(""); setFormPrice(""); setFormCategoryId(""); setFormEnabled(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const priceNum = formPrice ? Number(formPrice) : undefined;
      const catId = formCategoryId || undefined;
      if (editId) {
        await updateProduct(branchId, editId, { name: formName.trim(), sku: formSku || undefined, price: priceNum, categoryId: catId, enabled: formEnabled });
      } else {
        await createProduct(branchId, { name: formName.trim(), sku: formSku || undefined, price: priceNum, categoryId: catId || "", enabled: formEnabled });
      }
      setShowAdd(false); setEditId(null);
      load();
      showToast(editId ? "Товар обновлен" : "Товар создан");
    } catch (e) { showToast(extractError(e)); } finally { setSaving(false); }
  }

  if (!branchId) {
    return <div><div className="manage-header"><h2>Товары</h2></div><div className="empty-state"><p>Не найден филиал.</p></div></div>;
  }

  return (
    <div>
      <div className="manage-header"><h2>Товары</h2><div style={{ display: "flex", gap: 8 }}><button className="btn-outline" onClick={onImport}><FileSpreadsheet size={16} />Excel импорт</button><button className="btn-primary" onClick={openAdd}><Plus size={16} />Добавить товар</button></div></div>
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table className="manage-table">
            <thead><tr><th>Название</th><th>Категория</th><th>SKU</th><th>Цена</th><th>Источник</th><th>Активен</th><th>Действия</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ opacity: p.enabled ? 1 : 0.5 }}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.category}</td>
                  <td><code style={{ fontSize: 12, background: "var(--soft)", padding: "2px 6px", borderRadius: 4 }}>{p.sku || "—"}</code></td>
                  <td><strong>{p.price}</strong></td>
                  <td><span style={{ fontSize: 12, color: "var(--muted)" }}>{p.source === "ADMIN" ? "Вручную" : "Импорт"}</span></td>
                  <td><button className={`toggle-switch ${p.enabled ? "toggle-on" : "toggle-off"}`} onClick={() => toggle(p.id, p.productOfferId, p.enabled)} aria-label={p.enabled ? "Отключить" : "Включить"} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-ghost" style={{ minHeight: 30, fontSize: 12 }} onClick={() => openEdit(p)}>Ред.</button>
                      <button className="btn-ghost" style={{ minHeight: 30, fontSize: 12, color: "var(--red)" }} onClick={() => handleDelete(p.id)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Нет товаров</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editId) && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setEditId(null); }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2>{editId ? "Редактировать товар" : "Добавить товар"}</h2>
            <label>Название<input value={formName} onChange={e => setFormName(e.target.value)} /></label>
            <label>Категория
              <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
                <option value="">Все</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>SKU (артикул)<input value={formSku} onChange={e => setFormSku(e.target.value)} /></label>
            <label>Цена<input value={formPrice} onChange={e => setFormPrice(e.target.value)} type="number" /></label>
            <label>Активен
              <select value={formEnabled ? "true" : "false"} onChange={e => setFormEnabled(e.target.value === "true")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditId(null); }}>Отмена</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Services Page ── */
function ServicesPage({ showToast, session }: { showToast: (m: string) => void; session: any }) {
  const [services, setServices] = useState<BusinessService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const branchId = session.branchId;

  useEffect(() => {
    listCategories().then(cats => {
      const flat: Array<{ id: string; name: string }> = [];
      function walk(list: Array<{ id: string; name: string; children?: Array<{ id: string; name: string }> }>) {
        for (const c of list) {
          flat.push({ id: c.id, name: c.name });
          if (c.children) walk(c.children);
        }
      }
      walk(cats);
      setCategories(flat);
    }).catch(() => {});
  }, []);

  function load() {
    if (!branchId) return;
    setLoading(true);
    listServices(branchId).then(res => {
      setServices(res.items.map(s => ({
        id: s.serviceOfferingId, serviceBranchOfferId: s.serviceBranchOfferId,
        name: s.name, category: s.categoryId, price: s.basePrice ? `от ${Number(s.basePrice).toLocaleString("ru-RU")} ₸` : "Цена не указана",
        duration: s.durationMinutes ? `${s.durationMinutes} мин` : "", active: s.active,
        schedule: s.scheduleText || "",
      })));
    }).catch(() => showToast("Ошибка загрузки услуг")).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [branchId]);

  async function toggle(id: string, active: boolean) {
    try {
      await updateService(branchId, id, { active: !active });
      setServices(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s));
      showToast("Статус услуги обновлен");
    } catch (e) { showToast(extractError(e)); }
  }

  function openAdd() {
    setShowAdd(true); setEditId(null);
    setFormName(""); setFormPrice(""); setFormDuration(""); setFormSchedule(""); setFormCategoryId(""); setFormActive(true);
  }

  function openEdit(s: BusinessService) {
    setEditId(s.id); setShowAdd(true);
    setFormName(s.name);
    setFormPrice(s.price === "Цена не указана" ? "" : s.price.replace(/[^0-9]/g, ""));
    setFormDuration(s.duration.replace(/[^0-9]/g, ""));
    setFormSchedule(s.schedule);
    setFormCategoryId(s.category);
    setFormActive(s.active);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const priceNum = formPrice ? Number(formPrice) : undefined;
      const durNum = formDuration ? Number(formDuration) : undefined;
      const catId = formCategoryId || undefined;
      if (editId) {
        await updateService(branchId, editId, { name: formName.trim(), basePrice: priceNum, durationMinutes: durNum, scheduleText: formSchedule || undefined, active: formActive, categoryId: catId });
      } else {
        await createService(branchId, { name: formName.trim(), basePrice: priceNum, durationMinutes: durNum, scheduleText: formSchedule || undefined, active: formActive, categoryId: catId || "" });
      }
      setShowAdd(false); setEditId(null);
      load();
      showToast(editId ? "Услуга обновлена" : "Услуга создана");
    } catch (e) { showToast(extractError(e)); } finally { setSaving(false); }
  }

  if (!branchId) {
    return <div><div className="manage-header"><h2>Услуги</h2></div><div className="empty-state"><p>Не найден филиал.</p></div></div>;
  }

  return (
    <div>
      <div className="manage-header"><h2>Услуги</h2><button className="btn-primary" onClick={openAdd}><Plus size={16} />Добавить услугу</button></div>
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div className="service-list">
          {services.map(s => (
            <div className="service-row" key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
              <Settings2 size={18} color="var(--muted)" />
              <div><strong>{s.name}</strong><span>{s.category} · {s.schedule || "—"}</span></div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{s.duration}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{s.price}</span>
                <button className={`toggle-switch ${s.active ? "toggle-on" : "toggle-off"}`} onClick={() => toggle(s.id, s.active)} aria-label={s.active ? "Деактивировать" : "Активировать"} />
                <button className="btn-ghost" style={{ minHeight: 30, fontSize: 12 }} onClick={() => openEdit(s)}>Ред.</button>
              </div>
            </div>
          ))}
          {services.length === 0 && <div className="empty-state"><p>Нет услуг</p></div>}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setEditId(null); }}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2>{editId ? "Редактировать услугу" : "Добавить услугу"}</h2>
            <label>Название<input value={formName} onChange={e => setFormName(e.target.value)} /></label>
            <label>Категория
              <select value={formCategoryId} onChange={e => setFormCategoryId(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
                <option value="">Все</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Цена (от)<input value={formPrice} onChange={e => setFormPrice(e.target.value)} type="number" /></label>
            <label>Длительность (мин)<input value={formDuration} onChange={e => setFormDuration(e.target.value)} type="number" /></label>
            <label>График / условия<input value={formSchedule} onChange={e => setFormSchedule(e.target.value)} /></label>
            <label>Активна
              <select value={formActive ? "true" : "false"} onChange={e => setFormActive(e.target.value === "true")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { setShowAdd(false); setEditId(null); }}>Отмена</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Business Profile Page ── */
function BizProfilePage({ session, showToast }: { session: any; showToast: (m: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [bizName, setBizName] = useState(session.businessName || "");
  const [email, setEmail] = useState(session.email || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [branches, setBranches] = useState<Array<{ id: string; name: string; address: string; cityName: string; onlineOnly: boolean }>>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchCityId, setNewBranchCityId] = useState("");
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [addingBranch, setAddingBranch] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const businessId = session.businessId;

  useEffect(() => {
    if (!businessId) return;
    setBranchesLoading(true);
    Promise.all([listBranches(businessId), listCities()])
      .then(([brs, cts]) => { setBranches(brs); setCities(cts); })
      .catch(() => {})
      .finally(() => setBranchesLoading(false));
  }, [businessId]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const s = await updateProfile({ displayName: bizName.trim() || undefined, email: email.trim() || undefined });
      session.businessName = bizName;
      session.email = s.user?.email || email;
      setEditing(false);
      setToast("Профиль обновлен");
      setTimeout(() => setToast(null), 2500);
    } catch (e) { setToast(extractError(e)); setTimeout(() => setToast(null), 2500); } finally { setSaving(false); }
  }

  async function handleAddBranch() {
    if (!newBranchName.trim()) return;
    setAddingBranch(true);
    try {
      const b = await createBranch(businessId, {
        name: newBranchName.trim(),
        address: newBranchAddress.trim() || undefined,
        cityId: newBranchCityId || undefined,
        onlineOnly: false,
      });
      setBranches(prev => [...prev, { id: b.id, name: b.name, address: newBranchAddress, cityName: cities.find(c => c.id === newBranchCityId)?.name || "", onlineOnly: false }]);
      setShowAddBranch(false);
      setNewBranchName(""); setNewBranchAddress(""); setNewBranchCityId("");
      setToast("Филиал создан");
      setTimeout(() => setToast(null), 2500);
    } catch (e) { setToast(extractError(e)); setTimeout(() => setToast(null), 2500); } finally { setAddingBranch(false); }
  }

  return (
    <div>
      <div className="manage-header"><h2>Профиль бизнеса</h2></div>
      {toast && <div className="auth-error" style={{ marginBottom: 12, color: toast.includes("обновлен") || toast.includes("создан") ? "var(--green)" : undefined }}>{toast}</div>}
      <div className="profile-section">
        <div className="profile-field">
          <label>Название</label>
          {editing ? <input value={bizName} onChange={e => setBizName(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 14, width: "100%" }} /> : <span>{session.businessName || "—"}</span>}
        </div>
        <div className="profile-field"><label>Филиал по умолчанию</label><span>{session.branchName || "—"}</span></div>
        <div className="profile-field">
          <label>Email</label>
          {editing ? <input value={email} onChange={e => setEmail(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 14, width: "100%" }} /> : <span>{session.email || "—"}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {editing ? (
          <>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Отмена</button>
          </>
        ) : (
          <button className="btn-outline" onClick={() => setEditing(true)}><Settings2 size={16} />Редактировать</button>
        )}
      </div>

      {selectedBranchId ? (
        <div>
          <button className="btn-ghost" onClick={() => setSelectedBranchId(null)} style={{ marginBottom: 12 }}><ChevronLeft size={16} />Назад к филиалам</button>
          <StaffPage showToast={showToast} session={session} branchIdOverride={selectedBranchId} />
        </div>
      ) : (
        <>
          <div className="manage-header" style={{ marginTop: 24 }}><h2>Филиалы</h2><button className="btn-primary" onClick={() => setShowAddBranch(true)}><Plus size={16} />Добавить филиал</button></div>
          {branchesLoading && <div className="empty-state"><RefreshCw size={20} className="spin" /><p>Загрузка...</p></div>}
          {!branchesLoading && (
            <div className="service-list" style={{ marginTop: 8 }}>
              {branches.map(b => (
                <div className="service-row" key={b.id} onClick={() => setSelectedBranchId(b.id)} style={{ cursor: "pointer" }}>
                  <Store size={18} color="var(--muted)" />
                  <div><strong>{b.name}</strong><span>{b.cityName}{b.address ? ` · ${b.address}` : ""}{b.onlineOnly ? " · Онлайн" : ""}</span></div>
                  <Users size={16} color="var(--primary)" />
                </div>
              ))}
              {branches.length === 0 && <div className="empty-state"><p>Нет филиалов</p></div>}
            </div>
          )}
        </>
      )}

      {showAddBranch && (
        <div className="modal-overlay" onClick={() => setShowAddBranch(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2>Добавить филиал</h2>
            <label>Название<input value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="ул. Абая, 1" /></label>
            <label>Адрес<input value={newBranchAddress} onChange={e => setNewBranchAddress(e.target.value)} /></label>
            <label>Город
              <select value={newBranchCityId} onChange={e => setNewBranchCityId(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
                <option value="">Выберите город</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowAddBranch(false)}>Отмена</button>
              <button className="btn-primary" onClick={handleAddBranch} disabled={addingBranch}>{addingBranch ? "Создание..." : "Создать"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Staff Page ── */
function StaffPage({ showToast, session, branchIdOverride }: { showToast: (m: string) => void; session: any; branchIdOverride?: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const businessId = session.businessId;
  const branchId = branchIdOverride || session.branchId;

  function load() {
    if (!businessId || !branchId) return;
    setLoading(true);
    listStaff(businessId, branchId).then(data => {
      setStaff(data.map(s => ({
        id: s.id, name: s.displayName, email: s.email,
        status: s.status as StaffStatus, tempPassword: s.tempPassword || "",
        activatedAt: s.activatedAt ? new Date(s.activatedAt).toLocaleString("ru-RU") : "",
      })));
    }).catch(() => showToast("Ошибка загрузки сотрудников")).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [businessId, branchId]);

  async function addStaff() {
    if (!newName.trim() || !newEmail.trim()) return;
    setSaving(true);
    try {
      const s = await createStaff(businessId, branchId, { email: newEmail.trim(), displayName: newName.trim() });
      setStaff(prev => [{
        id: s.id, name: s.displayName, email: s.email,
        status: s.status as StaffStatus, tempPassword: s.tempPassword || "",
        activatedAt: "",
      }, ...prev]);
      setNewName(""); setNewEmail(""); setShowAdd(false);
      showToast("Сотрудник создан");
    } catch (e) { showToast(extractError(e)); } finally { setSaving(false); }
  }

  async function toggleDisable(s: StaffMember) {
    try {
      const newStatus = s.status === "DISABLED" ? "ACTIVE" : "DISABLED";
      await updateStaff(businessId, branchId, s.id, { status: newStatus });
      setStaff(prev => prev.map(m => m.id === s.id ? { ...m, status: newStatus as StaffStatus } : m));
      showToast("Статус обновлен");
    } catch (e) { showToast(extractError(e)); }
  }

  async function resetPassword(id: string) {
    try {
      const s = await resetStaffPassword(businessId, branchId, id);
      setStaff(prev => prev.map(m => m.id === id ? { ...m, status: s.status as StaffStatus, tempPassword: s.tempPassword || "" } : m));
      showToast("Пароль сброшен");
    } catch (e) { showToast(extractError(e)); }
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); showToast("Скопировано"); }

  if (!businessId || !branchId) {
    return <div><div className="manage-header"><h2>Сотрудники</h2></div><div className="empty-state"><p>Не найден бизнес или филиал.</p></div></div>;
  }

  return (
    <div>
      <div className="manage-header"><h2>Сотрудники</h2><button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} />Добавить</button></div>
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div style={{ display: "grid", gap: 10 }}>
          {staff.map(s => (
            <div className="staff-card" key={s.id}>
              <div className="staff-card-head">
                <h3>{s.name}</h3>
                <span className={`staff-status ${staffStatusClass[s.status]}`}>{staffStatusRu[s.status]}</span>
              </div>
              <div className="staff-detail">
                <span>{s.email}</span>
                {s.activatedAt && <span>Активирован: {s.activatedAt}</span>}
              </div>
              {s.tempPassword && (
                <div className="temp-password-box">
                  <span>{s.tempPassword}</span>
                  <button className="btn-ghost" style={{ minHeight: 30, fontSize: 12 }} onClick={() => copyToClipboard(s.tempPassword)}><Copy size={14} />Копировать</button>
                </div>
              )}
              <div className="staff-actions">
                {s.status === "PENDING_ACTIVATION" && <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => copyToClipboard(`Логин: ${s.email}\nПароль: ${s.tempPassword}`)}><Copy size={14} />Копировать данные</button>}
                {s.status === "ACTIVE" && <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => resetPassword(s.id)}>Сбросить пароль</button>}
                {s.status === "PASSWORD_RESET_REQUIRED" && <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => resetPassword(s.id)}>Сбросить пароль</button>}
                {s.status !== "PENDING_ACTIVATION" && <button className="btn-outline" style={{ fontSize: 12, color: s.status === "DISABLED" ? "var(--green)" : "var(--red)" }} onClick={() => toggleDisable(s)}>{s.status === "DISABLED" ? "Разблокировать" : "Заблокировать"}</button>}
              </div>
            </div>
          ))}
          {staff.length === 0 && <div className="empty-state"><p>Нет сотрудников</p></div>}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2>Добавить сотрудника</h2>
            <label>Имя<input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Имя сотрудника" /></label>
            <label>Email<input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email" type="email" /></label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Отмена</button>
              <button className="btn-primary" onClick={addStaff} disabled={saving}>{saving ? "Создание..." : "Создать"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Import types & helpers ── */
interface ImportColumn { sourceColumn: string; suggestedTargetField: string; confidence: number; }
interface UploadResponse { importId: string; originalFileName: string; status: string; totalRows: number; columns: ImportColumn[]; sampleRows: Record<string, string>[]; }
interface ColumnMappingInfo { sourceColumn: string; targetField: string; characteristicName: string | null; approved: boolean; confidence: number; }
interface RowPreviewData { rowId: string; rowNumber: number; status: string; normalizedData: Record<string, string>; errors: string[]; warnings: string[]; }
interface PreviewResponseData { importId: string; status: string; totalRows: number; validRows: number; invalidRows: number; warningRows: number; mappings: ColumnMappingInfo[]; rows: RowPreviewData[]; }
interface ApproveResponseData { importId: string; status: string; productsCreated: number; offersCreated: number; rowsSkipped: number; }

const targetFieldLabels: Record<string, string> = {
  NAME: "Название", CATEGORY_LABEL: "Категория", DESCRIPTION: "Описание",
  SKU: "Артикул", PRICE: "Цена", TAGS: "Теги", IGNORE: "Пропустить",
  APPEND_TO_DESCRIPTION: "Добавить к описанию", CHARACTERISTIC: "Характеристика",
};

/* ── Import Page ── */
function ImportPage({ showToast, session, onClose }: { showToast: (m: string) => void; session: any; onClose?: () => void }) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadRes, setUploadRes] = useState<UploadResponse | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewRes, setPreviewRes] = useState<PreviewResponseData | null>(null);
  const [approveRes, setApproveRes] = useState<ApproveResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchId = session.branchId;
  const authHeaders = { Authorization: `Bearer ${session.token}` };

  function openFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.onchange = (ev) => handleFile(ev as any);
    input.click();
  }

  const steps: Array<{ id: ImportStep; label: string }> = [
    { id: "upload", label: "Загрузка" }, { id: "mapping", label: "Сопоставление" },
    { id: "preview", label: "Предпросмотр" }, { id: "approved", label: "Готово" },
  ];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx")) { showToast("Только .xlsx файлы"); return; }
    setFile(f); setError(null); setLoading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports`, { method: "POST", headers: authHeaders, body: fd });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new ApiError(res.status, t || `Ошибка ${res.status}`); }
      const data: UploadResponse = await res.json();
      setUploadRes(data);
      const initial: Record<string, string> = {};
      for (const col of data.columns) initial[col.sourceColumn] = col.suggestedTargetField || "IGNORE";
      setMappings(initial);
      setStep("mapping");
      showToast(`Файл загружен. ${data.totalRows} строк, ${data.columns.length} колонок.`);
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleMapping() {
    setError(null); setLoading(true);
    try {
      const entries = Object.entries(mappings).map(([sourceColumn, targetField]) => ({
        sourceColumn, targetField, characteristicName: targetField === "CHARACTERISTIC" ? sourceColumn : undefined,
      }));
      const res = await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports/${uploadRes!.importId}/mapping`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ mappings: entries }),
      });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new ApiError(res.status, t || `Ошибка ${res.status}`); }
      const data: PreviewResponseData = await res.json();
      setPreviewRes(data);
      setStep("preview");
      showToast(`Предпросмотр: ${data.validRows} ок, ${data.invalidRows} ошибок, ${data.warningRows} предупреждений`);
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleApprove() {
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports/${uploadRes!.importId}/approve`, { method: "POST", headers: authHeaders });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new ApiError(res.status, t || `Ошибка ${res.status}`); }
      const data: ApproveResponseData = await res.json();
      setApproveRes(data);
      setStep("approved");
      showToast(`Импорт завершен! ${data.productsCreated} товаров создано.`);
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleCancel() {
    setError(null); setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports/${uploadRes!.importId}/cancel`, { method: "POST", headers: authHeaders });
      resetImport(); showToast("Импорт отменен");
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  function resetImport() {
    setStep("upload"); setFile(null); setUploadRes(null); setMappings({}); setPreviewRes(null); setApproveRes(null); setError(null);
  }

  if (!branchId) {
    return (
      <div>
        <div className="manage-header"><h2>Excel импорт</h2></div>
        <div className="empty-state"><FileSpreadsheet size={32} /><p>Не найден филиал. Убедитесь, что ваш бизнес-аккаунт привязан к филиалу.</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="manage-header"><h2>Excel импорт</h2>{onClose && <button className="btn-ghost" onClick={onClose}><ChevronLeft size={16} />Назад к товарам</button>}</div>
      <div className="import-steps">
        {steps.map((s, i) => (
          <div key={s.id} className={`import-step ${step === s.id ? "active" : ""} ${steps.findIndex(s => s.id === step) > i ? "done" : ""}`}>
            {steps.findIndex(s => s.id === step) > i ? <Check size={14} style={{ display: "inline", marginRight: 4 }} /> : null}{s.label}
          </div>
        ))}
      </div>

      {error && <div className="auth-error" style={{ margin: "12px 0" }}>{error}<button className="btn-ghost" style={{ marginLeft: 8, fontSize: 12 }} onClick={() => setError(null)}><X size={14} /></button></div>}

      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Обработка...</p></div>}

      {!loading && step === "upload" && (
        <div>
          <div className="import-dropzone" onClick={openFilePicker} style={{ cursor: "pointer" }}>
            <Upload size={32} /><p style={{ marginTop: 8 }}>Нажмите для выбора Excel файла</p>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>.xlsx до 10MB</span>
          </div>
        </div>
      )}

      {!loading && step === "mapping" && uploadRes && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Файл: </span><strong>{uploadRes.originalFileName}</strong></div>
            <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Строк: </span><strong>{uploadRes.totalRows}</strong></div>
          </div>
          <p style={{ margin: "0 0 12px", color: "#40505c" }}>Сопоставьте колонки из файла с полями товара. Автоматически предложено на основе заголовков.</p>
          <div className="profile-section">
            {uploadRes.columns.map(col => (
              <div className="profile-field" key={col.sourceColumn} style={{ alignItems: "center" }}>
                <label style={{ minWidth: 160 }}>{col.sourceColumn} {col.confidence > 0.7 && <span style={{ fontSize: 11, color: "var(--green)" }}>({(col.confidence * 100).toFixed(0)}%)</span>}</label>
                <select value={mappings[col.sourceColumn] || "IGNORE"} onChange={e => setMappings(prev => ({ ...prev, [col.sourceColumn]: e.target.value }))} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14 }}>
                  {Object.entries(targetFieldLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>
          {uploadRes.sampleRows.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", color: "var(--primary)", fontSize: 13 }}>Пример данных (первые 3 строки)</summary>
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table className="manage-table">
                  <thead><tr>{Object.keys(uploadRes.sampleRows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>{uploadRes.sampleRows.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </details>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn-ghost" onClick={handleCancel} disabled={loading}>Отменить</button>
            <button className="btn-primary" onClick={handleMapping} disabled={loading}>Далее <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {!loading && step === "preview" && previewRes && (
        <div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Всего: </span><strong>{previewRes.totalRows}</strong></div>
            <div><span style={{ color: "var(--muted)", fontSize: 13 }}>OK: </span><strong style={{ color: "var(--green)" }}>{previewRes.validRows}</strong></div>
            <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Ошибки: </span><strong style={{ color: "var(--red)" }}>{previewRes.invalidRows}</strong></div>
            {previewRes.warningRows > 0 && <div><span style={{ color: "var(--muted)", fontSize: 13 }}>Предупреждения: </span><strong style={{ color: "#e67e22" }}>{previewRes.warningRows}</strong></div>}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="manage-table">
              <thead>
                <tr>
                  <th>#</th>
                  {previewRes.mappings.filter(m => m.targetField !== "IGNORE").map(m => <th key={m.sourceColumn}>{targetFieldLabels[m.targetField] || m.targetField}</th>)}
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {previewRes.rows.map(row => {
                  const rowStatus = row.status === "VALID" ? "conf-high" : row.status === "WARNING" ? "conf-medium" : "conf-low";
                  const rowLabel = row.status === "VALID" ? "OK" : row.status === "WARNING" ? "Предупреждение" : "Ошибка";
                  return (
                    <tr key={row.rowId}>
                      <td>{row.rowNumber}</td>
                      {previewRes!.mappings.filter(m => m.targetField !== "IGNORE").map(m => <td key={m.sourceColumn}>{row.normalizedData[m.targetField] || "—"}</td>)}
                      <td>
                        <span className={`conf-badge ${rowStatus}`}>{rowLabel}</span>
                        {row.errors.length > 0 && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 2 }}>{row.errors.join("; ")}</div>}
                        {row.warnings.length > 0 && <div style={{ fontSize: 11, color: "#e67e22", marginTop: 2 }}>{row.warnings.join("; ")}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn-ghost" onClick={handleCancel} disabled={loading}>Отменить</button>
            <button className="btn-ghost" onClick={() => setStep("mapping")} disabled={loading}>Назад к сопоставлению</button>
            <button className="btn-primary" onClick={handleApprove} disabled={loading || previewRes.validRows === 0}><Check size={16} />Подтвердить импорт</button>
          </div>
        </div>
      )}

      {!loading && step === "approved" && approveRes && (
        <div className="empty-state">
          <Check size={32} color="var(--green)" />
          <p>Импорт успешно завершен.</p>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 14 }}>
            <span>Товаров создано: <strong>{approveRes.productsCreated}</strong></span>
            <span>Предложений: <strong>{approveRes.offersCreated}</strong></span>
            {approveRes.rowsSkipped > 0 && <span>Пропущено: <strong>{approveRes.rowsSkipped}</strong></span>}
          </div>
          <button className="btn-primary" onClick={resetImport} style={{ marginTop: 16 }}>Новый импорт</button>
        </div>
      )}
    </div>
  );
}
