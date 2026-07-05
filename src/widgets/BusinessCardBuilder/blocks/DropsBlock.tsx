import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CardBlockConfig, DropItem } from "../types";

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function DropsBlock({ config, isEditing, onChange }: Props) {
  const drops = config.drops || [];
  const [editId, setEditId] = useState<string | null>(null);

  const addDrop = () => {
    const newDrop: DropItem = { localId: `drop-${crypto.randomUUID()}`, name: "New Drop", price: "", status: "ACTIVE" };
    onChange({ drops: [...drops, newDrop] });
    setEditId(newDrop.localId);
  };

  const removeDrop = (localId: string) => {
    onChange({ drops: drops.filter(d => d.localId !== localId) });
  };

  const updateDrop = (localId: string, patch: Partial<DropItem>) => {
    onChange({ drops: drops.map(d => d.localId === localId ? { ...d, ...patch } : d) });
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
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 1rem 0" }}>
        {isEditing ? (
          <input
            className="fcw-input"
            defaultValue="Drops & Products"
            style={{ fontSize: "1.125rem", fontWeight: 600, width: "100%", height: 36 }}
          />
        ) : "Drops & Products"}
      </h3>

      {drops.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)", border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)" }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <span className="fcw-body-s">No drops yet</span>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={addDrop}>
                <Plus size={14} /> Add Drop
              </button>
            </div>
          ) : (
            <span className="fcw-body-s">No drops displayed</span>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
          {drops.map(drop => (
            <div
              key={drop.localId}
              style={{
                flex: "0 0 180px",
                backgroundColor: "var(--fcw-color-surface)",
                borderRadius: "var(--fcw-radius-lg)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: 120,
                  backgroundColor: "var(--fcw-color-surface-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundImage: drop.image ? `url(${drop.image})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div style={{ padding: "0.75rem" }}>
                {editId === drop.localId ? (
                  <input
                    autoFocus
                    className="fcw-input"
                    defaultValue={drop.name}
                    style={{ fontSize: "0.875rem", fontWeight: 600, height: 32 }}
                    onBlur={e => { updateDrop(drop.localId, { name: e.target.value }); setEditId(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { updateDrop(drop.localId, { name: (e.target as HTMLInputElement).value }); setEditId(null); } if (e.key === "Escape") setEditId(null); }}
                  />
                ) : (
                  <div
                    className="fcw-body-s fcw-weight-semibold"
                    style={{ cursor: isEditing ? "text" : "default" }}
                    onClick={() => isEditing && setEditId(drop.localId)}
                  >
                    {drop.name}
                  </div>
                )}
                {drop.price && <div className="fcw-body-s" style={{ color: "var(--fcw-color-primary)", fontWeight: 600 }}>{drop.price}</div>}
                {drop.status && (
                  <span className="fcw-label" style={{ color: drop.status === "ACTIVE" ? "var(--fcw-color-accent)" : "var(--fcw-color-text-tertiary)" }}>
                    {drop.status}
                  </span>
                )}
              </div>
              {isEditing && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  style={{ position: "absolute", top: 4, right: 4, color: "var(--fcw-color-error)" }}
                  onClick={() => removeDrop(drop.localId)}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{ flex: "0 0 180px", height: "auto", minHeight: 180, border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-lg)", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={addDrop}
            >
              <Plus size={16} style={{ color: "var(--fcw-color-text-tertiary)" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
