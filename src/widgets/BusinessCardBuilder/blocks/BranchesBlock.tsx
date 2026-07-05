import { useState } from "react";
import { Plus, Trash2, MapPin, Clock } from "lucide-react";
import type { CardBlockConfig, BranchItem } from "../types";

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function BranchesBlock({ config, isEditing, onChange }: Props) {
  const branches = config.branches || [];
  const [editId, setEditId] = useState<string | null>(null);

  const addBranch = () => {
    const branch: BranchItem = { localId: `br-${crypto.randomUUID()}`, name: "New Branch", address: "", city: "" };
    onChange({ branches: [...branches, branch] });
    setEditId(branch.localId);
  };

  const removeBranch = (localId: string) => {
    onChange({ branches: branches.filter(b => b.localId !== localId) });
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
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Branches</h3>

      {branches.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)", border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)" }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <span className="fcw-body-s">No branches added</span>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={addBranch}><Plus size={14} /> Add Branch</button>
            </div>
          ) : (
            <span className="fcw-body-s">No branches displayed</span>
          )}
        </div>
      ) : (
        <div className="fcw-flex-col" style={{ gap: "1rem" }}>
          {branches.map(branch => (
            <div
              key={branch.localId}
              style={{
                backgroundColor: "var(--fcw-color-surface)",
                borderRadius: "var(--fcw-radius-md)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                padding: "1rem",
                position: "relative",
              }}
            >
              {editId === branch.localId ? (
                <div className="fcw-flex-col" style={{ gap: "0.5rem" }}>
                  <input autoFocus className="fcw-input" defaultValue={branch.name} placeholder="Branch name" style={{ height: 32, fontWeight: 600 }}
                    onBlur={e => { onChange({ branches: branches.map(b => b.localId === branch.localId ? { ...b, name: e.target.value } : b) }); setEditId(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { onChange({ branches: branches.map(b => b.localId === branch.localId ? { ...b, name: (e.target as HTMLInputElement).value } : b) }); setEditId(null); } if (e.key === "Escape") setEditId(null); }}
                  />
                  <input className="fcw-input" defaultValue={branch.address} placeholder="Address" style={{ height: 32, fontSize: "0.875rem" }}
                    onBlur={e => onChange({ branches: branches.map(b => b.localId === branch.localId ? { ...b, address: e.target.value } : b) })}
                  />
                  <input className="fcw-input" defaultValue={branch.city} placeholder="City" style={{ height: 32, fontSize: "0.875rem" }}
                    onBlur={e => onChange({ branches: branches.map(b => b.localId === branch.localId ? { ...b, city: e.target.value } : b) })}
                  />
                  <input className="fcw-input" defaultValue={branch.hours || ""} placeholder="Hours (e.g. Mon-Fri 9:00-18:00)" style={{ height: 32, fontSize: "0.875rem" }}
                    onBlur={e => onChange({ branches: branches.map(b => b.localId === branch.localId ? { ...b, hours: e.target.value } : b) })}
                  />
                </div>
              ) : (
                <div className="fcw-flex-col" style={{ gap: "0.25rem", cursor: isEditing ? "pointer" : "default" }} onClick={() => isEditing && setEditId(branch.localId)}>
                  <div className="fcw-body fcw-weight-semibold">{branch.name}</div>
                  {branch.address && (
                    <div className="fcw-body-s fcw-text-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <MapPin size={12} /> {branch.address}
                    </div>
                  )}
                  {branch.city && <div className="fcw-body-s fcw-text-tertiary">{branch.city}</div>}
                  {branch.hours && (
                    <div className="fcw-body-s fcw-text-secondary" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={12} /> {branch.hours}
                    </div>
                  )}
                </div>
              )}
              {isEditing && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  style={{ position: "absolute", top: 8, right: 8, color: "var(--fcw-color-error)" }}
                  onClick={() => removeBranch(branch.localId)}
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
              onClick={addBranch}
            >
              <Plus size={14} /> Add Branch
            </button>
          )}
        </div>
      )}
    </div>
  );
}
