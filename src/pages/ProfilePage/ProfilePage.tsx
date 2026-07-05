import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, MapPin, Bell, BellOff, LogOut, ChevronDown, Building2, Mail, Phone, Shield, Package } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";
import { buildRoute, ROUTES } from "../../app/routes";

type Section = "profile" | "addresses" | "notifications" | null;

export function ProfilePage() {
  const { state, actions } = useAuth();
  const { reduced } = useMotion();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Section>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editForm, setEditForm] = useState({ displayName: "", phone: "" });

  if (state.view === "auth") {
    return <Navigate to={ROUTES.auth} replace />;
  }

  const user = state.session?.user;
  const business = state.session?.business;
  const isBusiness = state.view === "business" || state.view === "staff";

  const toggleSection = (section: Section) => {
    setExpanded(prev => prev === section ? null : section);
  };

  const openEditForm = () => {
    setEditForm({
      displayName: user?.displayName || "",
      phone: user?.phone || "",
    });
    setExpanded("profile");
  };

  const sectionVariants = {
    hidden: { height: 0, opacity: 0, overflow: "hidden" },
    visible: { height: "auto", opacity: 1, overflow: "hidden" },
  };

  return (
    <main id="main-content">
      <div className="fcw-container" style={{ paddingTop: "var(--fcw-space-lg)", paddingBottom: "var(--fcw-space-xl)" }}>
        <motion.div
          className="fcw-flex-col"
          style={{ gap: "var(--fcw-space-lg)", maxWidth: "640px" }}
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Profile header card */}
          <Card padding="lg">
            <div className="fcw-flex-col fcw-items-center fcw-text-center" style={{ gap: "var(--fcw-space-md)" }}>
              <div
                className="fcw-flex-center fcw-radius-full"
                style={{
                  width: "80px",
                  height: "80px",
                  background: "linear-gradient(135deg, var(--fcw-color-primary), var(--fcw-color-primary-hover))",
                  color: "var(--fcw-color-primary-text)",
                  boxShadow: "0 4px 20px color-mix(in srgb, var(--fcw-color-primary) 30%, transparent)",
                }}
              >
                <UserRound size={36} />
              </div>
              <div>
                <h1 className="fcw-h2" style={{ margin: "0 0 0.25rem 0" }}>
                  {user?.displayName || "Пользователь"}
                </h1>
                <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>
                  {user?.email || ""}
                </p>
                {user?.phone && (
                  <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.125rem 0 0 0" }}>
                    {user.phone}
                  </p>
                )}
              </div>

              {isBusiness && (
                <div
                  className="fcw-flex fcw-items-center"
                  style={{
                    gap: "0.375rem",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "var(--fcw-radius-full)",
                    background: "color-mix(in srgb, var(--fcw-color-primary) 12%, transparent)",
                    color: "var(--fcw-color-primary)",
                    fontSize: "var(--fcw-font-size-body-s)",
                    fontWeight: "var(--fcw-font-weight-medium)",
                  }}
                >
                  <Shield size={14} />
                  {state.view === "staff" ? "Сотрудник" : "Бизнес-аккаунт"}
                </div>
              )}

              {business && (
                <button
                  className="fcw-btn fcw-btn-outline fcw-btn-sm"
                  onClick={() => navigate(buildRoute(ROUTES.business))}
                  style={{ gap: "0.5rem" }}
                >
                  <Building2 size={14} />
                  {business.businessName}
                </button>
              )}
            </div>
          </Card>

          {/* Sections */}
          <Card padding="none">
            {/* Edit Profile */}
            <button
              className="fcw-btn fcw-btn-ghost fcw-w-full"
              style={{
                justifyContent: "flex-start",
                gap: "0.75rem",
                borderRadius: expanded === "profile" ? "var(--fcw-radius-lg) var(--fcw-radius-lg) 0 0" : "var(--fcw-radius-lg)",
                padding: "var(--fcw-space-sm) var(--fcw-space-md)",
              }}
              onClick={() => expanded === "profile" ? setExpanded(null) : openEditForm()}
            >
              <UserRound size={18} style={{ color: "var(--fcw-color-primary)" }} />
              <span className="fcw-flex-1 fcw-text-left fcw-body">Редактировать профиль</span>
              <motion.span animate={{ rotate: expanded === "profile" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} style={{ color: "var(--fcw-color-text-tertiary)" }} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {expanded === "profile" && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={sectionVariants}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="fcw-flex-col"
                    style={{
                      gap: "var(--fcw-space-sm)",
                      padding: "0 var(--fcw-space-md) var(--fcw-space-md)",
                      borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                      paddingTop: "var(--fcw-space-sm)",
                      margin: "0 var(--fcw-space-md)",
                    }}
                  >
                    <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <span className="fcw-label">Имя</span>
                      <input
                        className="fcw-input"
                        value={editForm.displayName}
                        onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Ваше имя"
                      />
                    </label>
                    <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <span className="fcw-label">Телефон</span>
                      <input
                        className="fcw-input"
                        value={editForm.phone}
                        onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+7 (___) ___-__-__"
                      />
                    </label>
                    <button className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ alignSelf: "flex-start" }}>
                      Сохранить
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Addresses */}
            <button
              className="fcw-btn fcw-btn-ghost fcw-w-full"
              style={{
                justifyContent: "flex-start",
                gap: "0.75rem",
                borderRadius: 0,
                padding: "var(--fcw-space-sm) var(--fcw-space-md)",
              }}
              onClick={() => toggleSection("addresses")}
            >
              <MapPin size={18} style={{ color: "var(--fcw-color-primary)" }} />
              <span className="fcw-flex-1 fcw-text-left fcw-body">Адреса</span>
              <motion.span animate={{ rotate: expanded === "addresses" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} style={{ color: "var(--fcw-color-text-tertiary)" }} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {expanded === "addresses" && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={sectionVariants}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="fcw-flex-col"
                    style={{
                      gap: "var(--fcw-space-sm)",
                      padding: "0 var(--fcw-space-md) var(--fcw-space-md)",
                      borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                      paddingTop: "var(--fcw-space-sm)",
                      margin: "0 var(--fcw-space-md)",
                    }}
                  >
                    <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>
                      Сохранённые адреса для быстрого поиска
                    </p>
                    <div
                      className="fcw-flex-col fcw-items-center fcw-text-center"
                      style={{
                        gap: "0.5rem",
                        padding: "var(--fcw-space-md)",
                        borderRadius: "var(--fcw-radius-md)",
                        background: "var(--fcw-color-surface-secondary)",
                      }}
                    >
                      <MapPin size={24} style={{ color: "var(--fcw-color-text-tertiary)" }} />
                      <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>Нет сохранённых адресов</p>
                      <button className="fcw-btn fcw-btn-secondary fcw-btn-sm">Добавить адрес</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notifications */}
            <button
              className="fcw-btn fcw-btn-ghost fcw-w-full"
              style={{
                justifyContent: "flex-start",
                gap: "0.75rem",
                borderRadius: 0,
                padding: "var(--fcw-space-sm) var(--fcw-space-md)",
              }}
              onClick={() => toggleSection("notifications")}
            >
              {notificationsEnabled ? (
                <Bell size={18} style={{ color: "var(--fcw-color-primary)" }} />
              ) : (
                <BellOff size={18} style={{ color: "var(--fcw-color-text-tertiary)" }} />
              )}
              <span className="fcw-flex-1 fcw-text-left fcw-body">Уведомления</span>
              <motion.span animate={{ rotate: expanded === "notifications" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} style={{ color: "var(--fcw-color-text-tertiary)" }} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {expanded === "notifications" && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={sectionVariants}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="fcw-flex-col"
                    style={{
                      gap: "var(--fcw-space-sm)",
                      padding: "0 var(--fcw-space-md) var(--fcw-space-md)",
                      borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                      paddingTop: "var(--fcw-space-sm)",
                      margin: "0 var(--fcw-space-md)",
                    }}
                  >
                    <div className="fcw-flex-between" style={{ gap: "var(--fcw-space-sm)" }}>
                      <div>
                        <p className="fcw-body" style={{ margin: 0 }}>Push-уведомления</p>
                        <p className="fcw-body-s fcw-text-tertiary" style={{ margin: 0 }}>Новые совпадения и сообщения</p>
                      </div>
                      <button
                        onClick={() => setNotificationsEnabled(prev => !prev)}
                        className="fcw-btn fcw-btn-sm"
                        style={{
                          minWidth: "52px",
                          justifyContent: notificationsEnabled ? "flex-end" : "flex-start",
                          background: notificationsEnabled ? "var(--fcw-color-primary)" : "var(--fcw-color-surface-tertiary)",
                          borderRadius: "var(--fcw-radius-full)",
                          padding: "0.25rem",
                          transition: "all 0.2s ease",
                        }}
                        aria-label={notificationsEnabled ? "Выключить уведомления" : "Включить уведомления"}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            background: "var(--fcw-color-primary-text)",
                            borderRadius: "50%",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logout */}
            <button
              className="fcw-btn fcw-btn-ghost fcw-w-full"
              style={{
                justifyContent: "flex-start",
                gap: "0.75rem",
                borderRadius: "0 0 var(--fcw-radius-lg) var(--fcw-radius-lg)",
                padding: "var(--fcw-space-sm) var(--fcw-space-md)",
                color: "var(--fcw-color-error)",
                borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              }}
              onClick={actions.logout}
            >
              <LogOut size={18} />
              <span className="fcw-flex-1 fcw-text-left fcw-body">Выйти</span>
            </button>
          </Card>

          {/* Quick actions */}
          {isBusiness && (
            <motion.div
              className="fcw-flex-col"
              style={{ gap: "0.5rem" }}
              initial={reduced ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <p className="fcw-label" style={{ margin: "0 0 0.25rem 0" }}>Быстрые действия</p>
              <button
                className="fcw-btn fcw-btn-secondary fcw-w-full"
                style={{ justifyContent: "flex-start", gap: "0.75rem" }}
                onClick={() => navigate(buildRoute(ROUTES.business))}
              >
                <Building2 size={18} style={{ color: "var(--fcw-color-primary)" }} />
                <span className="fcw-flex-1 fcw-text-left">Кабинет бизнеса</span>
              </button>
              <button
                className="fcw-btn fcw-btn-secondary fcw-w-full"
                style={{ justifyContent: "flex-start", gap: "0.75rem" }}
                onClick={() => navigate(buildRoute(ROUTES.storefront, {}, { businessId: business?.businessId || "" }))}
              >
                <Package size={18} style={{ color: "var(--fcw-color-primary)" }} />
                <span className="fcw-flex-1 fcw-text-left">Моя витрина</span>
              </button>
            </motion.div>
          )}

          {/* Staff-specific: no business management */}
          {state.view === "staff" && business && (
            <p className="fcw-body-s fcw-text-tertiary fcw-text-center" style={{ margin: 0 }}>
              Вы вошли как сотрудник {business.businessName}. Управление бизнесом доступно владельцу.
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
