import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Copy, MoreHorizontal } from "lucide-react";
import type { CardBlockConfig, BlockShape, TextAlignment, FontFamily } from "./types";

interface Props {
  config: CardBlockConfig;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (patch: Partial<CardBlockConfig>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
}

const SHAPES: { value: BlockShape; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "rectangle", label: "Sharp" },
  { value: "full-width", label: "Full" },
];

const ALIGNMENTS: { value: TextAlignment; label: string }[] = [
  { value: "left", label: "\u2AE7" },
  { value: "center", label: "\u2AFF" },
  { value: "right", label: "\u2AE8" },
];

const FONTS: { value: FontFamily; label: string }[] = [
  { value: "inter", label: "Inter" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

export function BlockToolbar({ config, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onChange, onDelete, onDuplicate, onToggleHidden }: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: -44,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.375rem",
        borderRadius: "var(--fcw-radius-lg)",
        backgroundColor: "var(--fcw-color-surface)",
        border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
        boxShadow: "var(--fcw-shadow-lg)",
        whiteSpace: "nowrap",
      }}
      onClick={e => e.stopPropagation()}
    >
      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={onMoveUp} disabled={!canMoveUp} style={{ opacity: canMoveUp ? 1 : 0.3 }}>
        <ChevronUp size={14} />
      </button>
      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={onMoveDown} disabled={!canMoveDown} style={{ opacity: canMoveDown ? 1 : 0.3 }}>
        <ChevronDown size={14} />
      </button>

      <div style={{ width: 1, height: 20, backgroundColor: "var(--fcw-color-border)", flexShrink: 0 }} />

      {SHAPES.map(s => (
        <button
          key={s.value}
          className="fcw-btn fcw-btn-ghost fcw-btn-sm"
          style={{
            fontWeight: config.shape === s.value ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
            color: config.shape === s.value ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
            fontSize: "0.6875rem",
            padding: "0.25rem 0.5rem",
          }}
          onClick={() => onChange({ shape: s.value })}
        >
          {s.label}
        </button>
      ))}

      <div style={{ width: 1, height: 20, backgroundColor: "var(--fcw-color-border)", flexShrink: 0 }} />

      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "0.25rem", position: "relative" }}>
        <div style={{
          width: 20, height: 20, borderRadius: "var(--fcw-radius-sm)",
          backgroundColor: config.backgroundColor || "var(--fcw-color-surface-secondary)",
          border: "1px solid var(--fcw-color-border)",
        }} />
        <input
          type="color"
          value={config.backgroundColor || "#ffffff"}
          onChange={e => onChange({ backgroundColor: e.target.value })}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
      </label>

      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={onToggleHidden} title={config.hidden ? "Show" : "Hide"}>
        {config.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={onDuplicate} title="Duplicate">
        <Copy size={14} />
      </button>

      <button className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm" onClick={onDelete} title="Delete" style={{ color: "var(--fcw-color-error)" }}>
        <Trash2 size={14} />
      </button>

      <div style={{ width: 1, height: 20, backgroundColor: "var(--fcw-color-border)", flexShrink: 0 }} />

      <button
        className="fcw-btn fcw-btn-ghost fcw-btn-sm"
        style={{ gap: "0.25rem", fontSize: "0.6875rem" }}
        onClick={() => setShowMore(v => !v)}
      >
        <MoreHorizontal size={12} />
        More
      </button>

      {showMore && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "0.375rem",
            padding: "0.75rem",
            borderRadius: "var(--fcw-radius-lg)",
            backgroundColor: "var(--fcw-color-surface)",
            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
            boxShadow: "var(--fcw-shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            minWidth: 220,
            zIndex: 51,
            whiteSpace: "nowrap",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Text Color</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", position: "relative" }}>
              <div style={{
                width: 24, height: 24, borderRadius: "var(--fcw-radius-sm)",
                backgroundColor: config.textColor || "var(--fcw-color-text)",
                border: "1px solid var(--fcw-color-border)",
              }} />
              <input
                type="color"
                value={config.textColor || "#000000"}
                onChange={e => onChange({ textColor: e.target.value })}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
              />
              <span className="fcw-body-s fcw-text-secondary">Pick color</span>
            </label>
          </div>

          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Font</span>
            <div className="fcw-flex" style={{ gap: "0.25rem" }}>
              {FONTS.map(f => (
                <button
                  key={f.value}
                  className="fcw-btn fcw-btn-sm"
                  style={{
                    fontWeight: config.fontFamily === f.value ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                    color: config.fontFamily === f.value ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                    fontSize: "0.6875rem",
                    padding: "0.25rem 0.5rem",
                    background: config.fontFamily === f.value ? "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)" : "transparent",
                  }}
                  onClick={() => onChange({ fontFamily: f.value })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Alignment</span>
            <div className="fcw-flex" style={{ gap: "0.25rem" }}>
              {ALIGNMENTS.map(a => (
                <button
                  key={a.value}
                  className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                  style={{
                    fontWeight: config.alignment === a.value ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                    color: config.alignment === a.value ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                    fontSize: "0.875rem",
                    padding: "0.25rem 0.5rem",
                  }}
                  onClick={() => onChange({ alignment: a.value })}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
            <span className="fcw-label" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Height: {config.height || "auto"}
            </span>
            <input
              type="range"
              min={100}
              max={600}
              step={20}
              value={config.height || 200}
              onChange={e => onChange({ height: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
