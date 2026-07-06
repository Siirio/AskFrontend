import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, Plus, Trash2, Calendar, Tag, Loader2, Clock } from "lucide-react";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import { Select } from "../../shared/ui/Select/Select";
import type { BrandDropDto } from "../../shared/api/dto";

function formatDate(value?: string | null, t?: (key: string) => string): string {
  if (!value) return t?.("drops.noDate") || "—";
  return new Intl.DateTimeFormat("ru-KZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDateShort(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-KZ", { day: "2-digit", month: "short" }).format(new Date(value));
}

const DROP_TYPE_CONFIG = {
  COLLAB: { icon: "🤝", color: "#a78bfa" },
  RESTOCK: { icon: "📦", color: "#60a5fa" },
  SEASONAL: { icon: "🌸", color: "#f472b6" },
  PREORDER: { icon: "📋", color: "#34d399" },
} as const;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "drops.statusActive",
  CANCELLED: "drops.statusCancelled",
  COMPLETED: "drops.statusCompleted",
};

interface DropsEditorProps {
  drops: BrandDropDto[];
  onCreate: (data: Partial<BrandDropDto>) => Promise<void>;
  onCancel: (drop: BrandDropDto) => Promise<void>;
  onDelete: (drop: BrandDropDto) => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
}

interface DropForm {
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  tags: string;
}

const emptyForm: DropForm = { name: "", type: "COLLAB", description: "", startDate: "", endDate: "", tags: "" };

