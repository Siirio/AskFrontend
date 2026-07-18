import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserRound, MapPin, Bell, BellOff, LogOut, Building2, Package, Camera, CheckCircle2, Loader2, AlertTriangle, RefreshCw, Download, Trash2 } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { buildRoute, ROUTES } from "../../app/routes";
import { confirmEmailChange, deleteAccount, exportAccount, requestEmailChange } from "../../shared/api/authClient";

type GeoStatus = "active" | "off" | "expired" | "denied" | "requesting" | "notGranted" | "unavailable";

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
  const { t } = useTranslation();
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
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(() => {
    const stored = getStoredGeo();
    if (!stored) return "off";
    if (isGeoExpired(stored.updatedAt)) return "expired";
    return "active";
  });

  const geoStatusLabels: Record<GeoStatus, string> = {
    active: t("profile.geo.active"),
    off: t("profile.geo.off"),
    expired: t("profile.geo.expired"),
    denied: t("profile.geo.denied"),
    unavailable: t("profile.geo.unavailable"),
    requesting: t("profile.geo.requesting"),
    notGranted: t("profile.geo.notGranted"),
  };
  const user = state.session?.user;
  const businessMemberships = state.session?.businessMemberships ?? [];
  const activeBusiness = businessMemberships.find(
    membership => membership.businessId === state.activeBusinessId,
  ) ?? businessMemberships[0];
  const isBusiness = businessMemberships.length > 0;
  const [editForm, setEditForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [formErrors, setFormErrors] = useState<{ email?: string; phone?: string }>({});
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [accountActionError, setAccountActionError] = useState("");

  function validateEmail(email: string) {
    if (!email) return undefined;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : t("profile.validation.invalidEmail");
  }

  function validatePhone(phone: string) {
    if (!phone) return undefined;
    return /^\+?[\d\s()-]{7,18}$/.test(phone) ? undefined : t("profile.validation.invalidPhone");
  }

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then(perm => {
      if (perm.state === "denied") {
        setGeoActive(false);
        setGeoStatus("denied");
        window.localStorage.removeItem(GEO_STORAGE_KEY);
      } else if (perm.state === "prompt") {
        const stored = getStoredGeo();
        if (!stored) {
          setGeoActive(false);
          setGeoStatus("off");
        }
      }
      perm.addEventListener("change", () => {
        if (perm.state === "denied") {
          setGeoActive(false);
          setGeoStatus("denied");
          window.localStorage.removeItem(GEO_STORAGE_KEY);
        }
      });
    }).catch(() => {});
  }, []);

  if (!state.authenticated) {
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
      phone: editForm.phone,
    });
    if (editForm.email && editForm.email !== user?.email) {
      const challenge = await requestEmailChange(editForm.email);
      setEmailChallengeId(challenge.authChallengeId);
    }
  };

  const handleConfirmEmail = async () => {
    if (!emailChallengeId || emailCode.length !== 6) return;
    await confirmEmailChange(emailChallengeId, emailCode);
    setEmailChallengeId("");
    setEmailCode("");
    await actions.refreshSession();
  };

  const handleExportAccount = async () => {
    const data = await exportAccount();
    const url = URL.createObjectURL(new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" },
    ));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ask-account-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    setAccountActionError("");
    try {
      await deleteAccount();
      await actions.logout();
      navigate(ROUTES.auth, { replace: true });
    } catch (cause) {
      setAccountActionError(cause instanceof Error ? cause.message : t("profile.account.deleteError"));
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoBusy(true);
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      position => {
        window.localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: new Date().toISOString(),
        }));
        setGeoActive(true);
        setGeoBusy(false);
        setGeoStatus("active");
      },
      () => {
        setGeoActive(false);
        setGeoBusy(false);
        setGeoStatus("notGranted");
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
                <h1 className="fcw-h2" style={{ margin: "0 0 0.25rem 0" }}>{user?.displayName || t("profile.displayNameFallback")}</h1>
                <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>{user?.email || t("profile.emailFallback")}</p>
                <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.125rem 0 0" }}>{user?.phone || t("profile.phoneFallback")}</p>
              </div>

              {isBusiness && (
                <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>
                  {t("profile.role.business")}
                </span>
              )}
              {!isBusiness && (
                <span className="fcw-label" style={{ color: "var(--fcw-color-primary)" }}>
                  {t("profile.role.customer")}
                </span>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.75rem", marginBottom: "var(--fcw-space-md)" }}>
              <h2 className="fcw-h3" style={{ margin: 0 }}>{t("profile.section.profileData")}</h2>
              <label className="fcw-btn fcw-btn-secondary fcw-btn-sm">
                <Camera size={14} />
                {t("profile.avatar")}
                <input type="file" accept="image/*" onChange={event => handleAvatar(event.target.files?.[0])} style={{ display: "none" }} />
              </label>
            </div>
            <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <input className="fcw-input" value={editForm.displayName} onChange={event => setEditForm(prev => ({ ...prev, displayName: event.target.value }))} placeholder={t("profile.placeholder.name")} />
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <input
                    className="fcw-input"
                    type="email"
                    value={editForm.email}
                    onChange={event => { setEditForm(prev => ({ ...prev, email: event.target.value })); setFormErrors(prev => ({ ...prev, email: undefined })); }}
                    placeholder={t("profile.placeholder.email")}
                    style={formErrors.email ? { borderColor: "var(--fcw-color-error)" } : undefined}
                  />
                  {formErrors.email && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{formErrors.email}</span>}
                  {emailChallengeId && (
                    <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                      <input
                        className="fcw-input"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailCode}
                        onChange={event => setEmailCode(event.target.value.replace(/\D/g, ""))}
                        placeholder={t("profile.emailChange.code")}
                      />
                      <button
                        className="fcw-btn fcw-btn-secondary fcw-btn-sm"
                        type="button"
                        onClick={handleConfirmEmail}
                        disabled={emailCode.length !== 6}
                      >
                        {t("profile.emailChange.confirm")}
                      </button>
                    </div>
                  )}
                </div>
                <div className="fcw-flex-col" style={{ gap: "0.125rem" }}>
                  <input
                    className="fcw-input"
                    value={editForm.phone}
                    onChange={event => { setEditForm(prev => ({ ...prev, phone: event.target.value })); setFormErrors(prev => ({ ...prev, phone: undefined })); }}
                    placeholder={t("profile.placeholder.phone")}
                    style={formErrors.phone ? { borderColor: "var(--fcw-color-error)" } : undefined}
                  />
                  {formErrors.phone && <span className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{formErrors.phone}</span>}
                </div>
              </div>
              <button className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ alignSelf: "flex-start" }} onClick={handleSaveProfile} disabled={state.busy}>
                {state.busy ? <Loader2 className="fcw-animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                {t("profile.save")}
              </button>
            </div>
          </Card>

          <Card padding="none">
            <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)" }} onClick={requestLocation} disabled={geoBusy}>
              {geoBusy ? <Loader2 className="fcw-animate-spin" size={18} /> : geoActive ? <CheckCircle2 size={18} style={{ color: "var(--fcw-color-accent)" }} /> : geoStatus === "expired" ? <AlertTriangle size={18} style={{ color: "var(--fcw-amber-500)" }} /> : <MapPin size={18} style={{ color: "var(--fcw-color-primary)" }} />}
              <span className="fcw-flex-1 fcw-text-left">
                <span className="fcw-body" style={{ display: "block" }}>{t("profile.geo")}</span>
                <span className="fcw-body-s fcw-text-tertiary">{geoStatusLabels[geoStatus]}</span>
              </span>
              {geoStatus === "expired" && <RefreshCw size={14} style={{ color: "var(--fcw-amber-500)" }} />}
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
              <span className="fcw-flex-1 fcw-text-left">{t("profile.notifications")}</span>
              <span className="fcw-label" style={{ color: notificationsEnabled ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)" }}>
                {notificationsEnabled ? t("profile.notifications.on") : t("profile.notifications.off")}
              </span>
            </button>

            <button
              className="fcw-btn fcw-btn-ghost fcw-w-full"
              style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }}
              onClick={() => navigate(ROUTES.sellerOnboarding)}
            >
              <Building2 size={18} style={{ color: "var(--fcw-color-primary)" }} />
              <span className="fcw-flex-1 fcw-text-left">{t("profile.createBusiness")}</span>
            </button>

            {businessMemberships.map(membership => (
              <button
                key={membership.membershipId}
                className="fcw-btn fcw-btn-ghost fcw-w-full"
                style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }}
                onClick={() => {
                  actions.selectBusiness(membership.businessId);
                  navigate(buildRoute(ROUTES.business, { businessId: membership.businessId }));
                }}
              >
                <Building2 size={18} style={{ color: "var(--fcw-color-primary)" }} />
                <span className="fcw-flex-1 fcw-text-left">{membership.businessName}</span>
              </button>
            ))}

            {activeBusiness && (
              <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }} onClick={() => navigate(buildRoute(ROUTES.storefront, { businessId: activeBusiness.businessId }))}>
                <Package size={18} style={{ color: "var(--fcw-color-primary)" }} />
                <span className="fcw-flex-1 fcw-text-left">{t("profile.myStorefront")}</span>
              </button>
            )}

            <button className="fcw-btn fcw-btn-ghost fcw-w-full" style={{ justifyContent: "flex-start", gap: "0.75rem", padding: "var(--fcw-space-md)", color: "var(--fcw-color-error)", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)" }} onClick={handleLogout}>
              <LogOut size={18} />
              <span className="fcw-flex-1 fcw-text-left">{t("profile.logout")}</span>
            </button>
          </Card>

          <Card padding="lg">
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              <h2 className="fcw-h3" style={{ margin: 0 }}>{t("profile.account.title")}</h2>
              <p className="fcw-body-s fcw-text-secondary">{t("profile.account.description")}</p>
              <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem" }}>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={handleExportAccount}>
                  <Download size={14} />
                  {t("profile.account.export")}
                </button>
                <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setShowDeleteConfirmation(true)}>
                  <Trash2 size={14} />
                  {t("profile.account.delete")}
                </button>
              </div>
              {showDeleteConfirmation && (
                <div className="fcw-flex-col fcw-radius-md" style={{ gap: "0.5rem", padding: "0.75rem", background: "var(--fcw-color-surface-secondary)" }}>
                  <p className="fcw-body-s">{t("profile.account.deleteConfirm")}</p>
                  <div className="fcw-flex" style={{ gap: "0.5rem" }}>
                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleDeleteAccount}>
                      {t("profile.account.deleteFinal")}
                    </button>
                    <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" onClick={() => setShowDeleteConfirmation(false)}>
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
              {accountActionError && <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)" }}>{accountActionError}</p>}
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
