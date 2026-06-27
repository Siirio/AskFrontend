import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Search, History, UserRound, ShoppingBag, Building2, LogOut, Phone, MapPin,
  MessageCircle, Send, ShieldCheck, Clock, FileSpreadsheet, Plus, Settings2,
  Inbox, Bell, Copy, Check, X, Upload, ArrowRight, ChevronLeft, ChevronDown,
  Package, Scissors, Users, Store, BarChart3, Home, Star, RefreshCw
} from "lucide-react";
import { loginWithPassword, logout as clearSession, registerBusiness, registerCustomer, updateProfile, verifyCode } from "../shared/api/authClient";
import type { AuthChallenge } from "../shared/api/authClient";
import { ApiError, API_BASE_URL, transformKeys, camelToSnakeKeys } from "../shared/api/httpClient";
import { getUserFriendlyError } from "../shared/lib/errorUtils";
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
type ImportStep = "upload" | "mapping" | "preview";

type UserRole = "customer" | "business";
type AuthMode = "login" | "register";

interface BusinessProduct {
  id: string; productOfferId: string; name: string; categoryId: string; category: string; sku: string; price: string; enabled: boolean; source: string;
}

interface BusinessService {
  id: string; serviceBranchOfferId: string; name: string; categoryId: string; category: string; price: string; duration: string; active: boolean; schedule: string;
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

const initialSuppliers: SupplierCheck[] = [];

const initialMessages: ChatMessage[] = [];

const initialChatThreads: ChatThread[] = [];

function extractError(error: unknown): string {
  return getUserFriendlyError(error);
}

type FilterKind = "text" | "number" | "date" | "boolean";
type FilterMode = "contains" | "eq" | "lt" | "gt";
type DashboardFilter = { field: string; mode: FilterMode; value: string };
type DashboardColumn<T> = { field: keyof T & string; label: string; kind: FilterKind; value: (row: T) => unknown };

function DashboardFilters<T>({ columns, filters, onChange }: { columns: DashboardColumn<T>[]; filters: DashboardFilter[]; onChange: (filters: DashboardFilter[]) => void }) {
  function setFilter(index: number, patch: Partial<DashboardFilter>) {
    onChange(filters.map((f, i) => i === index ? { ...f, ...patch } : f));
  }
  function addFilter() {
    const column = columns[0];
    onChange([...filters, { field: column.field, mode: defaultFilterMode(column.kind), value: "" }]);
  }
  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }
  return (
    <div className="dashboard-filters">
      {filters.map((filter, index) => {
        const column = columns.find(c => c.field === filter.field) || columns[0];
        return (
          <div className="dashboard-filter-row" key={`${filter.field}-${index}`}>
            <select value={filter.field} onChange={e => {
              const nextColumn = columns.find(c => c.field === e.target.value) || columns[0];
              setFilter(index, { field: nextColumn.field, mode: defaultFilterMode(nextColumn.kind), value: "" });
            }}>
              {columns.map(c => <option key={c.field} value={c.field}>{c.label}</option>)}
            </select>
            <select value={filter.mode} onChange={e => setFilter(index, { mode: e.target.value as FilterMode })}>
              {filterModes(column.kind).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {column.kind === "boolean" ? (
              <select value={filter.value} onChange={e => setFilter(index, { value: e.target.value })}>
                <option value="">Любое</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            ) : (
              <input type={column.kind === "date" ? "date" : column.kind === "number" ? "number" : "text"} value={filter.value} onChange={e => setFilter(index, { value: e.target.value })} />
            )}
            <button className="btn-ghost" onClick={() => removeFilter(index)}><X size={14} /></button>
          </div>
        );
      })}
      <button className="btn-outline" onClick={addFilter}><Plus size={16} />Фильтр</button>
    </div>
  );
}

function defaultFilterMode(kind: FilterKind): FilterMode {
  if (kind === "number" || kind === "date") return "eq";
  return "contains";
}

function filterModes(kind: FilterKind): Array<{ value: FilterMode; label: string }> {
  if (kind === "number") return [{ value: "eq", label: "равно" }, { value: "lt", label: "меньше" }, { value: "gt", label: "больше" }];
  if (kind === "date") return [{ value: "eq", label: "в день" }, { value: "lt", label: "раньше" }, { value: "gt", label: "позже" }];
  if (kind === "boolean") return [{ value: "eq", label: "равно" }];
  return [{ value: "contains", label: "содержит" }];
}

function applyDashboardFilters<T>(rows: T[], columns: DashboardColumn<T>[], filters: DashboardFilter[]): T[] {
  return rows.filter(row => filters.every(filter => {
    if (!filter.value) return true;
    const column = columns.find(c => c.field === filter.field);
    if (!column) return true;
    return matchesFilter(column.value(row), filter.value, filter.mode, column.kind);
  }));
}

function matchesFilter(raw: unknown, expected: string, mode: FilterMode, kind: FilterKind): boolean {
  if (kind === "number") {
    const left = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
    const right = Number(expected);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    if (mode === "lt") return left < right;
    if (mode === "gt") return left > right;
    return left === right;
  }
  if (kind === "date") {
    const left = new Date(String(raw ?? "")).getTime();
    const right = new Date(expected).getTime();
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    if (mode === "lt") return left < right;
    if (mode === "gt") return left > right;
    return new Date(left).toDateString() === new Date(right).toDateString();
  }
  if (kind === "boolean") return String(Boolean(raw)) === expected;
  return String(raw ?? "").toLowerCase().includes(expected.toLowerCase());
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
      if ((selectedRole === "business") !== isBiz) {
        setError(selectedRole === "business" ? "Такого продавца не существует" : "Такого пользователя не существует");
        setLoading(false);
        return;
      }
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
    } catch (err) { setError(getUserFriendlyError(err, "auth")); } finally { setLoading(false); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const ch = selectedRole === "customer"
        ? await registerCustomer(displayName, email, password)
        : await registerBusiness({ email, password, businessName, branchName, branchCityId: branchCityId, branchAddress: branchName });
      setChallenge(ch);
    } catch (err) { setError(getUserFriendlyError(err, "auth")); } finally { setLoading(false); }
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
    } catch (err) { setError(getUserFriendlyError(err, "verify")); } finally { setLoading(false); }
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
  const [query, setQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [scope, setScope] = useState<"all" | "product" | "service">("all");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openCategoryScope, setOpenCategoryScope] = useState<"product" | "service" | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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

  async function doSearch() {
    setLoading(true);
    setSearched(true);
    try { const r = await searchAsk(query, scope, selectedCategory); setResults(r); setResultTab("found"); } catch { setResults([]); } finally { setLoading(false); }
  }

  function selectScope(nextScope: "all" | "product" | "service") {
    setScope(nextScope);
    setSelectedCategory("");
    setOpenCategoryScope(null);
  }

  function toggleCategory(nextScope: "product" | "service") {
    setScope(nextScope);
    setOpenCategoryScope(openCategoryScope === nextScope ? null : nextScope);
  }

  function selectCategory(name: string, nextScope: "product" | "service") {
    setScope(nextScope);
    setSelectedCategory(name);
    setOpenCategoryScope(null);
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
            <select value={cityId} onChange={e => setCityId(e.target.value)}>
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
        <div className="segmented search-scope-control">
          {(["product", "service"] as const).map(v => (
            <div className="scope-menu" key={v}>
              <button className={scope === v ? "active" : ""} onClick={() => selectScope(v)}>{v === "product" ? "Товары" : "Услуги"}</button>
              <button className={`scope-arrow ${openCategoryScope === v ? "active" : ""}`} aria-label="Категории" onClick={() => toggleCategory(v)}><ChevronDown size={16} /></button>
              {openCategoryScope === v && (
                <div className="scope-dropdown">
                  <button onClick={() => selectCategory("", v)}>Все категории</button>
                  {categories.map(c => <button key={c.id} onClick={() => selectCategory(c.name, v)}>{c.name}</button>)}
                </div>
              )}
            </div>
          ))}
          <button className={scope === "all" ? "active" : ""} onClick={() => selectScope("all")}>По обеим</button>
          {selectedCategory && <span className="scope-selected">{selectedCategory}</span>}
        </div>
      </section>

      {loading && <div className="empty-state">Ищем по товарам, услугам и профилям поставщиков...</div>}

      {!loading && searched && (
        <>
          <div className="result-tabs">
            <button className={resultTab === "found" ? "active" : ""} onClick={() => setResultTab("found")}>Найденное<span className="tab-badge">{results.length}</span></button>
            {(request || suppliers.length > 0) && <button className={resultTab === "suppliers" ? "active" : ""} onClick={() => setResultTab("suppliers")}>Подходящие магазины<span className="tab-badge">{suppliers.length}</span></button>}
            {chats.length > 0 && <button className={resultTab === "chats" ? "active" : ""} onClick={() => setResultTab("chats")}>Чаты<span className="tab-badge">{chats.length}</span></button>}
          </div>

          {resultTab === "found" && (
            <>
              {results.length === 0 ? (
                <div className="empty-state"><Search size={32} /><p>Точных совпадений нет.</p></div>
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
      <BusinessSidebar tab={tab} onTabChange={(t) => { setTab(t); setShowImport(false); }} bizName={bizName} branchName={branchName} onLogout={onLogout} />
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
  const [filters, setFilters] = useState<DashboardFilter[]>([]);

  const branchId = session.branchId;
  const columns: DashboardColumn<SupplierTask>[] = [
    { field: "query", label: "Запрос", kind: "text", value: row => row.query },
    { field: "customerArea", label: "Город", kind: "text", value: row => row.customerArea },
    { field: "category", label: "Категория", kind: "text", value: row => row.category },
    { field: "ageMinutes", label: "Возраст, мин", kind: "number", value: row => row.ageMinutes },
    { field: "status", label: "Статус", kind: "text", value: row => row.status },
  ];
  const visibleTasks = useMemo(() => applyDashboardFilters(tasks as SupplierTask[], columns, filters), [tasks, filters]);

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
      <DashboardFilters columns={columns} filters={filters} onChange={setFilters} />
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table className="activity-table">
            <thead><tr><th>Тип</th><th>Запрос</th><th>Город</th><th>Категория</th><th>Обновлено</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {visibleTasks.map((t: any) => (
                <tr key={t.id}>
                  <td><span className="kind-pill">Запрос</span></td>
                  <td><strong>{t.query}</strong></td>
                  <td>{t.customerArea}</td>
                  <td>{t.category || "—"}</td>
                  <td>{t.ageLabel}</td>
                  <td><span className={`activity-status ${t.status === "new" ? "activity-discussing" : t.status === "needs_reply" ? "activity-discussing" : "activity-confirmed"}`}>{t.status === "new" ? "Новый" : t.status === "needs_reply" ? "Требует ответа" : "Отвечен"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-outline" style={{ minHeight: 30, fontSize: 12 }} onClick={() => openChat(t)}><MessageCircle size={14} />Ответить</button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleTasks.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Нет активных запросов</td></tr>}
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
  const [filters, setFilters] = useState<DashboardFilter[]>([]);

  const branchId = session.branchId;
  const columns: DashboardColumn<BusinessProduct>[] = [
    { field: "name", label: "Название", kind: "text", value: row => row.name },
    { field: "category", label: "Категория", kind: "text", value: row => row.category },
    { field: "sku", label: "SKU", kind: "text", value: row => row.sku },
    { field: "price", label: "Цена", kind: "number", value: row => row.price },
    { field: "source", label: "Источник", kind: "text", value: row => row.source },
    { field: "enabled", label: "Активен", kind: "boolean", value: row => row.enabled },
  ];
  const visibleProducts = useMemo(() => applyDashboardFilters(products, columns, filters), [products, filters]);

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
        id: p.productId, productOfferId: p.productOfferId, name: p.name, categoryId: p.categoryId || "", category: p.categoryLabel || "—",
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
    setFormCategoryId(p.categoryId);
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
      <DashboardFilters columns={columns} filters={filters} onChange={setFilters} />
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table className="manage-table">
            <thead><tr><th>Название</th><th>Категория</th><th>SKU</th><th>Цена</th><th>Источник</th><th>Активен</th><th>Действия</th></tr></thead>
            <tbody>
              {visibleProducts.map(p => (
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
              {visibleProducts.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Нет товаров</td></tr>}
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
  const [filters, setFilters] = useState<DashboardFilter[]>([]);

  const branchId = session.branchId;
  const columns: DashboardColumn<BusinessService>[] = [
    { field: "name", label: "Название", kind: "text", value: row => row.name },
    { field: "category", label: "Категория", kind: "text", value: row => row.category },
    { field: "price", label: "Цена", kind: "number", value: row => row.price },
    { field: "duration", label: "Длительность", kind: "number", value: row => row.duration },
    { field: "schedule", label: "График", kind: "text", value: row => row.schedule },
    { field: "active", label: "Активна", kind: "boolean", value: row => row.active },
  ];
  const visibleServices = useMemo(() => applyDashboardFilters(services, columns, filters), [services, filters]);

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
        name: s.name, categoryId: s.categoryId || "", category: s.categoryLabel || "—", price: s.basePrice ? `от ${Number(s.basePrice).toLocaleString("ru-RU")} ₸` : "Цена не указана",
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
    setFormCategoryId(s.categoryId);
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
      <DashboardFilters columns={columns} filters={filters} onChange={setFilters} />
      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Загрузка...</p></div>}
      {!loading && (
        <div className="service-list">
          {visibleServices.map(s => (
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
          {visibleServices.length === 0 && <div className="empty-state"><p>Нет услуг</p></div>}
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
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);

  const businessId = session.businessId;

  useEffect(() => {
    if (!businessId) return;
    setBranchesLoading(true);
    listBranches(businessId)
      .then(setBranches)
      .catch(e => {
        setToast(extractError(e));
        setTimeout(() => setToast(null), 2500);
      })
      .finally(() => setBranchesLoading(false));
  }, [businessId]);

  useEffect(() => {
    listCities()
      .then(setCities)
      .catch(e => {
        setToast(extractError(e));
        setTimeout(() => setToast(null), 2500);
      });
  }, []);

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
    if (!businessId || !newBranchName.trim()) return;
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

      <div className="manage-header" style={{ marginTop: 24 }}><h2>Филиалы</h2>{businessId && <button className="btn-primary" onClick={() => setShowAddBranch(true)}><Plus size={16} />Добавить филиал</button>}</div>
      {branchesLoading && <div className="empty-state"><RefreshCw size={20} className="spin" /><p>Загрузка...</p></div>}
      {!branchesLoading && (
        <div className="service-list branch-list" style={{ marginTop: 8 }}>
          {branches.map(b => (
            <div className="branch-item" key={b.id}>
              <button className="service-row branch-toggle" onClick={() => setExpandedBranchId(expandedBranchId === b.id ? null : b.id)}>
                <Store size={18} color="var(--muted)" />
                <div><strong>{b.name}</strong><span>{b.cityName}{b.address ? ` · ${b.address}` : ""}{b.onlineOnly ? " · Онлайн" : ""}</span></div>
                <ChevronDown size={16} color="var(--primary)" />
              </button>
              {expandedBranchId === b.id && (
                <div className="branch-staff-panel">
                  <StaffPage showToast={showToast} session={session} branchIdOverride={b.id} branchName={b.name} />
                </div>
              )}
            </div>
          ))}
          {branches.length === 0 && <div className="empty-state"><p>Нет филиалов</p></div>}
        </div>
      )}

      {showAddBranch && (
        <div className="modal-overlay" onClick={() => setShowAddBranch(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2>Добавить филиал</h2>
            <label>Название<input value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="ул. Абая, 1" /></label>
            <label>Адрес<input value={newBranchAddress} onChange={e => setNewBranchAddress(e.target.value)} /></label>
            <label>Город
              <select value={newBranchCityId} onChange={e => setNewBranchCityId(e.target.value)} disabled={cities.length === 0} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 14, width: "100%", marginTop: 4 }}>
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
function StaffPage({ showToast, session, branchIdOverride, branchName }: { showToast: (m: string) => void; session: any; branchIdOverride?: string; branchName?: string }) {
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
      <div className="manage-header"><h2>Сотрудники{branchName ? `: ${branchName}` : ""}</h2><button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} />Добавить</button></div>
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

const targetFieldLabels: Record<string, string> = {
  NAME: "Название товара", CATEGORY_LABEL: "Категория", DESCRIPTION: "Описание",
  SKU: "Артикул / Код товара", PRICE: "Цена", TAGS: "Теги", IGNORE: "Игнорировать",
  APPEND_TO_DESCRIPTION: "Добавить к описанию", CHARACTERISTIC: "Характеристика",
};

const standardFields = ["NAME", "CATEGORY_LABEL", "DESCRIPTION", "SKU", "PRICE", "TAGS"];
const specialFields = ["IGNORE", "APPEND_TO_DESCRIPTION", "CHARACTERISTIC"];

const importFormatGuide: Array<{ field: string; examples: string }> = [
  { field: "Название товара", examples: "Наименование, Название, Товар, Name, Product" },
  { field: "Категория", examples: "Категория товара, Группа, Category" },
  { field: "Артикул / Код товара", examples: "SKU, ШК, Код, Арт, Article, Barcode" },
  { field: "Цена", examples: "Цена продажи, Розница, Стоимость, Price" },
  { field: "Описание", examples: "Описание товара, Description" },
  { field: "Теги", examples: "Метки, Tags" },
];

/* ── Import Page ── */
function ImportPage({ showToast, session, onClose }: { showToast: (m: string) => void; session: any; onClose?: () => void }) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadRes, setUploadRes] = useState<UploadResponse | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [charNames, setCharNames] = useState<Record<string, string>>({});
  const [previewRes, setPreviewRes] = useState<PreviewResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [modalCol, setModalCol] = useState<string | null>(null);
  const [modalVal, setModalVal] = useState<string>("IGNORE");

  const branchId = session.branchId;
  const branchName = session.branchName || "Филиал";
  const authHeaders: Record<string, string> = { Authorization: `Bearer ${session.token}` };

  const stepperSteps = [
    { id: "upload", label: "Загрузка" },
    { id: "mapping", label: "Сопоставление" },
    { id: "preview", label: "Превью" },
  ];
  const currentStepIdx = stepperSteps.findIndex(s => s.id === step);

  function openFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = (ev) => handleFile((ev as any).target?.files?.[0]);
    input.click();
  }

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx") && !f.name.toLowerCase().endsWith(".xls")) {
      showToast("Только .xlsx и .xls файлы"); return;
    }
    uploadFile(f);
  }

  async function uploadFile(f: File) {
    setFile(f); setError(null); setLoading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports`, { method: "POST", headers: authHeaders, body: fd });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new ApiError(res.status, t || `Ошибка ${res.status}`); }
      const data: UploadResponse = transformKeys(await res.json()) as UploadResponse;
      setUploadRes(data);
      const initial: Record<string, string> = {};
      const chars: Record<string, string> = {};
      for (const col of data.columns) {
        initial[col.sourceColumn] = col.suggestedTargetField || "IGNORE";
        if (col.suggestedTargetField === "CHARACTERISTIC") chars[col.sourceColumn] = col.sourceColumn;
      }
      setMappings(initial);
      setCharNames(chars);
      setStep("mapping");
      showToast(`Файл загружен. ${data.totalRows} строк, ${data.columns.length} колонок.`);
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function openMappingModal(colName: string) {
    setModalCol(colName);
    setModalVal(mappings[colName] || "IGNORE");
  }

  function applyMappingModal() {
    if (!modalCol) return;
    setMappings(prev => ({ ...prev, [modalCol]: modalVal }));
    if (modalVal === "CHARACTERISTIC") {
      setCharNames(prev => ({ ...prev, [modalCol]: prev[modalCol] || modalCol }));
    } else {
      setCharNames(prev => { const n = { ...prev }; delete n[modalCol]; return n; });
    }
    setModalCol(null);
  }

  function handleFieldChange(colName: string, value: string) {
    setMappings(prev => ({ ...prev, [colName]: value }));
    if (value === "CHARACTERISTIC") {
      setCharNames(prev => ({ ...prev, [colName]: prev[colName] || colName }));
    } else {
      setCharNames(prev => { const n = { ...prev }; delete n[colName]; return n; });
    }
  }

  async function handleMappingSubmit() {
    const hasName = Object.values(mappings).some(v => v === "NAME");
    if (!hasName) { showToast("Укажите колонку с названием товара"); return; }
    setError(null); setLoading(true);
    try {
      const entries = Object.entries(mappings).map(([sourceColumn, targetField]) => ({
        sourceColumn, targetField,
        characteristicName: targetField === "CHARACTERISTIC" ? (charNames[sourceColumn] || sourceColumn) : undefined,
      }));
      const res = await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports/${uploadRes!.importId}/mapping`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(camelToSnakeKeys({ mappings: entries })),
      });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new ApiError(res.status, t || `Ошибка ${res.status}`); }
      const data: PreviewResponseData = transformKeys(await res.json()) as PreviewResponseData;
      setPreviewRes(data);
      setStep("preview");
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleApprove() {
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports/${uploadRes!.importId}/approve`, { method: "POST", headers: authHeaders });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new ApiError(res.status, t || `Ошибка ${res.status}`); }
      const data = transformKeys(await res.json()) as any;
      showToast(`Импорт завершен! ${data.productsCreated} товаров создано.`);
      resetImport();
      onClose?.();
    } catch (err) { setError(extractError(err)); } finally { setLoading(false); }
  }

  async function handleCancel() {
    if (!uploadRes) { resetImport(); onClose?.(); return; }
    setError(null); setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/v1/business-admin/branches/${branchId}/product-imports/${uploadRes.importId}/cancel`, { method: "POST", headers: authHeaders });
    } catch { /* best effort */ } finally { setLoading(false); }
    resetImport();
  }

  function resetImport() {
    setStep("upload"); setFile(null); setUploadRes(null); setMappings({});
    setCharNames({}); setPreviewRes(null); setError(null);
  }

  function getSampleValues(colName: string): string[] {
    if (!uploadRes?.sampleRows?.length) return [];
    const vals = uploadRes.sampleRows.map(r => r[colName]).filter(Boolean);
    return [...new Set(vals)].slice(0, 3);
  }

  if (!branchId) {
    return (
      <div>
        <div className="manage-header"><h2>Excel импорт</h2></div>
        <div className="empty-state"><FileSpreadsheet size={32} /><p>Не найден филиал.</p></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header: back + stepper + branch */}
      <div className="import-header">
        <div>
          {onClose && <button className="btn-ghost" onClick={handleCancel}><ChevronLeft size={16} />Назад к товарам</button>}
        </div>
        <div className="import-stepper">
          {stepperSteps.map((s, i) => (
            <div key={s.id} className={`import-stepper-step${step === s.id ? " active" : ""}${currentStepIdx > i ? " done" : ""}`}>
              {currentStepIdx > i ? <Check size={14} /> : <span style={{ width: 14, height: 14, display: "inline-block", borderRadius: "50%", border: "2px solid currentColor", opacity: step === s.id ? 1 : 0.4 }} />}
              {s.label}
            </div>
          ))}
        </div>
        <div className="import-branch-badge"><Store size={16} />{branchName}</div>
      </div>

      {error && <div className="auth-error" style={{ margin: "0 0 16px" }}>{error}<button className="btn-ghost" style={{ marginLeft: 8, fontSize: 12 }} onClick={() => setError(null)}><X size={14} /></button></div>}

      {loading && <div className="empty-state"><RefreshCw size={24} className="spin" /><p>Обработка...</p></div>}

      {/* Step 1 — Upload */}
      {!loading && step === "upload" && (
        <div className="import-card" style={{ marginBottom: 80 }}>
          <h2>Импорт товаров из Excel</h2>
          <p>Импорт применяется к текущему филиалу: <strong>{branchName}</strong></p>

          <div
            className={`import-upload-area${dragOver ? " drag-over" : ""}`}
            onClick={openFilePicker}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={36} />
            <p>Загрузите файл Excel (.xlsx) с товарами</p>
            <span>Колонки будут автоматически сопоставлены с полями — проверить и поправить можно на следующем шаге</span>
            <button className="btn-outline" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); openFilePicker(); }}>Выбрать файл</button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Поддерживаются файлы .xlsx и .xls</span>
          </div>

          <div className="import-divider">или</div>

          <button className="import-example-btn" onClick={() => showToast("Демо-файл будет доступен в ближайшее время")}>
            <FileSpreadsheet size={18} />Использовать пример Excel
          </button>
          <div className="import-example-caption">Демо-набор: спортивное питание, 3 товара</div>

          <div className="import-warning">
            <strong>Важно</strong>
            <p>Вы заполняете данные для витрины — то, что увидит клиент.</p>
            <ul>
              <li>Не включайте в файл: остатки, закупочные цены, поставщиков, маржинальность и другие внутренние данные бизнеса.</li>
            </ul>
          </div>

          <table className="import-format-table">
            <thead>
              <tr><th>Поле товара</th><th>Подходящие заголовки колонок</th></tr>
            </thead>
            <tbody>
              {importFormatGuide.map(row => (
                <tr key={row.field}><td>{row.field}</td><td>{row.examples}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Step 2 — Mapping */}
      {!loading && step === "mapping" && uploadRes && (
        <>
          <div className="import-card" style={{ marginBottom: 0 }}>
            <h2>Сопоставление колонок</h2>
            <p>Сопоставьте Excel-колонки с полями товаров. <strong>Название товара обязательно.</strong></p>

            <table className="import-mapping-table" style={{ marginTop: 16 }}>
              <thead>
                <tr><th>Колонка Excel</th><th>Поле Ask</th><th>Пример значений</th></tr>
              </thead>
              <tbody>
                {uploadRes.columns.map(col => {
                  const currentVal = mappings[col.sourceColumn] || "IGNORE";
                  const isMatched = col.confidence > 0.7 && standardFields.includes(col.suggestedTargetField);
                  const isSpecial = specialFields.includes(currentVal);
                  const samples = getSampleValues(col.sourceColumn);
                  return (
                    <tr key={col.sourceColumn}>
                      <td className="col-excel">{col.sourceColumn}</td>
                      <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select
                          className={`field-select${isMatched ? " matched" : ""}${currentVal === "IGNORE" ? " ignored" : ""}`}
                          value={currentVal}
                          onChange={e => handleFieldChange(col.sourceColumn, e.target.value)}
                          style={isSpecial && currentVal !== "IGNORE" ? { background: "var(--primary-bg)", borderColor: "var(--primary-light)" } : undefined}
                        >
                          {Object.entries(targetFieldLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}{k === "CHARACTERISTIC" && charNames[col.sourceColumn] ? `: ${charNames[col.sourceColumn]}` : ""}</option>
                          ))}
                        </select>
                        {currentVal === "IGNORE" && (
                          <button className="btn-ghost" style={{ minHeight: 28, fontSize: 12 }} onClick={() => openMappingModal(col.sourceColumn)} title="Особые назначения">
                            <Settings2 size={14} />
                          </button>
                        )}
                      </td>
                      <td className="col-sample">{samples.length > 0 ? samples.join(" · ") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mapping modal */}
          {modalCol && (
            <div className="modal-overlay" onClick={() => setModalCol(null)}>
              <div className="modal-panel field-select-modal" onClick={e => e.stopPropagation()}>
                <h2>{modalCol}</h2>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Примеры значений</div>
                  <div className="sample-chips">
                    {getSampleValues(modalCol).map((v, i) => <span key={i} className="sample-chip">{v}</span>)}
                    {getSampleValues(modalCol).length === 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>Нет данных</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>Назначение поля:</div>
                  <div className="radio-group">
                    {[
                      { value: "IGNORE", label: "Игнорировать", desc: "Колонка не будет импортирована" },
                      { value: "APPEND_TO_DESCRIPTION", label: "Добавить в описание", desc: "Значение добавится в описание товара" },
                      { value: "CHARACTERISTIC", label: "Сделать характеристикой", desc: `Колонка станет характеристикой «${charNames[modalCol] || modalCol}»` },
                    ].map(opt => (
                      <label key={opt.value} className={`radio-option${modalVal === opt.value ? " selected" : ""}`}>
                        <input
                          type="radio"
                          name={`modal-${modalCol}`}
                          value={opt.value}
                          checked={modalVal === opt.value}
                          onChange={() => setModalVal(opt.value)}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={() => setModalCol(null)}>Отмена</button>
                  <button className="btn-primary" onClick={applyMappingModal}>Применить</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 3 — Preview */}
      {!loading && step === "preview" && previewRes && (
        <div className="import-card" style={{ marginBottom: 0 }}>
          <h2>Превью импорта</h2>
          <p>Проверьте данные перед импортом</p>

          <div className="import-preview-summary" style={{ marginTop: 16 }}>
            <div className="count">{previewRes.totalRows}</div>
            <div>
              <div className="label">Готово к импорту</div>
              {previewRes.invalidRows > 0 && <div className="sub">{previewRes.invalidRows} строк с ошибками будут пропущены</div>}
            </div>
          </div>

          {(() => {
            const charMappings = previewRes.mappings.filter(m => m.targetField === "CHARACTERISTIC");
            const ignoredMappings = previewRes.mappings.filter(m => m.targetField === "IGNORE");
            return (
              <>
                {charMappings.length > 0 && (
                  <>
                    <div className="import-chip-list-title">Характеристики ({charMappings.length})</div>
                    <div className="import-chip-list">
                      {charMappings.map(m => (
                        <span key={m.sourceColumn} className="import-chip char">
                          {m.characteristicName || m.sourceColumn} = {m.sourceColumn}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {ignoredMappings.length > 0 && (
                  <>
                    <div className="import-chip-list-title">Игнорируются ({ignoredMappings.length})</div>
                    <div className="import-chip-list">
                      {ignoredMappings.map(m => (
                        <span key={m.sourceColumn} className="import-chip ignored">{m.sourceColumn}</span>
                      ))}
                    </div>
                  </>
                )}
              </>
            );
          })()}

          <div className="import-preview-rows">
            {previewRes.rows.map(row => {
              const nameVal = row.normalizedData["NAME"] || Object.values(row.normalizedData)[0] || "—";
              const extraFields = Object.entries(row.normalizedData)
                .filter(([k]) => k !== "NAME")
                .map(([, v]) => v)
                .filter(Boolean)
                .slice(0, 2)
                .join(" · ");
              return (
                <div className="import-preview-row" key={row.rowId}>
                  <div className="row-num">Строка {row.rowNumber}</div>
                  <div className="row-data">{nameVal}{extraFields ? ` · ${extraFields}` : ""}</div>
                  <span className={`conf-badge ${row.status === "VALID" ? "conf-high" : row.status === "WARNING" ? "conf-medium" : "conf-low"}`}>
                    {row.status === "VALID" ? "OK" : row.status === "WARNING" ? "!" : "Ошибка"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky bottom bar */}
      {(step === "mapping" || step === "preview") && !loading && (
        <div className="import-sticky-bar">
          <div>
            {step === "mapping" && (
              <button className="btn-ghost" onClick={() => { setStep("upload"); setError(null); }}>Назад</button>
            )}
            {step === "preview" && (
              <button className="btn-ghost" onClick={() => { setStep("mapping"); setError(null); }}>Назад</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {step === "mapping" && (
              <button className="btn-primary" onClick={handleMappingSubmit} disabled={loading}>
                Продолжить <ArrowRight size={16} />
              </button>
            )}
            {step === "preview" && previewRes && (
              <button className="btn-primary" onClick={handleApprove} disabled={loading || previewRes.validRows === 0}>
                <Check size={16} />Импортировать {previewRes.totalRows}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
