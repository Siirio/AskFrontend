import { useState } from "react";
import { Plus, Trash2, Image } from "lucide-react";
import type { CardBlockConfig } from "../types";

interface Props {
  config: CardBlockConfig;
  isEditing: boolean;
  onChange: (patch: Partial<CardBlockConfig>) => void;
}

export function GalleryBlock({ config, isEditing, onChange }: Props) {
  const images = config.images || [];
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const addImage = () => {
    if (!urlValue.trim()) return;
    onChange({ images: [...images, urlValue.trim()] });
    setUrlValue("");
    setAddingUrl(false);
  };

  const removeImage = (index: number) => {
    onChange({ images: images.filter((_, i) => i !== index) });
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
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Gallery</h3>

      {images.length === 0 && !addingUrl ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)", border: "1px dashed var(--fcw-color-border)", borderRadius: "var(--fcw-radius-md)" }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <Image size={32} style={{ opacity: 0.3 }} />
              <span className="fcw-body-s">No photos yet</span>
              <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={() => setAddingUrl(true)}><Plus size={14} /> Add Photo</button>
            </div>
          ) : (
            <span className="fcw-body-s">No photos displayed</span>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
          {images.map((img, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: "var(--fcw-radius-md)",
                backgroundImage: `url(${img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: "var(--fcw-color-surface-tertiary)",
                position: "relative",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              }}
            >
              {isEditing && (
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  style={{ position: "absolute", top: 4, right: 4, color: "var(--fcw-color-error)", backgroundColor: "rgba(0,0,0,0.5)" }}
                  onClick={() => removeImage(i)}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {isEditing && (addingUrl ? (
            <div style={{
              aspectRatio: "1",
              borderRadius: "var(--fcw-radius-md)",
              border: "1px dashed var(--fcw-color-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
            }}>
              <input
                autoFocus
                className="fcw-input"
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                placeholder="Image URL"
                style={{ fontSize: "0.75rem", height: 32, width: "100%" }}
                onKeyDown={e => { if (e.key === "Enter") addImage(); if (e.key === "Escape") setAddingUrl(false); }}
              />
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ fontSize: "0.6875rem" }} onClick={addImage}>Add</button>
                <button className="fcw-btn fcw-btn-ghost fcw-btn-sm" style={{ fontSize: "0.6875rem" }} onClick={() => setAddingUrl(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              key="add-btn"
              className="fcw-btn fcw-btn-ghost fcw-btn-sm"
              style={{
                aspectRatio: "1",
                border: "1px dashed var(--fcw-color-border)",
                borderRadius: "var(--fcw-radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setAddingUrl(true)}
            >
              <Plus size={20} style={{ color: "var(--fcw-color-text-tertiary)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
