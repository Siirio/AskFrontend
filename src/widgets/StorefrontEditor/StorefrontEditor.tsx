import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Eye, Trash2, GripVertical, Check,
  Layout, Package, Sparkles, Info, MapPin, Phone, HelpCircle, Tag, Star,
  Image, Type, ShoppingBag, Palette,
} from "lucide-react";
import { Card } from "../../shared/ui/Card/Card";
import { EmptyState } from "../../shared/ui/EmptyState/EmptyState";
import type { StorefrontBlockDto } from "../../shared/api/dto";

const BLOCKS: { type: string; icon: React.ReactNode; label: string; desc: string }[] = [
  { type: "HERO", icon: <Image size={18} />, label: "Hero", desc: "Main banner with headline + media" },
  { type: "PRODUCTS", icon: <ShoppingBag size={18} />, label: "Products", desc: "Product grid from your catalog" },
  { type: "DROPS", icon: <Sparkles size={18} />, label: "Drops", desc: "Active drops & events" },
  { type: "ABOUT", icon: <Info size={18} />, label: "About", desc: "Brand story & description" },
  { type: "BRANCHES", icon: <MapPin size={18} />, label: "Branches", desc: "Pickup locations" },
  { type: "CONTACTS", icon: <Phone size={18} />, label: "Contacts", desc: "Phone, email, social links" },
  { type: "FAQ", icon: <HelpCircle size={18} />, label: "FAQ", desc: "Frequently asked questions" },
  { type: "PROMO", icon: <Tag size={18} />, label: "Promo", desc: "Promotional banner or offer" },
  { type: "WHY_THIS_MATCHES", icon: <Star size={18} />, label: "Why Matches", desc: "Intent matching reasons" },
];

const BLOCK_PREVIEWS: Record<string, { bg: string; content: string }> = {
  HERO: { bg: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)", content: "Hero Banner" },
  PRODUCTS: { bg: "var(--fcw-color-surface-secondary)", content: "Product Grid" },
  DROPS: { bg: "linear-gradient(135deg, #f59e0b22 0%, #e8824e22 100%)", content: "Active Drops" },
  ABOUT: { bg: "var(--fcw-color-surface-secondary)", content: "Brand Story" },
  BRANCHES: { bg: "var(--fcw-color-surface-tertiary)", content: "Branches Map" },
  CONTACTS: { bg: "var(--fcw-color-surface-secondary)", content: "Contact Info" },
  FAQ: { bg: "var(--fcw-color-surface-tertiary)", content: "Q&A Section" },
  PROMO: { bg: "linear-gradient(135deg, #e8824e44 0%, #f59e0b22 100%)", content: "Promo Banner" },
  WHY_THIS_MATCHES: { bg: "var(--fcw-color-surface-secondary)", content: "Match Reasons" },
};

interface StorefrontEditorProps {
  blocks: StorefrontBlockDto[];
  brandColor: string;
  onColorChange: (color: string) => void;
  onSave: (blocks: StorefrontBlockDto[]) => Promise<void>;
  onPublish: () => Promise<void>;
  busy: boolean;
  readOnly?: boolean;
}