export function DropsEditor({ drops, onCreate, onCancel, onDelete, busy, readOnly }: DropsEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DropForm>(emptyForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const update = (patch: Partial<DropForm>) => setForm(f => ({ ...f, ...patch }));

  const DROP_TYPES = [
    { key: "COLLAB", label: t("drops.typeCollab"), desc: t("drops.typeCollabDesc") },
    { key: "RESTOCK", label: t("drops.typeRestock"), desc: t("drops.typeRestockDesc") },
    { key: "SEASONAL", label: t("drops.typeSeasonal"), desc: t("drops.typeSeasonalDesc") },
    { key: "PREORDER", label: t("drops.typePreorder"), desc: t("drops.typePreorderDesc") },
  ];

  const resetForm = () => {
    setForm(emptyForm);
    setDrawerOpen(false);
    setSaveState("idle");
    setErrorMessage("");
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      setSaveState("error");
      setErrorMessage(t("drops.errorDateOrder"));
      return;
    }
    setSaveState("saving");
    setErrorMessage("");
    try {
      await onCreate({
        name: form.name,
        type: form.type,
        status: "ACTIVE",
        description: form.description,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      });
      setForm(emptyForm);
      setSaveState("saved");
      setTimeout(() => { setSaveState("idle"); setDrawerOpen(false); }, 600);
    } catch (err: unknown) {
      setSaveState("error");
      setErrorMessage(err instanceof Error ? err.message : t("drops.errorCreate"));
    }
  };

  const hasActiveDrops = drops.some(d => d.status === "ACTIVE");
  const selectedType = DROP_TYPES.find(dt => dt.key === form.type);
  const typeConfig = DROP_TYPE_CONFIG[form.type as keyof typeof DROP_TYPE_CONFIG] || DROP_TYPE_CONFIG.COLLAB;

  return (
    <div>
      <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
        <div>
          <h2 className="fcw-h2" style={{ margin: 0 }}>{t("business.events")}</h2>
          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>
            {t("business.activeDrops", { count: drops.filter(d => d.status === "ACTIVE").length })}
          </p>
        </div>
        {!readOnly && (
          <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { setForm(emptyForm); setSaveState("idle"); setErrorMessage(""); setDrawerOpen(true); }}>
            <Plus size={16} />{t("drops.create")}
          </button>
        )}
      </div>

      {drops.length === 0 ? (
        <EmptyState
          title={t("drops.empty")}
          description={t("drops.emptyDesc")}
          icon={<Sparkles size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
          action={!readOnly ? (
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { setForm(emptyForm); setSaveState("idle"); setErrorMessage(""); setDrawerOpen(true); }}>
              <Plus size={16} />{t("drops.create")}
            </button>
          ) : undefined}
        />
      ) : (
        <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
          {drops.map(drop => {
            const tc = DROP_TYPE_CONFIG[drop.type as keyof typeof DROP_TYPE_CONFIG] || DROP_TYPE_CONFIG.COLLAB;
            const dt = DROP_TYPES.find(dt => dt.key === drop.type);
            return (
              <div
                key={drop.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.875rem",
                  backgroundColor: "var(--fcw-color-surface)",
                  border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                  borderRadius: "var(--fcw-radius-md)",
                }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  backgroundColor: tc.color, flexShrink: 0,
                }} />
                <span className="fcw-body fcw-weight-medium" style={{ minWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {drop.name}
                </span>
                <span className="fcw-label" style={{
                  color: "#fff",
                  backgroundColor: tc.color,
                  padding: "0.1rem 0.5rem",
                  borderRadius: "var(--fcw-radius-full)",
                  fontSize: "0.6875rem",
                  flexShrink: 0,
                }}>
                  {dt?.label || drop.type}
                </span>
                <span className="fcw-body-s fcw-text-secondary fcw-flex fcw-items-center" style={{ gap: "0.25rem", flexShrink: 0 }}>
                  <Calendar size={12} />
                  {formatDateShort(drop.startDate)}
                  {drop.endDate && <> → {formatDateShort(drop.endDate)}</>}
                </span>
                {drop.tags && drop.tags.length > 0 && (
                  <span className="fcw-body-s fcw-text-tertiary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {drop.tags.join(", ")}
                  </span>
                )}
                <span className="fcw-label" style={{
                  color: drop.status === "ACTIVE" ? "var(--fcw-color-success)" : "var(--fcw-color-text-tertiary)",
                  flexShrink: 0,
                  fontSize: "0.6875rem",
                }}>
                  {t(STATUS_LABELS[drop.status] || "drops.statusActive")}
                </span>
                <div style={{ flex: 1 }} />
                {!readOnly && drop.status === "ACTIVE" && (
                  <div className="fcw-flex" style={{ gap: "0.25rem", flexShrink: 0 }}>
                    <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onCancel(drop)} aria-label={t("drops.cancel")}>
                      <X size={15} />
                    </button>
                    <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onDelete(drop)} aria-label={t("drops.delete")}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 90 }}
              onClick={resetForm}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(480px, 100vw)",
                backgroundColor: "var(--fcw-color-surface)",
                borderLeft: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                zIndex: 91,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              <div className="fcw-flex-between" style={{ padding: "1rem 1.25rem", borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", flexShrink: 0 }}>
                <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>{t("drops.newDrop")}</h3>
                <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={resetForm}>
                  <X size={18} />
                </button>
              </div>

              <div className="fcw-flex-col" style={{ gap: "1rem", padding: "1.25rem", flex: 1 }}>
                <div>
                  <span className="fcw-label" style={{ marginBottom: "0.5rem", display: "block" }}>{t("drops.type")}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem" }}>
                    {DROP_TYPES.map(dt => (
                      <button
                        key={dt.key}
                        type="button"
                        className="fcw-btn fcw-btn-sm"
                        style={{
                          justifyContent: "flex-start",
                          gap: "0.5rem",
                          border: form.type === dt.key ? "2px solid var(--fcw-color-primary)" : "2px solid var(--fcw-color-border)",
                          background: form.type === dt.key ? "color-mix(in srgb, var(--fcw-color-primary) 8%, transparent)" : "var(--fcw-color-surface)",
                          borderRadius: "var(--fcw-radius-md)",
                          padding: "0.625rem 0.75rem",
                        }}
                        onClick={() => update({ type: dt.key })}
                      >
                        <span style={{ fontSize: "1.25rem" }}>{(DROP_TYPE_CONFIG as any)[dt.key]?.icon || "📌"}</span>
                        <div style={{ textAlign: "left" }}>
                          <div className="fcw-body-s fcw-weight-medium">{dt.label}</div>
                          <div className="fcw-body-s fcw-text-tertiary" style={{ fontSize: "0.6875rem" }}>{dt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                  <span className="fcw-label">{t("drops.name")}</span>
                  <input className="fcw-input" value={form.name} onChange={e => update({ name: e.target.value })} placeholder={t("drops.namePlaceholder")} autoFocus />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                    <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}><Calendar size={11} />{t("drops.start")}</span>
                    <input type="datetime-local" className="fcw-input" value={form.startDate} onChange={e => update({ startDate: e.target.value })} />
                  </label>
                  <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                    <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}><Calendar size={11} />{t("drops.end")}</span>
                    <input type="datetime-local" className="fcw-input" value={form.endDate} onChange={e => update({ endDate: e.target.value })} />
                  </label>
                </div>

                <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                  <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}><Tag size={11} />{t("drops.tags")}</span>
                  <input className="fcw-input" value={form.tags} onChange={e => update({ tags: e.target.value })} placeholder={t("drops.tagsPlaceholder")} />
                </label>

                <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                  <span className="fcw-label">{t("drops.description")}</span>
                  <textarea className="fcw-textarea" value={form.description} onChange={e => update({ description: e.target.value })} rows={3} />
                </label>

                {saveState === "error" && errorMessage && (
                  <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: 0 }}>{errorMessage}</p>
                )}
              </div>

              <div className="fcw-flex" style={{ gap: "0.5rem", padding: "1rem 1.25rem", borderTop: "var(--fcw-border-width-thin) solid var(--fcw-color-border)", flexShrink: 0 }}>
                <button className="fcw-btn fcw-btn-primary" onClick={handleCreate} disabled={busy || saveState === "saving" || !form.name.trim()} style={{ flex: 1 }}>
                  {saveState === "saving" ? <Loader2 className="fcw-animate-spin" size={16} /> : saveState === "saved" ? <Check size={16} /> : <Plus size={16} />}
                  {saveState === "saving" ? t("drops.saving") : saveState === "saved" ? t("drops.saved") : saveState === "error" ? t("drops.tryAgain") : t("drops.create")}
                </button>
                <button className="fcw-btn fcw-btn-secondary" onClick={resetForm}>{t("business.cancel")}</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
