import { useState } from "react";
import type { CardBlockConfig } from "../types";

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function AboutBlock({ config, isEditing, onChange }: Props) {
  const [editingField, setEditingField] = useState<"title" | "text" | null>(null);

  const startEdit = (field: "title" | "text") => {
    if (isEditing) setEditingField(field);
  };

  const commitEdit = (field: string, value: string) => {
    onChange({ [field]: value });
    setEditingField(null);
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
        minHeight: config.height || undefined,
      }}
    >
      {editingField === "title" ? (
        <input
          autoFocus
          className="fcw-input"
          defaultValue={config.aboutTitle || ""}
          placeholder="Section title"
          style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", height: 36 }}
          onBlur={e => commitEdit("aboutTitle", e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commitEdit("aboutTitle", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingField(null); }}
        />
      ) : (
        <h3
          style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.75rem 0", cursor: isEditing ? "text" : "default", minHeight: 24 }}
          onClick={() => startEdit("title")}
        >
          {config.aboutTitle || (isEditing ? <span style={{ color: "var(--fcw-color-text-tertiary)", opacity: 0.5, fontSize: "0.875rem" }}>Add title</span> : "About")}
        </h3>
      )}

      {editingField === "text" ? (
        <textarea
          autoFocus
          className="fcw-input"
          defaultValue={config.aboutText || ""}
          placeholder="Write about the brand..."
          style={{ fontSize: "0.875rem", minHeight: 100, width: "100%", resize: "vertical", lineHeight: 1.6 }}
          onBlur={e => commitEdit("aboutText", e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") { commitEdit("aboutText", (e.target as HTMLTextAreaElement).value); } }}
        />
      ) : (
        <div
          style={{
            fontSize: "0.875rem",
            color: config.aboutText ? "var(--fcw-color-text-secondary)" : "var(--fcw-color-text-tertiary)",
            lineHeight: 1.6,
            cursor: isEditing ? "text" : "default",
            minHeight: 40,
            opacity: config.aboutText ? 1 : 0.5,
          }}
          onClick={() => startEdit("text")}
        >
          {config.aboutText || (isEditing ? "Click to add description" : "Brand description will appear here")}
        </div>
      )}
    </div>
  );
}