export function StorefrontEditor({ blocks: initialBlocks, brandColor, onColorChange, onSave, onPublish, busy, readOnly }: StorefrontEditorProps) {
  const [added, setAdded] = useState<{ localId: string; blockType: string; displayOrder: number }[]>(
    () => initialBlocks.map((b, i) => ({ localId: b.blockId || `b-${i}`, blockType: b.blockType, displayOrder: b.displayOrder ?? i + 1 })),
  );
  const [notice, setNotice] = useState("");

  const addBlock = (type: string) => {
    setAdded(prev => [...prev, { localId: `b-${crypto.randomUUID()}`, blockType: type, displayOrder: prev.length + 1 }]);
  };

  const removeBlock = (localId: string) => {
    setAdded(prev => prev.filter(b => b.localId !== localId));
  };

  const moveBlock = (localId: string, direction: "up" | "down") => {
    setAdded(prev => {
      const idx = prev.findIndex(b => b.localId === localId);
      if (idx < 0) return prev;
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((b, i) => ({ ...b, displayOrder: i + 1 }));
    });
  };

  const handleSave = async () => {
    const mapped: StorefrontBlockDto[] = added.map(b => ({
      blockType: b.blockType,
      displayOrder: b.displayOrder,
      config: {},
      enabled: true,
    }));
    try {
      await onSave(mapped);
      setNotice("Draft saved.");
    } catch {
      setNotice("");
    }
  };

  const handlePublish = async () => {
    try {
      await onPublish();
      setNotice("Storefront published.");
    } catch {
      setNotice("");
    }
  };

  return (
    <div>
      {/* Color picker */}
      <Card padding="md" style={{ marginBottom: "var(--fcw-space-md)" }}>
        <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
          <Palette size={16} style={{ color: "var(--fcw-color-text-secondary)" }} />
          <span className="fcw-body-s fcw-text-secondary" style={{ flex: 1 }}>Brand accent color</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: brandColor, border: "2px solid var(--fcw-color-border)",
              }}
            />
            <input
              type="color"
              className="fcw-input"
              style={{ height: "36px", width: "48px", padding: "2px", cursor: "pointer" }}
              value={brandColor}
              onChange={e => onColorChange(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--fcw-space-lg)", alignItems: "start" }}>
        {/* Left: Canvas editor */}
        <div>
          <div className="fcw-flex fcw-flex-wrap fcw-items-center" style={{ gap: "0.5rem", marginBottom: "var(--fcw-space-md)" }}>
            <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={handleSave} disabled={busy || readOnly}>
              <Check size={14} /> Save Draft
            </button>
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handlePublish} disabled={busy || readOnly}>
              <Eye size={14} /> Publish
            </button>
          </div>

          {notice && <p className="fcw-body-s" style={{ color: "var(--fcw-color-accent)", margin: "0 0 0.75rem 0" }}>{notice}</p>}

          {/* Block palette */}
          <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)", marginBottom: "var(--fcw-space-md)" }}>
            <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0 }}>Available blocks — click to add</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.375rem" }}>
              {BLOCKS.filter(bt => !added.find(a => a.blockType === bt.type)).map(bt => (
                <button
                  key={bt.type}
                  className="fcw-btn fcw-btn-ghost fcw-btn-sm"
                  style={{
                    justifyContent: "flex-start", gap: "0.5rem",
                    border: "1px dashed var(--fcw-color-border)",
                    borderRadius: "var(--fcw-radius-md)",
                    padding: "0.5rem 0.75rem",
                  }}
                  onClick={() => addBlock(bt.type)}
                  disabled={readOnly}
                  title={bt.desc}
                >
                  {bt.icon}
                  <span className="fcw-body-s">{bt.label}</span>
                  <Plus size={12} style={{ marginLeft: "auto", color: "var(--fcw-color-primary)" }} />
                </button>
              ))}
            </div>
          </div>

          {/* Canvas: added blocks */}
          {added.length === 0 ? (
            <EmptyState
              title="Empty Canvas"
              description="Add blocks above to build your storefront"
              icon={<Layout size={36} style={{ color: "var(--fcw-color-text-tertiary)" }} />}
            />
          ) : (
            <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-sm)" }}>
              {added.map((block, idx) => {
                const bt = BLOCKS.find(b => b.type === block.blockType);
                const preview = BLOCK_PREVIEWS[block.blockType] || BLOCK_PREVIEWS.HERO;
                return (
                  <Card key={block.localId} padding="md">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        <button
                          className="fcw-btn fcw-btn-ghost fcw-btn-icon"
                          style={{ padding: 2 }}
                          onClick={() => moveBlock(block.localId, "up")}
                          disabled={idx === 0 || readOnly}
                          aria-label="Move up"
                        >
                          <GripVertical size={14} style={{ color: "var(--fcw-color-text-tertiary)" }} />
                        </button>
                      </div>
                      {bt?.icon}
                      <span className="fcw-body-s fcw-weight-medium" style={{ flex: 1 }}>{bt?.label || block.blockType}</span>
                      <span className="fcw-body-s fcw-text-tertiary" style={{ fontSize: "0.6875rem" }}>#{block.displayOrder}</span>
                      <button
                        className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                        style={{ color: "var(--fcw-color-error)" }}
                        onClick={() => removeBlock(block.localId)}
                        disabled={readOnly}
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div
                      style={{
                        height: 80, borderRadius: "var(--fcw-radius-md)",
                        background: preview.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                        opacity: 0.7,
                      }}
                    >
                      <span className="fcw-body-s fcw-text-tertiary">{preview.content}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live preview */}
        <Card padding="lg" style={{ position: "sticky", top: "72px" }}>
          <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "0 0 0.75rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Eye size={16} /> Preview
          </h3>
          <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0 0 1rem 0" }}>
            How customers see your storefront in search results
          </p>

          {/* Mini storefront preview */}
          <div
            style={{
              borderRadius: "var(--fcw-radius-lg)",
              border: "2px solid var(--fcw-color-border)",
              overflow: "hidden",
              backgroundColor: "var(--fcw-color-surface)",
            }}
          >
            {/* Header bar with brand color */}
            <div style={{ height: 6, backgroundColor: brandColor }} />

            <div style={{ padding: "0.75rem" }}>
              {/* Brand header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    backgroundColor: brandColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "14px", fontWeight: 700,
                  }}
                >
                  B
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--fcw-color-text)" }}>Your Brand</div>
                  <div style={{ fontSize: "11px", color: "var(--fcw-color-text-tertiary)" }}>Storefront</div>
                </div>
              </div>

              {/* Mini blocks */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {added.length === 0 ? (
                  <div
                    style={{
                      padding: "0.75rem", textAlign: "center",
                      color: "var(--fcw-color-text-tertiary)", fontSize: "11px",
                      border: "1px dashed var(--fcw-color-border)",
                      borderRadius: "var(--fcw-radius-sm)",
                    }}
                  >
                    Add blocks to see preview
                  </div>
                ) : (
                  added.map(block => {
                    const bt = BLOCKS.find(b => b.type === block.blockType);
                    return (
                      <div
                        key={block.localId}
                        style={{
                          padding: "0.375rem 0.5rem",
                          fontSize: "10px",
                          color: "var(--fcw-color-text-secondary)",
                          backgroundColor: "var(--fcw-color-surface-secondary)",
                          borderRadius: "var(--fcw-radius-sm)",
                          display: "flex", alignItems: "center", gap: "0.375rem",
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: brandColor, flexShrink: 0 }} />
                        {bt?.label || block.blockType}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <p className="fcw-body-s fcw-text-tertiary" style={{ margin: "0.75rem 0 0 0", textAlign: "center" }}>
            Blocks appear in display order · Drag to reorder
          </p>
        </Card>
      </div>
    </div>
  );
}
