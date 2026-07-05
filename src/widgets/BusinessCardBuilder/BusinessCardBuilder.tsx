import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Send, Monitor, Smartphone, Layout, Loader2, Check, Plus } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { CardBlock } from "./CardBlock";
import { AddBlockPopover } from "./AddBlockPopover";
import type { CardBlock as CardBlockType, CardBlockConfig, CardBlockType as BlockType } from "./types";

interface Props {
  blocks: CardBlockType[];
  businessId: string;
  brandColor: string;
  onSave: (blocks: CardBlockType[]) => Promise<void>;
  onPublish: () => Promise<void>;
  busy: boolean;
  readOnly: boolean;
}

type DeviceView = "desktop" | "mobile" | "both";

function detectIsMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function createBlock(type: BlockType, order: number): CardBlockType {
  return {
    localId: crypto.randomUUID(),
    blockType: type,
    displayOrder: order,
    config: {},
  };
}

export function BusinessCardBuilder({ blocks: initialBlocks, onSave, onPublish, busy, readOnly }: Props) {
  const { reduced } = useMotion();
  const [blocks, setBlocks] = useState<CardBlockType[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<DeviceView>(() => detectIsMobile() ? "mobile" : "desktop");
  const [showAddFirst, setShowAddFirst] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const isEditing = !readOnly;

  useEffect(() => { setBlocks(initialBlocks); }, [initialBlocks]);

  const handleAddBlock = useCallback((type: BlockType, afterIndex: number) => {
    const newBlock = createBlock(type, afterIndex + 1);
    setBlocks(prev => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newBlock);
      return updated.map((b, i) => ({ ...b, displayOrder: i }));
    });
    setSelectedId(newBlock.localId);
  }, []);

  const handleChangeBlock = useCallback((localId: string, patch: Partial<CardBlockConfig>) => {
    setBlocks(prev => prev.map(b => b.localId === localId ? { ...b, config: { ...b.config, ...patch } } : b));
  }, []);

  const handleMoveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setBlocks(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((b, i) => ({ ...b, displayOrder: i }));
    });
  }, []);

  const handleResizeBlock = useCallback((localId: string, patch: Partial<CardBlockConfig>) => {
    setBlocks(prev => prev.map(b => b.localId === localId ? { ...b, config: { ...b.config, ...patch } } : b));
  }, []);

  const handleDelete = useCallback((localId: string) => {
    setBlocks(prev => {
      const updated = prev.filter(b => b.localId !== localId);
      return updated.map((b, i) => ({ ...b, displayOrder: i }));
    });
    if (selectedId === localId) setSelectedId(null);
  }, [selectedId]);

  const handleDuplicate = useCallback((block: CardBlockType) => {
    const dup: CardBlockType = {
      ...block,
      localId: crypto.randomUUID(),
      config: { ...block.config },
    };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.localId === block.localId);
      const updated = [...prev];
      updated.splice(idx + 1, 0, dup);
      return updated.map((b, i) => ({ ...b, displayOrder: i }));
    });
    setSelectedId(dup.localId);
  }, []);

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await onSave(blocks);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  };

  const showDesktop = deviceView === "desktop" || deviceView === "both";
  const showMobile = deviceView === "mobile" || deviceView === "both";

  const renderBlocks = () => (
    <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
      {isEditing && blocks.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <p className="fcw-body fcw-text-secondary" style={{ marginBottom: "1rem" }}>Начните создавать визитку</p>
          <button className="fcw-btn fcw-btn-primary" onClick={() => setShowAddFirst(true)}>
            <Plus size={16} /> Добавить первый блок
          </button>
        </div>
      )}

      {blocks.length === 0 && !isEditing && (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--fcw-color-text-tertiary)" }}>
          <Layout size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
          <p className="fcw-body">Визитка пока пуста</p>
        </div>
      )}

      {blocks.map((block, index) => (
        <CardBlock
          key={block.localId}
          block={block}
          isSelected={selectedId === block.localId}
          isEditing={isEditing}
          canMoveUp={index > 0}
          canMoveDown={index < blocks.length - 1}
          onSelect={() => setSelectedId(isEditing ? block.localId : null)}
          onChange={patch => handleChangeBlock(block.localId, patch)}
          onResize={patch => handleResizeBlock(block.localId, patch)}
          onMove={() => {}} // handled by drag-and-drop
          onMoveUp={() => handleMoveBlock(index, index - 1)}
          onMoveDown={() => handleMoveBlock(index, index + 1)}
          onDelete={() => handleDelete(block.localId)}
          onDuplicate={() => handleDuplicate(block)}
          onAddBlock={handleAddBlock}
          index={index}
          total={blocks.length}
          onDragTo={toIndex => handleMoveBlock(index, toIndex)}
        />
      ))}

      {isEditing && blocks.length > 0 && (
        <div style={{ position: "relative", height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "var(--fcw-color-border)" }} />
          <button
            className="fcw-btn fcw-btn-ghost fcw-btn-sm fcw-btn-icon"
            style={{ position: "relative", zIndex: 1, borderRadius: "50%", width: 28, height: 28 }}
            onClick={() => setShowAddFirst(v => !v)}
          >
            <Plus size={16} />
          </button>
          {showAddFirst && (
            <AddBlockPopover
              onSelect={type => { handleAddBlock(type, blocks.length - 1); setShowAddFirst(false); }}
              onClose={() => setShowAddFirst(false)}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fcw-flex-between fcw-flex-wrap"
        style={{ gap: "1rem" }}
      >
        <div className="fcw-flex fcw-items-center" style={{ gap: "1rem" }}>
          <h2 className="fcw-h2" style={{ margin: 0 }}>Визитка</h2>

          <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
            {([
              { key: "desktop" as DeviceView, icon: <Monitor size={14} />, label: "Десктоп" },
              { key: "mobile" as DeviceView, icon: <Smartphone size={14} />, label: "Телефон" },
              { key: "both" as DeviceView, icon: <span style={{ display: "inline-flex", gap: 1 }}><Monitor size={12} /><Smartphone size={12} /></span>, label: "Оба" },
            ]).map(opt => (
              <button
                key={opt.key}
                className={`fcw-btn fcw-btn-sm ${deviceView === opt.key ? "fcw-glassmorph-selected-seg" : ""}`}
                style={{
                  background: deviceView === opt.key ? undefined : "transparent",
                  color: deviceView === opt.key ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                  fontWeight: deviceView === opt.key ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                  border: "none",
                  boxShadow: "none",
                  gap: "0.375rem",
                  padding: "0.375rem 0.75rem",
                }}
                onClick={() => setDeviceView(opt.key)}
              >
                {opt.icon}
                <span className="fcw-hidden-mobile">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!readOnly && (
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={handleSave} disabled={busy || saveState === "saving"}>
              {saveState === "saving" ? <Loader2 className="fcw-animate-spin" size={14} /> : saveState === "saved" ? <Check size={14} /> : <Save size={14} />}
              {saveState === "saving" ? "Сохраняю..." : saveState === "saved" ? "Сохранено" : saveState === "error" ? "Ошибка" : "Сохранить"}
            </button>
            <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={onPublish} disabled={busy}>
              <Send size={14} /> Опубликовать
            </button>
          </div>
        )}
      </motion.div>

      <div style={{
        display: "flex",
        gap: showDesktop && showMobile ? "var(--fcw-space-lg)" : "0",
        alignItems: "flex-start",
        justifyContent: "center",
      }}>
        {showDesktop && (
          <div style={{
            flex: showMobile ? 3 : 1,
            maxWidth: showMobile ? undefined : 900,
            backgroundColor: "var(--fcw-color-surface)",
            borderRadius: "var(--fcw-radius-lg)",
            border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
            padding: "1.5rem",
            minHeight: 400,
          }}>
            <div className="fcw-label fcw-text-tertiary" style={{ marginBottom: "0.75rem", textAlign: "center" }}>Десктоп</div>
            {renderBlocks()}
          </div>
        )}

        {showMobile && (
          <div style={{
            flex: showDesktop ? 2 : "none",
            width: showDesktop ? undefined : 375,
            maxWidth: 375,
          }}>
            <div className="fcw-label fcw-text-tertiary" style={{ marginBottom: "0.75rem", textAlign: "center" }}>Телефон</div>
            <div style={{
              backgroundColor: "var(--fcw-color-surface)",
              borderRadius: "2rem",
              border: "2px solid var(--fcw-color-border)",
              padding: "1.5rem 1rem",
              minHeight: 500,
              maxHeight: 700,
              overflowY: "auto",
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 80,
                height: 6,
                borderRadius: 3,
                backgroundColor: "var(--fcw-color-border)",
              }} />
              <div style={{ marginTop: 8 }}>
                {renderBlocks()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
