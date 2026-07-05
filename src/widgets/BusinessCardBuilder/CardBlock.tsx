import { useState, useRef, useCallback } from "react";
import { GripVertical, Plus, ChevronUp, ChevronDown } from "lucide-react";
import type { CardBlock as CardBlockType, CardBlockConfig, CardBlockType as BlockType } from "./types";
import { HeroBlock } from "./blocks/HeroBlock";
import { DropsBlock } from "./blocks/DropsBlock";
import { BranchesBlock } from "./blocks/BranchesBlock";
import { ServicesBlock } from "./blocks/ServicesBlock";
import { ContactsBlock } from "./blocks/ContactsBlock";
import { GalleryBlock } from "./blocks/GalleryBlock";
import { AboutBlock } from "./blocks/AboutBlock";
import { BlockToolbar } from "./BlockToolbar";
import { AddBlockPopover } from "./AddBlockPopover";

interface Props {
  block: CardBlockType;
  isSelected: boolean;
  isEditing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CardBlockConfig>) => void;
  onResize: (patch: Partial<CardBlockConfig>) => void;
  onMove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddBlock: (type: BlockType, afterIndex: number) => void;
  index: number;
  total: number;
  onDragTo: (toIndex: number) => void;
}

const BLOCK_RENDERERS: Record<BlockType, React.ComponentType<{ config: CardBlockConfig; isEditing: boolean; onChange: (patch: Partial<CardBlockConfig>) => void }>> = {
  HERO: HeroBlock,
  DROPS: DropsBlock,
  BRANCHES: BranchesBlock,
  SERVICES: ServicesBlock,
  CONTACTS: ContactsBlock,
  GALLERY: GalleryBlock,
  ABOUT: AboutBlock,
};

export function CardBlock({ block, isSelected, isEditing, canMoveUp, canMoveDown, onSelect, onChange, onResize, onMoveUp, onMoveDown, onDelete, onDuplicate, onAddBlock, index, total, onDragTo }: Props) {
  const [showAddPopover, setShowAddPopover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState<"top"|"bottom"|null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const BlockComponent = BLOCK_RENDERERS[block.blockType];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOver(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = blockRef.current?.getBoundingClientRect();
    if (rect) {
      const mid = rect.top + rect.height / 2;
      setDragOver(e.clientY < mid ? "top" : "bottom");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(fromIndex) && fromIndex !== index) {
      const targetIndex = dragOver === "top" ? index : index + 1;
      onDragTo(fromIndex < targetIndex ? targetIndex - 1 : targetIndex);
    }
    setDragOver(null);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: "bottom"|"right"|"diagonal") => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startX = e.clientX;
    const startHeight = block.config.height || 0;
    const startWidth = block.config.width || 0;

    const onMouseMove = (me: MouseEvent) => {
      if (direction === "bottom") {
        const dy = me.clientY - startY;
        onResize({ height: Math.max(60, startHeight + dy) });
      } else if (direction === "right") {
        const dx = me.clientX - startX;
        onResize({ width: Math.max(200, startWidth + dx) });
      } else {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        onResize({ width: Math.max(200, startWidth + dx), height: Math.max(60, startHeight + dy) });
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [block.config.height, block.config.width, onResize]);

  if (block.config.hidden && !isEditing) {
    return null;
  }

  const height = block.config.height ? `${block.config.height}px` : undefined;

  return (
    <div
      ref={blockRef}
      draggable={isEditing && isSelected}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={isEditing ? handleDragOver : undefined}
      onDrop={isEditing ? handleDrop : undefined}
      style={{
        position: "relative",
        opacity: isDragging ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {dragOver === "top" && (
        <div style={{ height: 3, backgroundColor: "var(--fcw-color-primary)", borderRadius: 2, marginBottom: 2, transition: "all 0.15s" }} />
      )}

      <div
        onClick={onSelect}
        style={{
          position: "relative",
          borderRadius: "var(--fcw-radius-lg)",
          outline: isSelected && isEditing ? "2px solid var(--fcw-color-primary)" : undefined,
          outlineOffset: 2,
          opacity: block.config.hidden ? 0.4 : 1,
          transition: "outline 0.15s, opacity 0.2s",
          cursor: isEditing ? "grab" : "default",
          height,
          overflow: height ? "hidden" : undefined,
        }}
      >
        {isSelected && isEditing && (
          <>
            <div style={{
              position: "absolute", top: -34, left: 0, right: 0, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 2, zIndex: 10,
            }}>
              <BlockToolbar
                config={block.config}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onChange={onChange}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onToggleHidden={() => onChange({ hidden: !block.config.hidden })}
              />
            </div>

            {/* Drag handle */}
            <div style={{
              position: "absolute", left: -30, top: "50%", transform: "translateY(-50%)",
              color: "var(--fcw-color-text-tertiary)", cursor: "grab", zIndex: 5,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: 4,
            }}>
              <GripVertical size={14} />
            </div>

            {/* Resize handles */}
            <div
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 6,
                cursor: "ns-resize", zIndex: 5,
              }}
              onMouseDown={e => handleResizeStart(e, "bottom")}
            />
            <div
              style={{
                position: "absolute", top: 0, right: 0, bottom: 0, width: 6,
                cursor: "ew-resize", zIndex: 5,
              }}
              onMouseDown={e => handleResizeStart(e, "right")}
            />
            <div style={{
              position: "absolute", bottom: 0, right: 0, width: 14, height: 14,
              cursor: "nwse-resize", zIndex: 5,
              background: "linear-gradient(135deg, transparent 50%, var(--fcw-color-border) 50%, var(--fcw-color-border) 62%, transparent 62%)",
            }}
            onMouseDown={e => handleResizeStart(e, "diagonal")}
            />
          </>
        )}

        {block.config.hidden && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--fcw-color-surface-secondary)", borderRadius: "var(--fcw-radius-lg)", zIndex: 2,
          }}>
            <span className="fcw-body-s fcw-text-tertiary">Скрыто</span>
          </div>
        )}

        <BlockComponent config={block.config} isEditing={isEditing} onChange={onChange} />
      </div>

      {dragOver === "bottom" && (
        <div style={{ height: 3, backgroundColor: "var(--fcw-color-primary)", borderRadius: 2, marginTop: 2, transition: "all 0.15s" }} />
      )}
    </div>
  );
}
