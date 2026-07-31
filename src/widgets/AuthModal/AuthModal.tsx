import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Input } from "../../shared/ui/Input/Input";
import { API_BASE_URL } from "../../shared/api/httpClient";
import { listCategories } from "../../shared/api/askClient";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useAuth();
  const { reduced } = useMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategoryName, setBusinessCategoryName] = useState("");
  const [businessScope, setBusinessScope] = useState<"ITEM" | "SERVICE" | "BOTH">("BOTH");
  const [businessCategorySuggestions, setBusinessCategorySuggestions] = useState<Array<{ categoryId: string; label: string }>>([]);
  const [cityName, setCityName] = useState("Астана");
  const [code, setCode] = useState("");

  if (!open) return null;

  const isBusiness = state.audience === "business";

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    await actions.login(email, password);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    await actions.register({ email, password, displayName, businessName, businessCategoryName, businessScope, cityName });
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    await actions.verify(code);
  };

  return (
    <div
      className="fcw-fixed fcw-z-modal"
      style={{
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--fcw-space-md)",
      }}
    >
      {/* Backdrop */}
      <motion.div
        className="fcw-absolute"
        style={{
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
        initial={reduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        className="fcw-card fcw-p-xl fcw-relative"
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 1,
        }}
        initial={reduced ? {} : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Close button */}
        <button
          className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm fcw-absolute"
          style={{ top: "0.75rem", right: "0.75rem" }}
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        {/* Audience tabs */}
        <div className="fcw-flex" style={{ marginBottom: "var(--fcw-space-lg)", gap: "0.375rem", padding: "0.25rem", borderRadius: "var(--fcw-radius-lg)", background: "color-mix(in srgb, var(--fcw-color-surface-secondary) 60%, transparent)", backdropFilter: "var(--fcw-blur-glass)" }}>
          <button
            className={`fcw-flex-1 fcw-btn fcw-btn-sm ${state.audience === "customer" ? "fcw-glassmorph-selected" : ""}`}
            style={{
              background: state.audience === "customer" ? undefined : "transparent",
              color: state.audience === "customer" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
              fontWeight: state.audience === "customer" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
              borderRadius: "var(--fcw-radius-md)",
              border: state.audience === "customer" ? undefined : "none",
              boxShadow: state.audience === "customer" ? undefined : "none",
            }}
            onClick={() => actions.setAudience("customer")}
          >
            Покупатель
          </button>
          <button
            className={`fcw-flex-1 fcw-btn fcw-btn-sm ${state.audience === "business" ? "fcw-glassmorph-selected" : ""}`}
            style={{
              background: state.audience === "business" ? undefined : "transparent",
              color: state.audience === "business" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
              fontWeight: state.audience === "business" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
              borderRadius: "var(--fcw-radius-md)",
              border: state.audience === "business" ? undefined : "none",
              boxShadow: state.audience === "business" ? undefined : "none",
            }}
            onClick={() => actions.setAudience("business")}
          >
            Бизнес
          </button>
        </div>

        {!state.challenge ? (
          <>
            {/* Mode tabs */}
            <div className="fcw-flex" style={{ marginBottom: "var(--fcw-space-md)", gap: "0.375rem", padding: "0.25rem", borderRadius: "var(--fcw-radius-lg)", background: "color-mix(in srgb, var(--fcw-color-surface-secondary) 60%, transparent)", backdropFilter: "var(--fcw-blur-glass)" }}>
              <button
                className={`fcw-flex-1 fcw-btn fcw-btn-sm ${state.mode === "login" ? "fcw-glassmorph-selected" : ""}`}
                style={{
                  background: state.mode === "login" ? undefined : "transparent",
                  color: state.mode === "login" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                  fontWeight: state.mode === "login" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                  borderRadius: "var(--fcw-radius-md)",
                  border: state.mode === "login" ? undefined : "none",
                  boxShadow: state.mode === "login" ? undefined : "none",
                }}
                onClick={() => actions.setMode("login")}
              >
                Вход
              </button>
              <button
                className={`fcw-flex-1 fcw-btn fcw-btn-sm ${state.mode === "register" ? "fcw-glassmorph-selected" : ""}`}
                style={{
                  background: state.mode === "register" ? undefined : "transparent",
                  color: state.mode === "register" ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                  fontWeight: state.mode === "register" ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                  borderRadius: "var(--fcw-radius-md)",
                  border: state.mode === "register" ? undefined : "none",
                  boxShadow: state.mode === "register" ? undefined : "none",
                }}
                onClick={() => actions.setMode("register")}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={state.mode === "login" ? handleLogin : handleRegister}>
              <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <Input
                  label="Пароль"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={state.mode === "login" ? "current-password" : "new-password"}
                />
                {state.mode === "register" && (
                  <>
                    <Input
                      label="Имя"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Ваше имя"
                      required
                    />
                    {isBusiness && (
                      <>
                        <Input
                          label="Название компании"
                          value={businessName}
                          onChange={e => setBusinessName(e.target.value)}
                          placeholder="Название вашего бизнеса"
                          required
                        />
                        <Input
                          label="Категория бизнеса"
                          value={businessCategoryName}
                          onChange={async e => {
                            const value = e.target.value;
                            setBusinessCategoryName(value);
                            if (value.trim()) {
                              try {
                                const response = await listCategories("BUSINESS", value);
                                setBusinessCategorySuggestions(response.suggestions);
                              } catch { }
                            }
                          }}
                          placeholder="Например, салон красоты"
                          list="business-category-suggestions"
                          required
                        />
                        <datalist id="business-category-suggestions">
                          {businessCategorySuggestions.map(category => <option key={category.categoryId} value={category.label} />)}
                        </datalist>
                        <label className="fcw-label" htmlFor="business-scope">Что предлагает бизнес</label>
                        <select id="business-scope" className="fcw-input" value={businessScope} onChange={e => setBusinessScope(e.target.value as "ITEM" | "SERVICE" | "BOTH")}>
                          <option value="BOTH">Товары и услуги</option>
                          <option value="ITEM">Только товары</option>
                          <option value="SERVICE">Только услуги</option>
                        </select>
                      </>
                    )}
                    {!isBusiness && (
                      <Input
                        label="Город"
                        value={cityName}
                        onChange={e => setCityName(e.target.value)}
                        placeholder="Астана"
                        required
                      />
                    )}
                  </>
                )}

                {state.error && (
                  <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>
                    {state.error}
                  </div>
                )}

                <button
                  type="submit"
                  className="fcw-btn fcw-btn-primary fcw-btn-full fcw-btn-lg"
                  disabled={state.busy}
                  style={{ marginTop: "0.5rem" }}
                >
                  {state.busy ? "..." : state.mode === "login" ? "Войти" : "Зарегистрироваться"}
                  {!state.busy && <ArrowRight size={18} />}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="fcw-flex fcw-items-center" style={{ margin: "var(--fcw-space-md) 0", gap: "var(--fcw-space-sm)" }}>
              <div className="fcw-flex-1" style={{ height: "1px", background: "var(--fcw-color-border)" }} />
              <span className="fcw-body-xs fcw-text-tertiary">или</span>
              <div className="fcw-flex-1" style={{ height: "1px", background: "var(--fcw-color-border)" }} />
            </div>

            {/* Google OAuth */}
            <a
              href={`${API_BASE_URL}/oauth2/authorization/google`}
              className="fcw-btn fcw-btn-secondary fcw-btn-full fcw-btn-lg"
              style={{ textDecoration: "none" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Продолжить с Google
            </a>
          </>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <p className="fcw-body fcw-text-secondary">
                Код подтверждения отправлен на {state.challenge?.maskedDestination || email || "вашу почту"}
              </p>
              {state.challenge?.code && (
                <div className="fcw-card fcw-p-sm" style={{ background: "var(--fcw-color-surface-secondary)", borderRadius: "var(--fcw-radius-md)", textAlign: "center" }}>
                  <p className="fcw-body-xs fcw-text-tertiary" style={{ marginBottom: "0.25rem" }}>Тестовый режим — код:</p>
                  <p className="fcw-h3" style={{ fontFamily: "var(--fcw-font-mono)", letterSpacing: "0.2em", color: "var(--fcw-color-primary)" }}>{state.challenge.code}</p>
                </div>
              )}
              <Input
                label="Код из письма"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="000000"
                required
                autoFocus
              />
              {state.error && (
                <div className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>
                  {state.error}
                </div>
              )}
              <button
                type="submit"
                className="fcw-btn fcw-btn-primary fcw-btn-full fcw-btn-lg"
                disabled={state.busy}
              >
                {state.busy ? "Проверка..." : "Подтвердить"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
