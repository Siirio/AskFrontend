import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserRound, MapPin, Bell, BellOff, LogOut, Building2, Package, Camera, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { buildRoute, ROUTES } from "../../app/routes";

const AVATAR_STORAGE_KEY = "ask.profileAvatar";
const GEO_STORAGE_KEY = "ask.geo";
const GEO_MAX_AGE_HOURS = 24;

function getStoredGeo(): { lat: number; lng: number; updatedAt: string } | null {
  try {
    const raw = window.localStorage.getItem(GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function isGeoExpired(updatedAt: string): boolean {
  const age = Date.now() - new Date(updatedAt).getTime();
  return age > GEO_MAX_AGE_HOURS * 60 * 60 * 1000;
}

export function ProfilePage() {
  const { state, actions } = useAuth();
  const { reduced } = useMotion();
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => window.localStorage.getItem("ask.notifications") === "granted");
  const [avatar, setAvatar] = useState(() => window.localStorage.getItem(AVATAR_STORAGE_KEY) || "");
  const [geoActive, setGeoActive] = useState(() => {
    const stored = getStoredGeo();
    return stored !== null && !isGeoExpired(stored.updatedAt);
  });
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoText, setGeoText] = useState(() => {
    const stored = getStoredGeo();
    if (!stored) return "Геопозиция выключена";
    if (isGeoExpired(stored.updatedAt)) return "Требуется обновление";
    return "Геопозиция активна";
  });
  const user = state.session?.user;
  const business = state.session?.business;
  const isBusiness = state.view === "business" || state.view === "staff";
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [formErrors, setFormErrors] = useState<{ email?: string; phone?: string }>({});

  function validateEmail(email: string) {
    if (!email) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : "Некорректный email";
  }

  function validatePhone(phone: string) {
    if (!phone) return undefined;
    return /^\+?[\d\s()-]{7,18}$/.test(phone) ? undefined : "Некорректный номер телефона";
  }

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then(perm => {
      if (perm.state === "denied") {
        setGeoActive(false);
        setGeoText("Доступ запрещён браузером");
        window.localStorage.removeItem(GEO_STORAGE_KEY);
      } else if (perm.state === "prompt") {
        const stored = getStoredGeo();
        if (!stored) {
          setGeoActive(false);
          setGeoText("Геопозиция выключена");
        }
      }
      perm.addEventListener("change", () => {
        if (perm.state === "denied") {
          setGeoActive(false);
          setGeoText("Доступ запрещён браузером");
          window.localStorage.removeItem(GEO_STORAGE_KEY);
        }
      });
    }).catch(() => {});
  }, []);

  if (state.view === "auth") {
    return <Navigate to={ROUTES.auth} replace />;
  }

  const handleAvatar = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setAvatar(value);
      window.localStorage.setItem(AVATAR_STORAGE_KEY, value);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const emailErr = validateEmail(editForm.email);
    const phoneErr = validatePhone(editForm.phone);
    setFormErrors({ email: emailErr, phone: phoneErr });
    if (emailErr || phoneErr) return;

    await actions.updateProfile({
      displayName: editForm.displayName,
      email: editForm.email,
      phone: editForm.phone,
    });
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoText("Геолокация недоступна");
      return;
    }
    setGeoBusy(true);
    setGeoText("Запрашиваем доступ...");
    navigator.geolocation.getCurrentPosition(
      position => {
        window.localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: new Date().toISOString(),
        }));
        setGeoActive(true);
        setGeoBusy(false);
        setGeoText("Геопозиция активна");
      },
      () => {
        setGeoActive(false);
        setGeoBusy(false);
        setGeoText("Доступ не получен");
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  };

  const handleLogout = async () => {
    await actions.logout();
    navigate(ROUTES.auth, { replace: true });
  };

  return (
    <main id="main-content">
      <div className="fcw-container" style={{ paddingTop: "var(--fcw-space-lg)", paddingBottom: "var(--fcw-space-xl)" }}>
        <motion.div
          className="fcw-flex-col"
          style={{ gap: "var(--fcw-space-md)", maxWidth: "720px", margin: "0 auto" }}
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card padding="lg">
            <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "1rem" }}>
              <div
                className="fcw-flex-center fcw-radius-full"
                style={{
                  width: 72,
                  height: 72,
                  background: "linear-gradient(135deg, var(--fcw-color-primary), var(--fcw-color-primary-hover))",
                  color: "var(--fcw-color-primary-text)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserRound size={32} />}
              </div>

              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <h1 className="fcw-h2" style={{ margin: "0 0 0.25rem 0" }}>{user?.displayName || "Пользователь"}</h1>
                <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>{user?.email || "Email не указан"}</p>
                <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.125rem 0 0" }}>{user?.phone || "Телефон не указан"}</p>
              </div>

              {isBusiness && (
                <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>
                  {state.view === "staff" ? "Сотрудник" : "Бизнес"}
                </span>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", marginBottom: "var(--fcw-space-md)" }}>
              <h2 className="fcw-h3" style={{ margin: 0 }}>Данные профиля</h2>
              <label className="fcw-btn fcw-btn-secondary fcw-btn-sm">
                <Camera size={14} />
                Аватар
                <input type="file" accept="image/*" onChange={event => handleAvatar(event.target.files?.[0])} style={{ display: "none" }} />
              </label>
            </div>
            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <input className="fcw-input" value={editForm.displayName} onChange={event => setEditForm(prev => ({ ...prev, displayName: event.target.value }))} placeholder="Имя" />
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <input
                    className="fcw-input"
                    type="email"
                    value={editForm.email}
                    onChange={event => { setEditForm(prev => ({ ...prev, email: event.target.value })); setFormErrors(prev => ({ ...prev, email: undefined })); }}
                    placeholder="Email"
                    style={formErrors.email ? { borderColor: "var(--fcw-color-error)" } : undefined}
                  />
                  {formErrors.email && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{formErrors.email}</span>}
                </div>
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <input
                    className="fcw-input"
                    value={editForm.phone}
                    onChange={event => { setEditForm(prev => ({ ...prev, phone: event.target.value })); setFormErrors(prev => ({ ...prev, phone: undefined })); }}
                    placeholder="Телефон"
                    style={formErrors.phone ? { borderColor: "var(--fcw-color-error)" } : undefined}
                  />
                  {formErrors.phone && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{formErrors.phone}</span>}
                </div>
              </div>
              <button className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ alignSelf: "flex-start" }} onClick={handleSaveProfile} disabled={state.busy}>
                {state.busy ? <Loader2 className="fcw-animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                Сохранить
              </button>
            </div>
          </Card>

          <Card padding="none">
            <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)" }} onClick={requestLocation} disabled={geoBusy}>
              {geoBusy ? <Loader2 className="fcw-animate-spin" size={18} /> : geoActive ? <CheckCircle2 size={18} style={{ color: "var(--fcw-color-accent)" }} /> : geoText.includes("Требуется") ? <AlertTriangle size={18} style={{ color: "var(--fcw-amber-500)" }} /> : <MapPin size={18} style={{ color: "var(--fcw-color-primary)" }} />}
              <span className="fcw-flex-1 fcw-text-left">
                <span className="fcw-body" style={{ display: "block" }}>Геопозиция</span>
                <span className="fcw-body-s fcw-text-tertiary">{geoText}</span>
              </span>
              {geoText.includes("Требуется") && <RefreshCw size={14} style={{ color: "var(--fcw-amber-500)" }} />}
            </button>

            <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }} onClick={() => {
              if (!("Notification" in window)) return;
              if (Notification.permission === "granted") {
                setNotificationsEnabled(false);
                window.localStorage.setItem("ask.notifications", "denied");
              } else if (Notification.permission === "denied") {
                setNotificationsEnabled(true);
                Notification.requestPermission().then(p => {
                  setNotificationsEnabled(p === "granted");
                  window.localStorage.setItem("ask.notifications", p);
                });
              } else {
                Notification.requestPermission().then(p => {
                  setNotificationsEnabled(p === "granted");
                  window.localStorage.setItem("ask.notifications", p);
                });
              }
            }}>
              {notificationsEnabled ? <Bell size={18} style={{ color: "var(--fcw-color-primary)" }} /> : <BellOff size={18} />}
              <span className="fcw-flex-1 fcw-text-left">Уведомления</span>
              <span className="fcw-label" style={{ color: notificationsEnabled ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)" }}>
                {notificationsEnabled ? "Включены" : "Выключены"}
              </span>
            </button>

            {business && (
              <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }} onClick={() => navigate(buildRoute(ROUTES.business))}>
                <Building2 size={18} style={{ color: "var(--fcw-color-primary)" }} />
                <span className="fcw-flex-1 fcw-text-left">{business.businessName}</span>
              </button>
            )}

            {isBusiness && business && (
              <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }} onClick={() => navigate(buildRoute(ROUTES.storefront, {}, { businessId: business.businessId }))}>
                <Package size={18} style={{ color: "var(--fcw-color-primary)" }} />
                <span className="fcw-flex-1 fcw-text-left">Моя витрина</span>
              </button>
            )}

            <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", color: "var(--fcw-color-error)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }} onClick={handleLogout}>
              <LogOut size={18} />
              <span className="fcw-flex-1 fcw-text-left">Выйти</span>
            </button>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
