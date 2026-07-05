import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, Plus, Eye, Trash2, Calendar, Tag, Loader2 } from "lucide-react";
import { Card } from "../../shared/ui/Card/Card";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import type { BrandDropDto } from "../../shared/api/dto";

const DROP_TYPES: { key: string; label: string; desc: string; icon: string }[] = [
  { key: "COLLAB", label: "Collab", desc: "Joint release with another brand", icon: "🤝" },
  { key: "RESTOCK", label: "Restock", desc: "Item back in stock", icon: "📦" },
  { key: "SEASONAL", label: "Seasonal", desc: "Limited-time seasonal offer", icon: "🌸" },
  { key: "PREORDER", label: "Preorder", desc: "Pre-order before release", icon: "📋" },
];

interface DropForm {
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  tags: string;
}

const emptyForm: DropForm = { name: "", type: "COLLAB", description: "", startDate: "", endDate: "", tags: "" };

function formatDate(value?: string | null): string {
  if (!value) return "no date";
  return new Intl.DateTimeFormat("ru-KZ", { day: "2-digit", month: "short" }).format(new Date(value));
}

interface DropsEditorProps {
  drops: BrandDropDto[];
  onCreate: (data: Partial<BrandDropDto>) => Promise<void>;
  onCancel: (drop: BrandDropDto) => Promise<void>;
  onDelete: (drop: BrandDropDto) => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
}

