import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Send, Monitor, Smartphone, Loader2, Check, Plus } from "lucide-react";
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

type DeviceView = "desktop" | "mobile";

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
  const [showAddPopover, setShowAddPopover] = useState(false);
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

  const renderPreview = () => (
    <div style={{
      position: "sticky",
      top: 80,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
    }}>
      {deviceView === "desktop" ? (
        <div style={{ width: "100%", maxWidth: 480, filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.32))" }}>
          <div style={{
            width: "100%", aspectRatio: "16 / 10",
            borderRadius: "8px 8px 0 0",
            background: "linear-gradient(135deg, #2c2c2e, #1c1c1e)",
            padding: "5px 6px 3px", border: "1px solid #3a3a3c", borderBottom: "none",
          }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
              <div style={{ flex: 1, height: 18, background: "#3a3a3c", borderRadius: 3, margin: "0 4px" }} />
            </div>
          </div>
          <div style={{
            background: "#1c1c1e", borderRadius: "0 0 8px 8px",
            border: "1px solid #3a3a3c", borderTop: "none", padding: "0 3px 5px",
          }}>
            <div style={{
              backgroundColor: "var(--fcw-color-surface)", borderRadius: 3, overflow: "hidden",
              aspectRatio: "16 / 9.35", display: "flex", flexDirection: "column",
            }}>
              <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1 }}>
                <div className="fcw-flex-col" style={{ gap: "0.15rem" }}>
                  {blocks.map(block => (
                    <CardBlock
                      key={block.localId}
                      block={block}
                      isSelected={false}
                      isEditing={false}
                      canMoveUp={false}
                      canMoveDown={false}
                      onSelect={() => {}}
                      onChange={() => {}}
                      onResize={() => {}}
                      onMove={() => {}}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                      onDelete={() => {}}
                      onDuplicate={() => {}}
                      onAddBlock={() => {}}
                      index={0}
                      total={blocks.length}
                      onDragTo={() => {}}
                    />
                  ))}
                  {blocks.length === 0 && (
                    <div style={{ padding: "2rem", textAlign: "center", opacity: 0.3 }}>
                      <Smartphone size={32} style={{ marginBottom: "0.5rem" }} />
                      <p className="fcw-body-s">Предпросмотр</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ width: 240, filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.35))" }}>
          <div style={{
            width: "100%", aspectRatio: "1 / 2", borderRadius: 28,
            background: "linear-gradient(135deg, #2c2c2e, #1c1c1e)",
            padding: 6, border: "2px solid #3a3a3c", position: "relative",
          }}>
            <div style={{
              position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)",
              width: "30%", height: 14, borderRadius: "0 0 10px 10px",
              background: "#030303", zIndex: 2,
            }} />
            <div style={{
              backgroundColor: "var(--fcw-color-surface)", borderRadius: 22,
              height: "100%", overflow: "hidden", display: "flex", flexDirection: "column",
            }}>
              <div style={{ padding: "2.25rem 0.5rem 1rem", overflowY: "auto", flex: 1 }}>
                <div className="fcw-flex-col" style={{ gap: "0.1rem" }}>
                  {blocks.map(block => (
                    <CardBlock
                      key={block.localId}
                      block={block}
                      isSelected={false}
                      isEditing={false}
                      canMoveUp={false}
                      canMoveDown={false}
                      onSelect={() => {}}
                      onChange={() => {}}
                      onResize={() => {}}
                      onMove={() => {}}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                      onDelete={() => {}}
                      onDuplicate={() => {}}
                      onAddBlock={() => {}}
                      index={0}
                      total={blocks.length}
                      onDragTo={() => {}}
                    />
                  ))}
                  {blocks.length === 0 && (
                    <div style={{ padding: "2rem", textAlign: "center", opacity: 0.3 }}>
                      <Smartphone size={24} style={{ marginBottom: "0.5rem" }} />
                      <p className="fcw-body-s">Предпросмотр</p>
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                height: 3, width: 60, background: "#3a3a3c",
                borderRadius: 2, margin: "0 auto 6px", flexShrink: 0,
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-md)" }}>
      {/* Header: device toggle + actions */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fcw-flex-between fcw-flex-wrap"
        style={{ gap: "1rem" }}
      >
        <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
          {([
            { key: "desktop" as DeviceView, icon: <Monitor size={14} />, label: "Десктоп" },
            { key: "mobile" as DeviceView, icon: <Smartphone size={14} />, label: "Телефон" },
          ]).map(opt => (
            <button
              key={opt.key}
              className={`fcw-btn fcw-btn-sm ${deviceView === opt.key ? "fcw-glassmorph-selected-seg" : ""}`}
              style={{
                background: deviceView === opt.key ? undefined : "transparent",
                color: deviceView === opt.key ? "var(--fcw-color-primary)" : "var(--fcw-color-text-secondary)",
                fontWeight: deviceView === opt.key ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
                border: "none", boxShadow: "none",
                gap: "0.375rem", padding: "0.375rem 0.75rem",
              }}
              onClick={() => setDeviceView(opt.key)}
            >
              {opt.icon}
              <span className="fcw-hidden-mobile">{opt.label}</span>
            </button>
          ))}
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

      {/* Main: left=edit, right=preview */}
      <div style={{ display: "flex", gap: "var(--fcw-space-lg)", alignItems: "flex-start" }}>
        {/* Edit area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing && blocks.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <button className="fcw-btn fcw-btn-primary" onClick={() => setShowAddPopover(true)}>
                <Plus size={16} /> Добавить блок
              </button>
              {showAddPopover && (
                <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "center" }}>
                  <AddBlockPopover
                    onSelect={type => { handleAddBlock(type, -1); setShowAddPopover(false); }}
                    onClose={() => setShowAddPopover(false)}
                  />
                </div>
              )}
            </div>
          )}

          {blocks.length === 0 && !isEditing && (
            <div style={{ padding: "2rem", textAlign: "center", opacity: 0.4 }}>
              <p className="fcw-body">Блоки не добавлены</p>
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
              onMove={() => {}}
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
            <div style={{ position: "relative", height: 32, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "0.25rem" }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "var(--fcw-color-border)" }} />
              <button
                className="fcw-btn fcw-btn-ghost fcw-btn-sm fcw-btn-icon"
                style={{ position: "relative", zIndex: 1, borderRadius: "50%", width: 32, height: 32 }}
                onClick={() => setShowAddPopover(v => !v)}
              >
                <Plus size={16} />
              </button>
              {showAddPopover && (
                <AddBlockPopover
                  onSelect={type => { handleAddBlock(type, blocks.length - 1); setShowAddPopover(false); }}
                  onClose={() => setShowAddPopover(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* Preview sidebar */}
        <div className="fcw-hidden-mobile" style={{ width: 280, flexShrink: 0 }}>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
