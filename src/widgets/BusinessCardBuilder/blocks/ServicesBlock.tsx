import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import type { CardBlockConfig, ServiceItem } from "../types";

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function ServicesBlock({ config, isEditing, onChange }: Props) {
  const services = config.services || [];
  const [editId, setEditId] = useState<string | null>(null);

  const addService = () => {
    const svc: ServiceItem = { localId: `svc-${crypto.randomUUID()}`, name: "New Service", description: "" };
    onChange({ services: [...services, svc] });
    setEditId(svc.localId);
  };

  const removeService = (localId: string) => {
    onChange({ services: services.filter(s => s.localId !== localId) });
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        borderRadius: "var(--fcw-radius-lg)",
        backgroundColor: config.backgroundColor || "var(--fcw-color-surface-secondary)",
        color: config.textColor || "var(--fcw-color-text)",
        fontFamily: config.fontFamily === "serif" ? "Georgia, serif" : config.fontFamily === "mono" ? "'JetBrains Mono', monospace" : "inherit",
        textAlign: config.alignment || "left",
      }}
    >
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Services</h3>

      {services.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)", border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)" }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <span className="fcw-body-s">No services added</span>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={addService}><Plus size={14} /> Add Service</button>
            </div>
          ) : (
            <span className="fcw-body-s">No services displayed</span>
          )}
        </div>
      ) : (
        <div className="fcw-flex-col" style={{ gap: "0.75rem" }}>
          {services.map(svc => (
            <div
              key={svc.localId}
              style={{
                backgroundColor: "var(--fcw-color-surface)",
                borderRadius: "var(--fcw-radius-md)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                padding: "1rem",
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              {editId === svc.localId ? (
                <div className="fcw-flex-col" style={{ gap: "0.5rem", flex: 1 }}>
                  <input autoFocus className="fcw-input" defaultValue={svc.name} placeholder="Service name" style={{ height: 32, fontWeight: 600 }}
                    onBlur={e => { onChange({ services: services.map(s => s.localId === svc.localId ? { ...s, name: e.target.value } : s) }); setEditId(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { onChange({ services: services.map(s => s.localId === svc.localId ? { ...s, name: (e.target as HTMLInputElement).value } : s) }); setEditId(null); } if (e.key === "Escape") setEditId(null); }}
                  />
                  <input className="fcw-input" defaultValue={svc.description || ""} placeholder="Description" style={{ height: 32, fontSize: "0.875rem" }}
                    onBlur={e => onChange({ services: services.map(s => s.localId === svc.localId ? { ...s, description: e.target.value } : s) })}
                  />
                </div>
              ) : (
                <div className="fcw-flex-col" style={{ gap: "0.25rem", flex: 1, cursor: isEditing ? "pointer" : "default" }} onClick={() => isEditing && setEditId(svc.localId)}>
                  <div className="fcw-body fcw-weight-semibold">{svc.name}</div>
                  {svc.description && <div className="fcw-body-s fcw-text-secondary">{svc.description}</div>}
                  {svc.duration && (
                    <div className="fcw-body-s fcw-text-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={12} /> {svc.duration}
                    </div>
                  )}
                </div>
              )}
              {svc.price && (
                <div className="fcw-body fcw-weight-semibold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap" }}>
                  {svc.price}
                </div>
              )}
              {isEditing && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  style={{ color: "var(--fcw-color-error)" }}
                  onClick={() => removeService(svc.localId)}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{ border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)", padding: "0.75rem" }}
              onClick={addService}
            >
              <Plus size={14} /> Add Service
            </button>
          )}
        </div>
      )}
    </div>
  );
}
