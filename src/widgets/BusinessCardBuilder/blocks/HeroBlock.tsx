import { useState } from "react";
import { Image, Type } from "lucide-react";
import type { CardBlockConfig } from "../types";

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function HeroBlock({ config, isEditing, onChange }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);

  const layout = config.heroLayout || "centered";
  const isSplit = layout === "split";
  const hasImage = Boolean(config.heroImage);

  const startEdit = (field: string) => {
    if (isEditing) setEditingField(field);
  };

  const commitEdit = (field: string, value: string) => {
    onChange({ [field]: value });
    setEditingField(null);
  };

  const bgStyle = config.heroImage
    ? { backgroundImage: `url(${config.heroImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : { backgroundColor: config.backgroundColor || "var(--fcw-color-surface-secondary)" };

  const content = (
    <div
      style={{
        padding: layout === "centered" ? "3rem 1.5rem" : "2rem 1.5rem",
        display: "flex",
        flexDirection: layout === "split" ? "row" as const : "column" as const,
        alignItems: layout === "centered" ? "center" : layout === "left" ? "flex-start" : layout === "split" ? "center" : "flex-start",
        justifyContent: layout === "centered" ? "center" : "flex-start",
        textAlign: layout === "centered" ? "center" : "left",
        gap: "1.5rem",
        minHeight: config.height || 240,
        borderRadius: layout === "split" ? "var(--fcw-radius-lg)" : undefined,
        color: config.textColor || "var(--fcw-color-text)",
        fontFamily: config.fontFamily === "serif" ? "Georgia, serif" : config.fontFamily === "mono" ? "'JetBrains Mono', monospace" : "inherit",
      }}
    >
      {isSplit && (
        <div
          style={{
            flex: "0 0 45%",
            height: 200,
            backgroundColor: "var(--fcw-color-surface-tertiary)",
            borderRadius: "var(--fcw-radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: config.heroImage ? `url(${config.heroImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!hasImage && <Image size={40} style={{ color: "var(--fcw-color-text-tertiary)", opacity: 0.4 }} />}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: layout === "centered" ? "center" : "flex-start" }}>
        {editingField === "heroTitle" ? (
          <input
            autoFocus
            className="fcw-input"
            defaultValue={config.heroTitle || ""}
            placeholder="Enter title"
            style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: layout === "centered" ? "center" : "left", maxWidth: 500 }}
            onBlur={e => commitEdit("heroTitle", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitEdit("heroTitle", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingField(null); }}
          />
        ) : (
          <div
            style={{ fontSize: "1.5rem", fontWeight: 700, cursor: isEditing ? "text" : "default", minWidth: 80 }}
            onClick={() => startEdit("heroTitle")}
          >
            {config.heroTitle || <span style={{ color: "var(--fcw-color-text-tertiary)", opacity: 0.5, fontSize: "1rem" }}>Click to add title</span>}
          </div>
        )}

        {editingField === "heroSubtitle" ? (
          <input
            autoFocus
            className="fcw-input"
            defaultValue={config.heroSubtitle || ""}
            placeholder="Enter subtitle"
            style={{ fontSize: "1rem", textAlign: layout === "centered" ? "center" : "left", maxWidth: 400 }}
            onBlur={e => commitEdit("heroSubtitle", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitEdit("heroSubtitle", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingField(null); }}
          />
        ) : (
          <div
            style={{ fontSize: "1rem", color: "var(--fcw-color-text-secondary)", cursor: isEditing ? "text" : "default", minWidth: 80 }}
            onClick={() => startEdit("heroSubtitle")}
          >
            {config.heroSubtitle || <span style={{ color: "var(--fcw-color-text-tertiary)", opacity: 0.5, fontSize: "0.875rem" }}>Click to add subtitle</span>}
          </div>
        )}

        {(config.heroCtaText || isEditing) && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "var(--fcw-radius-full)",
              backgroundColor: "var(--fcw-color-primary)",
              color: "var(--fcw-color-primary-text)",
              fontWeight: 600,
              fontSize: "0.875rem",
              display: "inline-flex",
              cursor: isEditing ? "text" : "default",
            }}
            onClick={() => isEditing && startEdit("heroCtaText")}
          >
            {editingField === "heroCtaText" ? (
              <input
                autoFocus
                style={{ background: "transparent", border: "none", color: "inherit", fontWeight: 600, fontSize: "0.875rem", outline: "none", textAlign: "center" }}
                defaultValue={config.heroCtaText || ""}
                placeholder="Button text"
                onBlur={e => commitEdit("heroCtaText", e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit("heroCtaText", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingField(null); }}
              />
            ) : (
              config.heroCtaText || "Add CTA text"
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        ...bgStyle,
        borderRadius: layout !== "split" ? "var(--fcw-radius-lg)" : undefined,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {!hasImage && !config.backgroundColor && isEditing && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: "0.375rem",
            zIndex: 5,
          }}
        >
          <button
            className="fcw-btn fcw-btn-ghost fcw-btn-sm"
            style={{ fontSize: "0.6875rem", gap: "0.25rem" }}
            onClick={() => startEdit("heroImage")}
          >
            <Image size={12} /> Add image
          </button>
        </div>
      )}
      {isEditing && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            gap: "0.25rem",
            zIndex: 5,
          }}
        >
          {(["centered", "left", "split"] as const).map(lo => (
            <button
              key={lo}
              className="fcw-btn fcw-btn-sm"
              style={{
                fontSize: "0.625rem",
                padding: "0.125rem 0.5rem",
                background: layout === lo ? "var(--fcw-color-primary)" : "var(--fcw-color-surface)",
                color: layout === lo ? "var(--fcw-color-primary-text)" : "var(--fcw-color-text-secondary)",
                border: layout === lo ? "none" : "1px solid var(--fcw-color-border)",
                borderRadius: "var(--fcw-radius-full)",
              }}
              onClick={() => onChange({ heroLayout: lo })}
            >
              {lo === "centered" ? "Center" : lo === "left" ? "Left" : "Split"}
            </button>
          ))}
        </div>
      )}
      {editingField === "heroImage" && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: "0.375rem", zIndex: 10 }}>
          <input
            autoFocus
            className="fcw-input"
            style={{ width: 200, fontSize: "0.75rem", height: 32 }}
            defaultValue={config.heroImage || ""}
            placeholder="Image URL"
            onBlur={e => commitEdit("heroImage", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitEdit("heroImage", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingField(null); }}
          />
        </div>
      )}
      {content}
    </div>
  );
}
