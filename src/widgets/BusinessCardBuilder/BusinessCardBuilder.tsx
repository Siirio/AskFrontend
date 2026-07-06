import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Send, Plus, Eye, EyeOff, Trash2, Copy,
  Smartphone, Monitor, Loader2, Check, Type, Image, Square, MousePointer2, Images,
  ChevronRight, EyeOffIcon,
} from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import type {
  CanvasSection, CanvasElement, ElementType,
  FontFamily, TextAlignment, ShapeType, ImageFit, GalleryLayout, ElementConfig,
} from "./types";
import { createSection, createElement, FONT_FAMILIES, FONT_SIZES } from "./types";

// ── Types ──

interface Props {
  blocks: any[];
  businessId: string;
  brandColor: string;
  onSave: (blocks: any[]) => Promise<void>;
  onPublish: () => Promise<void>;
  busy: boolean;
  readOnly: boolean;
}

type DeviceView = "desktop" | "mobile";
type SaveState = "idle" | "saving" | "saved" | "error";

interface CtxItem {
  key: string;
  label?: string;
  icon?: ReactNode;
  action?: () => void;
  children?: CtxItem[];
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

interface CtxMenuState {
  x: number;
  y: number;
  items: CtxItem[];
  parentBounds?: { left: number; top: number; width: number };
}

interface PromptState {
  message: string;
  value: string;
  inputType: "text" | "color" | "range" | "confirm";
  rangeMin?: number;
  rangeMax?: number;
  rangeStep?: number;
  onSubmit: (value: string) => void;
}

// ── Helpers ──

function detectIsMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function blocksToSections(blocks: any[]): CanvasSection[] {
  if (blocks.length === 0) return [];
  const section = createSection(1);
  section.name = "Main Section";
  section.height = 600;
  section.elements = blocks.map((b, i) => {
    const cfg = b.config || {};
    const elType: ElementType =
      b.blockType === "GALLERY" ? "GALLERY" :
      b.blockType === "HERO" ? "TEXT" :
      b.blockType === "CONTACTS" ? "TEXT" :
      b.blockType === "ABOUT" ? "TEXT" :
      b.blockType === "SERVICES" ? "TEXT" :
      b.blockType === "BRANCHES" ? "TEXT" :
      b.blockType === "DROPS" ? "TEXT" : "TEXT";
    return {
      localId: b.localId,
      elementType: elType,
      x: 24,
      y: 24 + i * 180,
      width: 400,
      height: 160,
      rotation: 0,
      zIndex: i + 1,
      pinH: "scale" as const,
      pinV: "top" as const,
      visible: !cfg.hidden,
      locked: false,
      config: {
        text: cfg.heroTitle || cfg.aboutTitle || cfg.aboutText || elType,
        fontFamily: (cfg.fontFamily as FontFamily) || "sans",
        fontSize: cfg.fontSize || 16,
        textColor: cfg.textColor,
        textAlignment: (cfg.alignment as TextAlignment) || "left",
        galleryImages: cfg.images,
        imageUrl: cfg.heroImage,
      },
    };
  });
  return [section];
}

function sectionsToBlocks(sections: CanvasSection[]): any[] {
  const blocks: any[] = [];
  sections.forEach(section => {
    section.elements.forEach(el => {
      blocks.push({
        localId: el.localId,
        blockType: el.elementType === "GALLERY" ? "GALLERY" : "ABOUT",
        displayOrder: blocks.length,
        config: {
          hidden: !el.visible,
          backgroundColor: section.backgroundColor,
          textColor: el.config.textColor,
          fontFamily: el.config.fontFamily,
          fontSize: el.config.fontSize,
          alignment: el.config.textAlignment,
          images: el.config.galleryImages,
          heroImage: el.config.imageUrl,
          heroTitle: el.config.text,
          aboutText: el.config.text,
          aboutTitle: el.config.text,
          height: el.height || section.height,
        },
      });
    });
  });
  return blocks;
}

// ── Main Component ──

export function BusinessCardBuilder({ blocks: initialBlocks, onSave, onPublish, busy, readOnly }: Props) {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<CanvasSection[]>(() => blocksToSections(initialBlocks));
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [deviceView, setDeviceView] = useState<DeviceView>(() => detectIsMobile() ? "mobile" : "desktop");
  const [previewMode, setPreviewMode] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);

  const showPrompt = useCallback((message: string, value: string, inputType: PromptState["inputType"], onSubmit: (value: string) => void, rangeMin?: number, rangeMax?: number, rangeStep?: number) => {
    setCtxMenu(null);
    setPromptState({ message, value, inputType, onSubmit, rangeMin, rangeMax, rangeStep });
  }, []);

  const closePrompt = useCallback(() => setPromptState(null), []);

  const selectedSection = sections.find(s => s.localId === selectedSectionId);
  const selectedElement = selectedSection?.elements.find(e => e.localId === selectedElementId);

  const markDirty = useCallback(() => setDirty(true), []);

  const updateSections = useCallback((next: CanvasSection[]) => {
    setSections(next);
    markDirty();
  }, [markDirty]);

  const updateSection = useCallback((sectionId: string, patch: Partial<CanvasSection>) => {
    setSections(prev => prev.map(s => s.localId === sectionId ? { ...s, ...patch } : s));
    markDirty();
  }, [markDirty]);