export function DropsEditor({ drops, onCreate, onCancel, onDelete, busy, readOnly }: DropsEditorProps) {
  const [form, setForm] = useState<DropForm>(emptyForm);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const update = (patch: Partial<DropForm>) => setForm(f => ({ ...f, ...patch }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      setSaveState("error");
      setErrorMessage("End date must be after start date.");
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
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      setForm(emptyForm);
      setPreviewMode(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (err: unknown) {
      setSaveState("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to create drop. Check the data and try again.");
    }
  };

  const selectedType = DROP_TYPES.find(t => t.key === form.type);

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
        {/* Create drop — canvas/preview mode */}
        {!readOnly && (
          <Card padding="lg">
            <div className="fcw-flex-between" style={{ marginBottom: "var(--fcw-space-md)" }}>
              <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: 0 }}>New Drop</h3>
              <div className="fcw-flex" style={{ gap: "0.375rem" }}>
                <button
                  className={`fcw-btn fcw-btn-sm ${!previewMode ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                  onClick={() => setPreviewMode(false)}
                >
                  Edit
                </button>
                <button
                  className={`fcw-btn fcw-btn-sm ${previewMode ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
                  onClick={() => setPreviewMode(true)}
                >
                  <Eye size={14} /> Preview
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!previewMode ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
                    {/* Type selector as cards */}
                    <div>
                      <span className="fcw-label" style={{ marginBottom: "0.375rem", display: "block" }}>Type</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem" }}>
                        {DROP_TYPES.map(dt => (
                          <button
                            key={dt.key}
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
                            <span style={{ fontSize: "1.25rem" }}>{dt.icon}</span>
                            <div style={{ textAlign: "left" }}>
                              <div className="fcw-body-s fcw-weight-medium">{dt.label}</div>
                              <div className="fcw-body-s fcw-text-tertiary" style={{ fontSize: "0.6875rem" }}>{dt.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <span className="fcw-label">Name</span>
                      <input className="fcw-input" value={form.name} onChange={e => update({ name: e.target.value })} placeholder="Drop name" />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                        <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}><Calendar size={11} />Start</span>
                        <input type="datetime-local" className="fcw-input" value={form.startDate} onChange={e => update({ startDate: e.target.value })} />
                      </label>
                      <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                        <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}><Calendar size={11} />End</span>
                        <input type="datetime-local" className="fcw-input" value={form.endDate} onChange={e => update({ endDate: e.target.value })} />
                      </label>
                    </div>

                    <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <span className="fcw-label fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}><Tag size={11} />Tags</span>
                      <input className="fcw-input" value={form.tags} onChange={e => update({ tags: e.target.value })} placeholder="capsule, watches, summer" />
                    </label>

                    <label className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                      <span className="fcw-label">Description</span>
                      <textarea className="fcw-textarea" value={form.description} onChange={e => update({ description: e.target.value })} rows={2} />
                    </label>

                    <button className="fcw-btn fcw-btn-primary" onClick={handleCreate} disabled={busy || saveState === "saving" || !form.name.trim()}>
                      {saveState === "saving" ? <Loader2 className="fcw-animate-spin" size={16} /> : saveState === "saved" ? <Check size={16} /> : <Plus size={16} />}
                      {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Try again" : "Create Drop"}
                    </button>
                    {saveState === "error" && errorMessage && (
                      <p className="fcw-body-s" style={{ color: "var(--fcw-color-error)", margin: "0.25rem 0 0 0" }}>{errorMessage}</p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Live preview card */}
                  <div
                    style={{
                      padding: "1.25rem",
                      borderRadius: "var(--fcw-radius-lg)",
                      border: "2px dashed var(--fcw-color-border)",
                      backgroundColor: "var(--fcw-color-surface-secondary)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: 56, height: 56,
                          borderRadius: "var(--fcw-radius-md)",
                          background: "linear-gradient(135deg, var(--fcw-color-primary), var(--fcw-amber-500))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1.5rem", flexShrink: 0,
                        }}
                      >
                        {selectedType?.icon}
                      </div>
                      <div>
                        <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span
                            className="fcw-label"
                            style={{
                              color: "#fff",
                              backgroundColor: "var(--fcw-color-accent)",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "var(--fcw-radius-full)",
                              fontSize: "0.6875rem",
                            }}
                          >
                            {selectedType?.label}
                          </span>
                          <span className="fcw-label" style={{
                            color: "var(--fcw-color-accent)",
                            backgroundColor: "color-mix(in srgb, var(--fcw-color-accent) 12%, transparent)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--fcw-radius-full)",
                            fontSize: "0.6875rem",
                          }}>ACTIVE</span>
                        </div>
                        <div className="fcw-body fcw-weight-semibold">{form.name || "Untitled Drop"}</div>
                        {form.description && (
                          <p className="fcw-body-s fcw-text-secondary" style={{ margin: "0.25rem 0 0 0" }}>{form.description}</p>
                        )}
                        <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
                          {form.startDate && (
                            <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                              <Calendar size={11} />{formatDate(form.startDate)}
                            </span>
                          )}
                          {form.endDate && (
                            <span className="fcw-body-s fcw-text-tertiary">→ {formatDate(form.endDate)}</span>
                          )}
                        </div>
                        {form.tags && (
                          <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.25rem", marginTop: "0.375rem" }}>
                            {form.tags.split(",").filter(Boolean).map((t, i) => (
                              <span key={i} className="fcw-body-s" style={{
                                padding: "0.125rem 0.5rem",
                                backgroundColor: "var(--fcw-color-surface-tertiary)",
                                borderRadius: "var(--fcw-radius-full)",
                                color: "var(--fcw-color-text-secondary)",
                                fontSize: "0.6875rem",
                              }}>{t.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="fcw-body-s fcw-text-tertiary" style={{ textAlign: "center", margin: "0.75rem 0 0 0" }}>
                    This is how the drop appears in search results
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

        {/* Existing drops list */}
        <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
          {drops.length === 0 ? (
            <EmptyState
              title="No Drops"
              description="Create a brand event — it will appear in search results"
              icon={<Sparkles size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
            />
          ) : (
            drops.map(drop => {
              const dt = DROP_TYPES.find(t => t.key === drop.type);
              return (
                <Card key={drop.id} padding="md">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: 44, height: 44,
                        borderRadius: "var(--fcw-radius-md)",
                        background: "linear-gradient(135deg, var(--fcw-color-primary), var(--fcw-amber-500))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.25rem", flexShrink: 0,
                      }}
                    >
                      {dt?.icon || "📌"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fcw-flex fcw-items-center fcw-flex-wrap" style={{ gap: "0.375rem", marginBottom: "0.125rem" }}>
                        <span
                          className="fcw-label"
                          style={{
                            color: "#fff",
                            backgroundColor: "var(--fcw-color-accent)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "var(--fcw-radius-full)",
                            fontSize: "0.6875rem",
                          }}
                        >
                          {dt?.label || drop.type}
                        </span>
                        <span className="fcw-body-s fcw-weight-semibold">{drop.name}</span>
                      </div>
                      <div className="fcw-body-s fcw-text-secondary">
                        {drop.status} · {formatDate(drop.startDate)}
                        {drop.tags?.length ? ` · ${drop.tags.join(", ")}` : ""}
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="fcw-flex" style={{ gap: "0.25rem", flexShrink: 0 }}>
                        <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onCancel(drop)} aria-label="Cancel">
                          <X size={15} />
                        </button>
                        <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={() => onDelete(drop)} aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