  const updateElement = useCallback((sectionId: string, elementId: string, patch: Partial<CanvasElement>) => {
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      return { ...s, elements: s.elements.map(e => e.localId === elementId ? { ...e, ...patch } : e) };
    }));
    markDirty();
  }, [markDirty]);

  const updateElementConfig = useCallback((sectionId: string, elementId: string, configPatch: Partial<ElementConfig>) => {
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      return { ...s, elements: s.elements.map(e => {
        if (e.localId !== elementId) return e;
        return { ...e, config: { ...e.config, ...configPatch } };
      })};
    }));
    markDirty();
  }, [markDirty]);

  const deselectAll = useCallback(() => {
    setSelectedSectionId(null);
    setSelectedElementId(null);
  }, []);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (previewMode) return;
      if (e.key === "Escape") { closeCtxMenu(); deselectAll(); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (selectedElementId && selectedSectionId) {
          handleDeleteElement(selectedSectionId, selectedElementId);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (selectedElementId && selectedSectionId) {
          handleDuplicateElement(selectedSectionId, selectedElementId);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  // Click outside closes context menu (but not clicks on the menu itself)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-ctx-menu]")) return;
      setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Section operations ──

  const handleAddSection = useCallback((atY?: number) => {
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.displayOrder), 0);
    const section = createSection(maxOrder + 1);
    if (atY !== undefined) section.height = Math.max(300, atY + 200);
    updateSections([...sections, section]);
    setSelectedSectionId(section.localId);
    setSelectedElementId(null);
    closeCtxMenu();
  }, [sections, updateSections, closeCtxMenu]);

  const handleDeleteSection = useCallback((id: string) => {
    updateSections(sections.filter(s => s.localId !== id));
    if (selectedSectionId === id) deselectAll();
    closeCtxMenu();
  }, [sections, selectedSectionId, updateSections, deselectAll, closeCtxMenu]);

  const handleDuplicateSection = useCallback((id: string) => {
    const source = sections.find(s => s.localId === id);
    if (!source) return;
    const clone: CanvasSection = {
      ...source,
      localId: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: source.name ? `${source.name} (copy)` : "",
      displayOrder: source.displayOrder + 1,
      elements: source.elements.map(e => ({ ...e, localId: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })),
    };
    const next = [...sections];
    const idx = next.findIndex(s => s.localId === id);
    next.splice(idx + 1, 0, clone);
    next.forEach((s, i) => { s.displayOrder = i + 1; });
    updateSections(next);
    closeCtxMenu();
  }, [sections, updateSections, closeCtxMenu]);

  // ── Element operations ──

  const handleAddElement = useCallback((sectionId: string, type: ElementType, atX?: number, atY?: number) => {
    const x = atX ?? 24;
    const y = atY ?? 24;
    const element = createElement(type, { x, y });
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      return { ...s, elements: [...s.elements, element] };
    }));
    setSelectedSectionId(sectionId);
    setSelectedElementId(element.localId);
    markDirty();
    closeCtxMenu();
  }, [markDirty, closeCtxMenu]);

  const handleDeleteElement = useCallback((sectionId: string, elementId: string) => {
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      return { ...s, elements: s.elements.filter(e => e.localId !== elementId) };
    }));
    if (selectedElementId === elementId) { setSelectedElementId(null); }
    markDirty();
    closeCtxMenu();
  }, [selectedElementId, markDirty, closeCtxMenu]);

  const handleDuplicateElement = useCallback((sectionId: string, elementId: string) => {
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      const source = s.elements.find(e => e.localId === elementId);
      if (!source) return s;
      const clone: CanvasElement = {
        ...source,
        localId: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        x: source.x + 20,
        y: source.y + 20,
      };
      return { ...s, elements: [...s.elements, clone] };
    }));
    markDirty();
    closeCtxMenu();
  }, [markDirty, closeCtxMenu]);

  const handleBringToFront = useCallback((sectionId: string, elementId: string) => {
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      const maxZ = s.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
      return { ...s, elements: s.elements.map(e => e.localId === elementId ? { ...e, zIndex: maxZ + 1 } : e) };
    }));
    markDirty();
    closeCtxMenu();
  }, [markDirty, closeCtxMenu]);

  const handleSendToBack = useCallback((sectionId: string, elementId: string) => {
    setSections(prev => prev.map(s => {
      if (s.localId !== sectionId) return s;
      const minZ = s.elements.reduce((m, e) => Math.min(m, e.zIndex), 0);
      return { ...s, elements: s.elements.map(e => e.localId === elementId ? { ...e, zIndex: minZ - 1 } : e) };
    }));
    markDirty();
    closeCtxMenu();
  }, [markDirty, closeCtxMenu]);

  // ── Save / Publish ──

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await onSave(sectionsToBlocks(sections));
      setSaveState("saved");
      setDirty(false);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  };

  const handlePublish = async () => {
    if (dirty) {
      setSaveState("saving");
      try {
        await onSave(sectionsToBlocks(sections));
        setDirty(false);
      } catch {
        setSaveState("error");
        return;
      }
    }
    setSaveState("idle");
    await onPublish();
  };

  // ── Context menu builders ──

  const buildCanvasMenu = (): CtxItem[] => [
    { key: "add-section", label: "Add Section", icon: <Plus size={13} />, action: () => handleAddSection() },
  ];

  const buildSectionMenu = (section: CanvasSection, clickX: number, clickY: number): CtxItem[] => {
    const sid = section.localId;
    const sectionEl = canvasRef.current?.querySelector(`[data-section-id="${sid}"]`);
    let relX = 24; let relY = 24;
    if (sectionEl) {
      const rect = sectionEl.getBoundingClientRect();
      relX = Math.max(0, clickX - rect.left - (section.paddingLeft || 0));
      relY = Math.max(0, clickY - rect.top - (section.paddingTop || 0));
    }
    return [
      {
        key: "add-el", label: "Add Element", icon: <Plus size={13} />,
        children: [
          { key: "add-text", label: "Text", icon: <Type size={13} />, action: () => handleAddElement(sid, "TEXT", relX, relY) },
          { key: "add-image", label: "Image", icon: <Image size={13} />, action: () => handleAddElement(sid, "IMAGE", relX, relY) },
          { key: "add-button", label: "Button", icon: <MousePointer2 size={13} />, action: () => handleAddElement(sid, "BUTTON", relX, relY) },
          { key: "add-shape", label: "Shape", icon: <Square size={13} />, action: () => handleAddElement(sid, "SHAPE", relX, relY) },
          { key: "add-gallery", label: "Gallery", icon: <Images size={13} />, action: () => handleAddElement(sid, "GALLERY", relX, relY) },
        ],
      },
      { key: "d1", divider: true },
      { key: "rename", label: "Rename", action: () => showPrompt("Section name", section.name, "text", (v) => updateSection(sid, { name: v })) },
      { key: "bg", label: "Background Color", action: () => showPrompt("Background Color", section.backgroundColor || "#ffffff", "color", (v) => updateSection(sid, { backgroundColor: v })) },
      { key: "radius", label: "Border Radius: " + (section.borderRadius ?? 0) + "px", action: () => showPrompt("Border Radius", String(section.borderRadius ?? 0), "range", (v) => updateSection(sid, { borderRadius: Math.max(0, Number(v) || 0) }), 0, 200, 1) },
      { key: "opacity", label: "Opacity: " + (section.opacity ?? 100) + "%", action: () => showPrompt("Opacity", String(section.opacity ?? 100), "range", (v) => updateSection(sid, { opacity: Math.min(100, Math.max(0, Number(v) || 0)) }), 0, 100, 1) },
      { key: "height", label: "Height: " + section.height + "px", action: () => showPrompt("Section Height", String(section.height), "range", (v) => updateSection(sid, { height: Math.max(100, Number(v) || 100) }), 100, 2000, 10) },
      { key: "d2", divider: true },
      { key: "dup", label: "Duplicate Section", icon: <Copy size={13} />, action: () => handleDuplicateSection(sid) },
      { key: "del", label: "Delete Section", icon: <Trash2 size={13} />, danger: true, action: () => handleDeleteSection(sid) },
    ];
  };

  const buildElementMenu = (sectionId: string, element: CanvasElement): CtxItem[] => {
    const eid = element.localId;
    const cfg = element.config;
    const u = (patch: Partial<ElementConfig>) => updateElementConfig(sectionId, eid, patch);
    const base: CtxItem[] = [];

    switch (element.elementType) {
      case "TEXT":
        base.push(
          { key: "content", label: "Edit Content", action: () => showPrompt("Text content", cfg.text || "", "text", (v) => u({ text: v })) },
          {
            key: "font", label: "Font Family", icon: <ChevronRight size={11} />,
            children: FONT_FAMILIES.map(f => ({
              key: `font-${f.value}`, label: f.label, action: () => u({ fontFamily: f.value as FontFamily }),
            })),
          },
          { key: "size", label: "Font Size: " + (cfg.fontSize || 16) + "px", action: () => showPrompt("Font Size", String(cfg.fontSize || 16), "range", (v) => u({ fontSize: Math.min(128, Math.max(8, Number(v) || 16)) }), 8, 128, 1) },
          { key: "weight", label: "Font Weight: " + (cfg.fontWeight || 400), action: () => showPrompt("Font Weight", String(cfg.fontWeight || 400), "range", (v) => u({ fontWeight: Math.min(900, Math.max(100, Number(v) || 400)) }), 100, 900, 100) },
          { key: "color", label: "Text Color", action: () => showPrompt("Text Color", cfg.textColor || "#000000", "color", (v) => u({ textColor: v || undefined })) },
          {
            key: "align", label: "Alignment", icon: <ChevronRight size={11} />,
            children: (["left", "center", "right"] as TextAlignment[]).map(a => ({
              key: `align-${a}`, label: a, action: () => u({ textAlignment: a }),
            })),
          },
        );
        break;
      case "IMAGE":
        base.push(
          { key: "url", label: "Image URL", action: () => showPrompt("Image URL", cfg.imageUrl || "", "text", (v) => u({ imageUrl: v || undefined })) },
          {
            key: "fit", label: "Fit: " + (cfg.imageFit || "cover"), icon: <ChevronRight size={11} />,
            children: (["cover", "contain", "fill"] as ImageFit[]).map(f => ({
              key: `fit-${f}`, label: f, action: () => u({ imageFit: f }),
            })),
          },
          { key: "radius", label: "Border Radius: " + (cfg.imageBorderRadius || 0) + "px", action: () => showPrompt("Border Radius", String(cfg.imageBorderRadius || 0), "range", (v) => u({ imageBorderRadius: Math.max(0, Number(v) || 0) }), 0, 200, 1) },
          { key: "shadow", label: cfg.imageShadow ? "Shadow: ON" : "Shadow: OFF", action: () => u({ imageShadow: !cfg.imageShadow }) },
        );
        break;
      case "BUTTON":
        base.push(
          { key: "text", label: "Button Text", action: () => showPrompt("Button text", cfg.buttonText || "", "text", (v) => u({ buttonText: v })) },
          { key: "url", label: "Link URL", action: () => showPrompt("Link URL", cfg.buttonUrl || "", "text", (v) => u({ buttonUrl: v || undefined })) },
          { key: "fill", label: "Fill Color", action: () => showPrompt("Fill Color", cfg.buttonFill || "#0d9b7c", "color", (v) => u({ buttonFill: v || undefined })) },
          { key: "textcolor", label: "Text Color", action: () => showPrompt("Text Color", cfg.buttonTextColor || "#ffffff", "color", (v) => u({ buttonTextColor: v || undefined })) },
          { key: "radius", label: "Border Radius: " + (cfg.buttonBorderRadius || 8) + "px", action: () => showPrompt("Border Radius", String(cfg.buttonBorderRadius || 8), "range", (v) => u({ buttonBorderRadius: Math.max(0, Number(v) || 0) }), 0, 48, 1) },
          { key: "fontsize", label: "Font Size: " + (cfg.buttonFontSize || 14) + "px", action: () => showPrompt("Font Size", String(cfg.buttonFontSize || 14), "range", (v) => u({ buttonFontSize: Math.min(64, Math.max(8, Number(v) || 14)) }), 8, 64, 1) },
        );
        break;
      case "SHAPE":
        base.push(
          {
            key: "type", label: "Shape: " + (cfg.shapeType || "rectangle"), icon: <ChevronRight size={11} />,
            children: (["rectangle", "circle", "line"] as ShapeType[]).map(st => ({
              key: `shape-${st}`, label: st, action: () => u({ shapeType: st }),
            })),
          },
          { key: "fill", label: "Fill Color", action: () => showPrompt("Fill Color", cfg.shapeFill || "#0d9b7c", "color", (v) => u({ shapeFill: v || undefined })) },
          { key: "opacity", label: "Opacity: " + Math.round((cfg.shapeOpacity ?? 1) * 100) + "%", action: () => showPrompt("Opacity", String(Math.round((cfg.shapeOpacity ?? 1) * 100)), "range", (v) => u({ shapeOpacity: Math.min(100, Math.max(0, Number(v) || 0)) / 100 }), 0, 100, 1) },
          { key: "border-color", label: "Border Color", action: () => showPrompt("Border Color", cfg.shapeBorder || "#000000", "color", (v) => u({ shapeBorder: v || undefined })) },
          { key: "border-w", label: "Border Width: " + (cfg.shapeBorderWidth || 0) + "px", action: () => showPrompt("Border Width", String(cfg.shapeBorderWidth || 0), "range", (v) => u({ shapeBorderWidth: Math.max(0, Number(v) || 0) }), 0, 20, 1) },
        );
        break;
      case "GALLERY":
        const imgs = cfg.galleryImages || [];
        base.push(
          {
            key: "layout", label: "Layout: " + (cfg.galleryLayout || "grid"), icon: <ChevronRight size={11} />,
            children: (["grid", "row", "carousel"] as GalleryLayout[]).map(l => ({
              key: `layout-${l}`, label: l, action: () => u({ galleryLayout: l }),
            })),
          },
          { key: "addimg", label: "Add Image URL", icon: <Plus size={13} />, action: () => showPrompt("Image URL", "", "text", (v) => { if (v) u({ galleryImages: [...imgs, v.trim()] }); }) },
          { key: "imginfo", label: `Images: ${imgs.length}`, disabled: true },
          { key: "clearimg", label: "Clear All Images", danger: true, action: () => showPrompt("Clear all gallery images?", "", "confirm", () => u({ galleryImages: [] })) },
          { key: "gap", label: "Gap: " + (cfg.galleryGap || 8) + "px", action: () => showPrompt("Gap", String(cfg.galleryGap || 8), "range", (v) => u({ galleryGap: Math.max(0, Number(v) || 0) }), 0, 48, 1) },
          { key: "imgradius", label: "Image Radius: " + (cfg.galleryImageRadius || 4) + "px", action: () => showPrompt("Image Radius", String(cfg.galleryImageRadius || 4), "range", (v) => u({ galleryImageRadius: Math.max(0, Number(v) || 0) }), 0, 48, 1) },
        );
        break;
    }

    return [
      ...base,
      { key: "d3", divider: true },
      { key: "rotate", label: `Rotation: ${element.rotation ?? 0}°`, action: () => showPrompt("Rotation", String(element.rotation ?? 0), "range", (v) => updateElement(sectionId, eid, { rotation: Number(v) || 0 }), -180, 180, 1) },
      { key: "d4", divider: true },
      { key: "dup", label: "Duplicate", icon: <Copy size={13} />, action: () => handleDuplicateElement(sectionId, eid) },
      { key: "del", label: "Delete", icon: <Trash2 size={13} />, danger: true, action: () => handleDeleteElement(sectionId, eid) },
      { key: "front", label: "Bring to Front", action: () => handleBringToFront(sectionId, eid) },
      { key: "back", label: "Send to Back", action: () => handleSendToBack(sectionId, eid) },
    ];
  };

  // ── Read-only ──

  if (readOnly) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {sections.map(section => (
          <div key={section.localId} style={{ marginBottom: "1rem" }}>
            <PreviewSection section={section} />
          </div>
        ))}
      </div>
    );
  }

  // ── Render ──

  return (
    <div
      ref={canvasRef}
      style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", minHeight: 500 }}
      onContextMenu={(e) => {
        // Only show canvas menu if click is on the canvas background (not on a section)
        const target = e.target as HTMLElement;
        if (target.closest("[data-section-id]")) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, items: buildCanvasMenu() });
      }}
    >
      {/* Top Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.75rem",
        borderBottom: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
        backgroundColor: "var(--fcw-color-surface)", flexShrink: 0,
      }}>
        <div className="fcw-glassmorph-segmented" style={{ display: "inline-flex", gap: 0 }}>
          <button
            className={`fcw-btn fcw-btn-sm ${deviceView === "desktop" ? "fcw-glassmorph-selected-seg" : ""}`}
            style={{ background: deviceView === "desktop" ? undefined : "transparent", border: "none", boxShadow: "none", gap: "0.375rem" }}
            onClick={() => setDeviceView("desktop")}
          >
            <Monitor size={14} />Desktop
          </button>
          <button
            className={`fcw-btn fcw-btn-sm ${deviceView === "mobile" ? "fcw-glassmorph-selected-seg" : ""}`}
            style={{ background: deviceView === "mobile" ? undefined : "transparent", border: "none", boxShadow: "none", gap: "0.375rem" }}
            onClick={() => setDeviceView("mobile")}
          >
            <Smartphone size={14} />Mobile
          </button>
        </div>

        <button
          className={`fcw-btn fcw-btn-sm ${previewMode ? "fcw-btn-primary" : "fcw-btn-secondary"}`}
          style={{ gap: "0.375rem" }}
          onClick={() => { setPreviewMode(v => !v); deselectAll(); closeCtxMenu(); }}
        >
          {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {previewMode ? "Edit" : "Preview"}
        </button>

        <span style={{ flex: 1 }} />

        <span className="fcw-body-s fcw-text-tertiary" style={{ fontSize: "0.6875rem" }}>
          {dirty ? "Unsaved" : "Saved"}
        </span>

        <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" style={{ gap: "0.375rem" }} onClick={handleSave} disabled={!dirty || saveState === "saving"}>
          {saveState === "saving" ? <Loader2 className="fcw-animate-spin" size={14} /> : saveState === "saved" ? <Check size={14} /> : <Save size={14} />}
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save Draft"}
        </button>

        <button className="fcw-btn fcw-btn-primary fcw-btn-sm" style={{ gap: "0.375rem" }} onClick={handlePublish} disabled={busy}>
          <Send size={14} />Publish
        </button>
      </div>

      {/* Canvas */}
      <div
        className="fcw-scrollbar-thin"
        style={{ flex: 1, overflowY: "auto", backgroundColor: "var(--fcw-color-surface-secondary)" }}
        onClick={(e) => { if (e.target === e.currentTarget) deselectAll(); }}
      >
        {previewMode ? (
          <div style={{ padding: "1.5rem", display: "flex", justifyContent: "center" }}>
            <div style={{ filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.18))" }}>
              {deviceView === "mobile" ? (
                <div style={{ width: 280, borderRadius: 24, overflow: "hidden", border: "3px solid #2c2c2e", background: "var(--fcw-color-surface)" }}>
                  <div style={{ padding: "1rem 0.75rem", minHeight: 400 }}>
                    {sections.map(s => <PreviewSection key={s.localId} section={s} deviceWidth={280} />)}
                  </div>
                </div>
              ) : (
                sections.map(s => <PreviewSection key={s.localId} section={s} />)
              )}
            </div>
          </div>
        ) : (
          <div style={{
            maxWidth: deviceView === "mobile" ? 375 : "100%",
            margin: "0 auto",
            padding: deviceView === "mobile" ? "0.75rem" : "1.5rem 2rem",
            minHeight: "100%",
          }}>
            {sections.map(section => (
              <SectionBlock
                key={section.localId}
                section={section}
                isSelectedSection={selectedSectionId === section.localId && !selectedElementId}
                selectedElementId={selectedElementId}
                onSelectSection={() => { setSelectedSectionId(section.localId); setSelectedElementId(null); }}
                onSelectElement={(eid) => { setSelectedSectionId(section.localId); setSelectedElementId(eid); }}
                onUpdateSection={(patch) => updateSection(section.localId, patch)}
                onUpdateElement={(eid, patch) => updateElement(section.localId, eid, patch)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu({ x: e.clientX, y: e.clientY, items: buildSectionMenu(section, e.clientX, e.clientY) });
                }}
                onElementContextMenu={(eid) => (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const el = section.elements.find(ee => ee.localId === eid);
                  if (!el) return;
                  setCtxMenu({ x: e.clientX, y: e.clientY, items: buildElementMenu(section.localId, el) });
                }}
              />
            ))}

            {/* Add Section button at bottom */}
            <button
              className="fcw-btn fcw-btn-secondary fcw-btn-sm"
              style={{ width: "100%", gap: "0.5rem", padding: "1.25rem", borderStyle: "dashed" }}
              onClick={() => handleAddSection()}
            >
              <Plus size={16} />Add Section
            </button>

            {/* Context menu for empty canvas area */}
            <div style={{ padding: "1rem 0" }} />
          </div>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {ctxMenu && (
          <ContextMenuView
            key={`${ctxMenu.x}-${ctxMenu.y}`}
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={ctxMenu.items}
            onClose={closeCtxMenu}
          />
        )}
      </AnimatePresence>

      {/* Prompt Popup */}
      <AnimatePresence>
        {promptState && (
          <PromptPopup prompt={promptState} onClose={closePrompt} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section Block (Canvas) ──

function SectionBlock({
  section, isSelectedSection, selectedElementId,
  onSelectSection, onSelectElement, onUpdateSection, onUpdateElement,
  onContextMenu, onElementContextMenu,
}: {
  section: CanvasSection;
  isSelectedSection: boolean;
  selectedElementId: string | null;
  onSelectSection: () => void;
  onSelectElement: (eid: string) => void;
  onUpdateSection: (patch: Partial<CanvasSection>) => void;
  onUpdateElement: (eid: string, patch: Partial<CanvasElement>) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onElementContextMenu: (eid: string) => (e: React.MouseEvent) => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [draggingHeight, setDraggingHeight] = useState(false);
  const heightRef = useRef(section.height);

  useEffect(() => {
    heightRef.current = section.height;
  }, [section.height]);

  const handleHeightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = heightRef.current;
    setDraggingHeight(true);
    const onMove = (ev: MouseEvent) => {
      const newH = Math.max(100, startH + (ev.clientY - startY));
      heightRef.current = newH;
      onUpdateSection({ height: newH });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDraggingHeight(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const borderRadius = section.borderRadius ?? 0;
  const opacity = (section.opacity ?? 100) / 100;

  return (
    <div
      data-section-id={section.localId}
      ref={sectionRef}
      onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.sectionBg) { onSelectSection(); } }}
      onContextMenu={onContextMenu}
      style={{
        position: "relative",
        marginBottom: "1rem",
        minHeight: section.height,
        paddingTop: section.paddingTop,
        paddingBottom: section.paddingBottom,
        paddingLeft: section.paddingLeft,
        paddingRight: section.paddingRight,
        backgroundColor: section.backgroundColor || "var(--fcw-color-surface)",
        backgroundImage: section.backgroundImage ? `url(${section.backgroundImage})` : undefined,
        backgroundSize: "cover",
        borderRadius: borderRadius > 0 ? borderRadius : "var(--fcw-radius-lg)",
        border: isSelectedSection ? "2px solid var(--fcw-color-primary)" : "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
        opacity,
        cursor: "default",
        overflow: "hidden",
      }}
    >
      {/* Section name tag */}
      {section.name && (
        <div style={{
          position: "absolute", top: 0, left: 12,
          backgroundColor: "var(--fcw-color-primary)", color: "#fff",
          fontSize: "0.6875rem", padding: "0.125rem 0.625rem",
          borderRadius: "var(--fcw-radius-full)", zIndex: 5,
          maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {section.name}
        </div>
      )}

      {/* Invisible background click target for section selection */}
      <div
        data-section-bg="true"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* Elements layer */}
      {section.elements.map(el => (
        <CanvasElementView
          key={el.localId}
          element={el}
          isSelected={selectedElementId === el.localId}
          onSelect={() => onSelectElement(el.localId)}
          onUpdate={(patch) => onUpdateElement(el.localId, patch)}
          onContextMenu={onElementContextMenu(el.localId)}
        />
      ))}

      {/* Empty section hint */}
      {section.elements.length === 0 && !isSelectedSection && (
        <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--fcw-color-text-tertiary)", position: "relative", zIndex: 1 }}>
          <Images size={24} style={{ opacity: 0.2, marginBottom: "0.5rem" }} />
          <p className="fcw-body-s" style={{ fontSize: "0.6875rem" }}>Right-click to add elements</p>
        </div>
      )}

      {/* Section height resize handle */}
      {isSelectedSection && (
        <div
          onMouseDown={handleHeightMouseDown}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 6,
            cursor: "ns-resize", zIndex: 10,
            borderBottom: `2px dashed ${draggingHeight ? "var(--fcw-color-primary)" : "var(--fcw-color-border)"}`,
            backgroundColor: draggingHeight ? "color-mix(in srgb, var(--fcw-color-primary) 10%, transparent)" : "transparent",
          }}
          title="Drag to resize section height"
        />
      )}
    </div>
  );
}

// ── Canvas Element (draggable, resizable) ──

const RESIZE_HANDLES = [
  { key: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
  { key: "n", cursor: "ns-resize", style: { top: -4, left: "50%", marginLeft: -4 } },
  { key: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
  { key: "e", cursor: "ew-resize", style: { top: "50%", marginTop: -4, right: -4 } },
  { key: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
  { key: "s", cursor: "ns-resize", style: { bottom: -4, left: "50%", marginLeft: -4 } },
  { key: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
  { key: "w", cursor: "ew-resize", style: { top: "50%", marginTop: -4, left: -4 } },
] as const;

type DragMode = "move" | "resize" | "rotate";

function CanvasElementView({
  element, isSelected, onSelect, onUpdate, onContextMenu,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    handle?: string;
    sx: number; sy: number;
    ex: number; ey: number; ew: number; eh: number; er: number;
  } | null>(null);

  if (!element.visible) return null;

  const { config, x, y, width, height, rotation, zIndex } = element;
  const fontCss = FONT_FAMILIES.find(f => f.value === config.fontFamily)?.css || "inherit";

  const handleMouseDown = (e: React.MouseEvent, mode: DragMode, handle?: string) => {
    if (element.locked) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    dragRef.current = {
      mode,
      handle,
      sx: e.clientX,
      sy: e.clientY,
      ex: x,
      ey: y,
      ew: width,
      eh: height,
      er: rotation,
    };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (d.mode === "move") {
        onUpdate({ x: d.ex + dx, y: d.ey + dy });
      } else if (d.mode === "rotate") {
        const cx = d.ex + d.ew / 2;
        const cy = d.ey + d.eh / 2;
        const startAngle = Math.atan2(d.sy - cy, d.sx - cx);
        const currentAngle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        let deltaDeg = (currentAngle - startAngle) * (180 / Math.PI);
        const snapped = Math.round(deltaDeg / 15) * 15;
        deltaDeg = Math.abs(deltaDeg - snapped) < 3 ? snapped : deltaDeg;
        let newRot = d.er + deltaDeg;
        if (ev.shiftKey) newRot = Math.round(newRot / 15) * 15;
        onUpdate({ rotation: newRot });
      } else {
        let nx = d.ex, ny = d.ey, nw = d.ew, nh = d.eh;
        const h = d.handle!;
        if (h.includes("e")) nw = Math.max(20, d.ew + dx);
        if (h.includes("w")) { nx = d.ex + dx; nw = Math.max(20, d.ew - dx); }
        if (h.includes("s")) nh = Math.max(10, d.eh + dy);
        if (h.includes("n")) { ny = d.ey + dy; nh = Math.max(10, d.eh - dy); }
        onUpdate({ x: nx, y: ny, width: nw, height: nh });
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      dragRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
    zIndex,
    transform: `rotate(${rotation ?? 0}deg)`,
    cursor: element.locked ? "default" : "grab",
    outline: isSelected ? "2px solid var(--fcw-color-primary)" : undefined,
    outlineOffset: -1,
  };

  const renderContent = () => {
    switch (element.elementType) {
      case "TEXT":
        return (
          <div style={{ width: "100%", height: "100%", fontFamily: fontCss, fontSize: config.fontSize || 16, fontWeight: config.fontWeight || 400, color: config.textColor || "var(--fcw-color-text)", textAlign: config.textAlignment || "left", overflow: "hidden", padding: 1 }}>
            {config.text || "Text"}
          </div>
        );
      case "IMAGE":
        return (
          <div style={{ width: "100%", height: "100%", backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : undefined, backgroundSize: config.imageFit || "cover", backgroundPosition: "center", borderRadius: config.imageBorderRadius || 0, backgroundColor: "var(--fcw-color-surface-tertiary)", boxShadow: config.imageShadow ? "var(--fcw-shadow-lg)" : undefined }}>
            {!config.imageUrl && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fcw-color-text-tertiary)" }}><Image size={20} /></div>}
          </div>
        );
      case "BUTTON":
        return (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: config.buttonFill || "var(--fcw-color-primary)", color: config.buttonTextColor || "#fff", borderRadius: config.buttonBorderRadius || 8, fontSize: config.buttonFontSize || 14, fontWeight: 600, userSelect: "none" }}>
            {config.buttonText || "Button"}
          </div>
        );
      case "SHAPE": {
        const shapeStyle: React.CSSProperties = {
          width: "100%", height: config.shapeType === "line" ? 4 : "100%",
          backgroundColor: config.shapeFill || "var(--fcw-color-primary)",
          opacity: config.shapeOpacity ?? 1,
          borderRadius: config.shapeType === "circle" ? "50%" : 4,
          border: config.shapeBorder ? `${config.shapeBorderWidth || 2}px solid ${config.shapeBorder}` : undefined,
        };
        if (config.shapeType === "line") shapeStyle.marginTop = height / 2 - 2;
        return <div style={shapeStyle} />;
      }
      case "GALLERY": {
        const images = config.galleryImages || [];
        return (
          <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <div style={{ display: config.galleryLayout === "row" ? "flex" : "grid", gridTemplateColumns: config.galleryLayout !== "row" ? `repeat(auto-fill, minmax(${config.galleryLayout === "carousel" ? "100%" : "60px"}, 1fr))` : undefined, gap: config.galleryGap || 8, overflowX: config.galleryLayout === "row" ? "auto" : undefined, height: "100%" }}>
              {images.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fcw-color-text-tertiary)", gridColumn: "1 / -1" }}><Images size={20} /></div>
              ) : images.map((img, i) => (
                <div key={i} style={{ backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: config.galleryImageRadius || 4, aspectRatio: "1", flexShrink: config.galleryLayout === "row" ? 0 : undefined, width: config.galleryLayout === "row" ? 100 : undefined }} />
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      ref={elRef}
      style={containerStyle}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onContextMenu={onContextMenu}
    >
      {renderContent()}

      {/* Rotation handle */}
      {isSelected && !element.locked && (
        <div
          onMouseDown={(e) => handleMouseDown(e, "rotate")}
          style={{
            position: "absolute",
            top: -28,
            left: "50%",
            marginLeft: -8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "var(--fcw-color-surface)",
            border: "2px solid var(--fcw-color-primary)",
            cursor: "grab",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Rotate (hold Shift for 15° steps)"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--fcw-color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </div>
      )}
      {/* Line from rotation handle to element */}
      {isSelected && !element.locked && (
        <div style={{
          position: "absolute",
          top: -12,
          left: "50%",
          width: 1,
          height: 12,
          backgroundColor: "var(--fcw-color-primary)",
          zIndex: 9,
        }} />
      )}

      {/* Resize handles */}
      {isSelected && !element.locked && RESIZE_HANDLES.map(h => (
        <div
          key={h.key}
          style={{
            position: "absolute",
            width: 8, height: 8,
            backgroundColor: "var(--fcw-color-surface)",
            border: "2px solid var(--fcw-color-primary)",
            borderRadius: 1,
            cursor: h.cursor,
            zIndex: 10,
            ...h.style,
          }}
          onMouseDown={(e) => handleMouseDown(e, "resize", h.key)}
        />
      ))}
    </div>
  );
}

// ── Context Menu ──

function ContextMenuView({ x, y, items, onClose }: { x: number; y: number; items: CtxItem[]; onClose: () => void }) {
  const [hoveredSub, setHoveredSub] = useState<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuWidth = 200;
  const itemHeight = 32;
  let ax = x; let ay = y;
  if (ax + menuWidth + 20 > window.innerWidth) ax = window.innerWidth - menuWidth - 12;
  if (ay + items.length * itemHeight + 20 > window.innerHeight) ay = window.innerHeight - items.length * itemHeight - 12;
  ax = Math.max(4, ax);
  ay = Math.max(4, ay);

  const handleItemEnter = (i: number, hasChildren: boolean) => {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
    if (hasChildren) setHoveredSub(i);
  };

  const handleItemLeave = (i: number) => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredSub(prev => prev === i ? null : prev);
    }, 180);
  };

  const handleSubEnter = () => {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
  };

  const handleSubLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setHoveredSub(null), 180);
  };

  useEffect(() => {
    return () => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); };
  }, []);

  const subItems = hoveredSub !== null ? items[hoveredSub]?.children : null;

  return (
    <>
      <motion.div
        ref={menuRef}
        data-ctx-menu="true"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        style={{
          position: "fixed",
          left: ax, top: ay,
          width: menuWidth,
          zIndex: 9999,
          backgroundColor: "color-mix(in srgb, var(--fcw-color-surface) 96%, transparent)",
          backdropFilter: "var(--fcw-blur-glass)",
          WebkitBackdropFilter: "var(--fcw-blur-glass)",
          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
          borderRadius: "var(--fcw-radius-lg)",
          boxShadow: "var(--fcw-shadow-lg)",
          padding: "0.25rem",
          overflow: "visible",
        }}
      >
        {items.map((item, i) => {
          if (item.divider) {
            return <div key={item.key} style={{ height: 1, backgroundColor: "var(--fcw-color-border)", margin: "0.25rem 0.5rem" }} />;
          }
          return (
            <button
              key={item.key}
              onMouseEnter={() => handleItemEnter(i, !!item.children)}
              onMouseLeave={() => handleItemLeave(i)}
              onClick={(e) => {
                e.stopPropagation();
                if (item.disabled || item.children) return;
                item.action?.();
                onClose();
              }}
              disabled={item.disabled}
              style={{
                width: "100%",
                display: "flex", alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.625rem",
                borderRadius: "var(--fcw-radius-sm)",
                fontSize: "0.75rem",
                color: item.danger ? "var(--fcw-color-error)" : item.disabled ? "var(--fcw-color-text-tertiary)" : "var(--fcw-color-text)",
                backgroundColor: hoveredSub === i ? "var(--fcw-color-surface-secondary)" : "transparent",
                border: "none",
                fontFamily: "inherit",
                textAlign: "left",
                cursor: item.disabled ? "default" : "pointer",
                opacity: item.disabled ? 0.5 : 1,
                minHeight: itemHeight - 4,
              }}
            >
              {item.icon && <span style={{ flexShrink: 0, display: "flex", opacity: 0.7 }}>{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.children && <ChevronRight size={11} style={{ opacity: 0.4, flexShrink: 0 }} />}
            </button>
          );
        })}
      </motion.div>

      {/* Submenu */}
      <AnimatePresence>
        {subItems && (
          <div
            data-ctx-menu="true"
            onMouseEnter={handleSubEnter}
            onMouseLeave={handleSubLeave}
            style={{ position: "fixed", left: ax + menuWidth, top: ay + (hoveredSub ?? 0) * itemHeight - 4, zIndex: 9999 }}
          >
            <ContextMenuView
              key={`sub-${hoveredSub}`}
              x={ax + menuWidth}
              y={ay + (hoveredSub ?? 0) * itemHeight - 4}
              items={subItems}
              onClose={onClose}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Prompt Popup ──

function PromptPopup({ prompt, onClose }: { prompt: PromptState; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(prompt.value);

  useEffect(() => {
    if (prompt.inputType !== "confirm" && inputRef.current) {
      inputRef.current.focus();
      if (prompt.inputType === "text") inputRef.current.select();
    }
  }, [prompt.inputType]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter" && prompt.inputType !== "range") { prompt.onSubmit(value); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [value, prompt, onClose]);

  const renderInput = () => {
    switch (prompt.inputType) {
      case "color":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
            <input
              ref={inputRef}
              type="color"
              value={value || "#000000"}
              onChange={(e) => setValue(e.target.value)}
              style={{
                width: 48, height: 36,
                padding: 2,
                borderRadius: "var(--fcw-radius-sm)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                cursor: "pointer",
                backgroundColor: "transparent",
              }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem 0.625rem",
                borderRadius: "var(--fcw-radius-sm)",
                border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
                fontSize: "0.8125rem",
                fontFamily: "inherit",
                backgroundColor: "var(--fcw-color-surface-secondary)",
                color: "var(--fcw-color-text)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        );
      case "range":
        const min = prompt.rangeMin ?? 0;
        const max = prompt.rangeMax ?? 100;
        const step = prompt.rangeStep ?? 1;
        const numVal = Number(value) || 0;
        const pct = ((numVal - min) / (max - min)) * 100;
        return (
          <div style={{ marginBottom: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                ref={inputRef}
                type="range"
                min={min}
                max={max}
                step={step}
                value={numVal}
                onChange={(e) => setValue(e.target.value)}
                style={{
                  flex: 1,
                  height: 6,
                  appearance: "none",
                  background: `linear-gradient(to right, var(--fcw-color-primary) 0%, var(--fcw-color-primary) ${pct}%, var(--fcw-color-border) ${pct}%, var(--fcw-color-border) 100%)`,
                  borderRadius: 3,
                  outline: "none",
                  cursor: "pointer",
                  accentColor: "var(--fcw-color-primary)",
                }}
              />
              <span style={{
                minWidth: 42, textAlign: "right",
                fontSize: "0.8125rem", fontWeight: 600,
                color: "var(--fcw-color-text)",
              }}>
                {numVal}{prompt.message.includes("%") || prompt.message === "Opacity" ? "%" : "px"}
              </span>
            </div>
          </div>
        );
      case "confirm":
        return <div style={{ marginBottom: "0.75rem" }} />;
      default:
        return (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { prompt.onSubmit(value); onClose(); } }}
            style={{
              width: "100%",
              padding: "0.5rem 0.625rem",
              borderRadius: "var(--fcw-radius-sm)",
              border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
              fontSize: "0.8125rem",
              fontFamily: "inherit",
              backgroundColor: "var(--fcw-color-surface-secondary)",
              color: "var(--fcw-color-text)",
              outline: "none",
              marginBottom: "0.875rem",
              boxSizing: "border-box",
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--fcw-color-surface)",
          border: "var(--fcw-border-width-thin) solid var(--fcw-color-border)",
          borderRadius: "var(--fcw-radius-lg)",
          boxShadow: "var(--fcw-shadow-xl)",
          padding: "1.25rem",
          width: 340,
          maxWidth: "90vw",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--fcw-color-text)", marginBottom: "0.875rem", fontWeight: 500 }}>
          {prompt.message}
        </p>
        {renderInput()}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button className="fcw-btn fcw-btn-secondary fcw-btn-sm" onClick={onClose}>Cancel</button>
          {prompt.inputType !== "confirm" && (
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { prompt.onSubmit(value); onClose(); }}>OK</button>
          )}
          {prompt.inputType === "confirm" && (
            <button className="fcw-btn fcw-btn-primary fcw-btn-sm" onClick={() => { prompt.onSubmit(""); onClose(); }}>OK</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Preview ──

function PreviewSection({ section, deviceWidth }: { section: CanvasSection; deviceWidth?: number }) {
  const borderRadius = section.borderRadius ?? 0;
  const opacity = (section.opacity ?? 100) / 100;
  return (
    <div style={{
      position: "relative",
      minHeight: section.height,
      paddingTop: section.paddingTop,
      paddingBottom: section.paddingBottom,
      paddingLeft: section.paddingLeft,
      paddingRight: section.paddingRight,
      backgroundColor: section.backgroundColor || "var(--fcw-color-surface)",
      backgroundImage: section.backgroundImage ? `url(${section.backgroundImage})` : undefined,
      backgroundSize: "cover",
      borderRadius: borderRadius > 0 ? borderRadius : "var(--fcw-radius-lg)",
      opacity,
      maxWidth: deviceWidth,
      marginBottom: deviceWidth ? "0.75rem" : "1rem",
      overflow: "hidden",
    }}>
      {section.elements.filter(e => e.visible).map(el => (
        <PreviewElement key={el.localId} element={el} />
      ))}
    </div>
  );
}

function PreviewElement({ element }: { element: CanvasElement }) {
  if (!element.visible) return null;
  const { config, width, height, x, y } = element;
  const fontCss = FONT_FAMILIES.find(f => f.value === config.fontFamily)?.css || "inherit";

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height,
  };

  switch (element.elementType) {
    case "TEXT":
      return <div style={{ ...baseStyle, fontFamily: fontCss, fontSize: config.fontSize || 16, fontWeight: config.fontWeight || 400, color: config.textColor || "var(--fcw-color-text)", textAlign: config.textAlignment || "left", overflow: "hidden" }}>{config.text}</div>;
    case "IMAGE":
      return <div style={{ ...baseStyle, backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : undefined, backgroundSize: config.imageFit || "cover", backgroundPosition: "center", borderRadius: config.imageBorderRadius || 0, backgroundColor: "var(--fcw-color-surface-tertiary)", boxShadow: config.imageShadow ? "var(--fcw-shadow-lg)" : undefined }} />;
    case "BUTTON":
      return <div style={{ ...baseStyle, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: config.buttonFill || "var(--fcw-color-primary)", color: config.buttonTextColor || "#fff", borderRadius: config.buttonBorderRadius || 8, fontSize: config.buttonFontSize || 14, fontWeight: 600 }}>{config.buttonText}</div>;
    case "SHAPE": {
      const shapeH = config.shapeType === "line" ? 4 : height;
      return <div style={{ ...baseStyle, height: shapeH, backgroundColor: config.shapeFill || "var(--fcw-color-primary)", opacity: config.shapeOpacity ?? 1, borderRadius: config.shapeType === "circle" ? "50%" : 4, border: config.shapeBorder ? `${config.shapeBorderWidth || 2}px solid ${config.shapeBorder}` : undefined }} />;
    }
    case "GALLERY": {
      const images = config.galleryImages || [];
      return (
        <div style={{ ...baseStyle, overflow: "hidden" }}>
          <div style={{ display: config.galleryLayout === "row" ? "flex" : "grid", gridTemplateColumns: config.galleryLayout !== "row" ? `repeat(auto-fill, minmax(60px, 1fr))` : undefined, gap: config.galleryGap || 8, overflowX: config.galleryLayout === "row" ? "auto" : undefined, height: "100%" }}>
            {images.map((img, i) => <div key={i} style={{ backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: config.galleryImageRadius || 4, aspectRatio: "1" }} />)}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
