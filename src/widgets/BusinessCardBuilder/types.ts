export type ElementType = "TEXT" | "IMAGE" | "BUTTON" | "SHAPE" | "GALLERY";
export type FontFamily = "sans" | "serif" | "mono" | "display" | "rounded" | "handwritten";
export type TextAlignment = "left" | "center" | "right";
export type PinH = "left" | "center" | "right" | "scale";
export type PinV = "top" | "center" | "bottom" | "scale";
export type ShapeType = "rectangle" | "circle" | "line";
export type ImageFit = "cover" | "contain" | "fill";
export type GalleryLayout = "grid" | "row" | "carousel";

export interface ElementConfig {
  text?: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  fontWeight?: number;
  textColor?: string;
  textAlignment?: TextAlignment;
  imageUrl?: string;
  imageFit?: ImageFit;
  imageBorderRadius?: number;
  imageShadow?: boolean;
  buttonText?: string;
  buttonUrl?: string;
  buttonFill?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: number;
  buttonFontSize?: number;
  shapeType?: ShapeType;
  shapeFill?: string;
  shapeBorder?: string;
  shapeBorderWidth?: number;
  shapeOpacity?: number;
  galleryLayout?: GalleryLayout;
  galleryImages?: string[];
  galleryGap?: number;
  galleryImageRadius?: number;
  galleryBackground?: string;
}

export interface CanvasElement {
  localId: string;
  elementType: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  pinH: PinH;
  pinV: PinV;
  visible: boolean;
  locked: boolean;
  config: ElementConfig;
}

export interface CanvasSection {
  localId: string;
  name: string;
  displayOrder: number;
  backgroundColor: string;
  backgroundImage?: string;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  maxWidth?: number;
  borderRadius?: number;
  opacity?: number;
  elements: CanvasElement[];
}

export interface BusinessCardDto {
  businessId: string;
  sections: CanvasSection[];
  publishedAt?: string | null;
}

export function createSection(order: number): CanvasSection {
  return {
    localId: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    displayOrder: order,
    backgroundColor: "transparent",
    height: 400,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
    borderRadius: 0,
    opacity: 100,
    elements: [],
  };
}

export function createElement(type: ElementType, overrides?: Partial<CanvasElement>): CanvasElement {
  const base: CanvasElement = {
    localId: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    elementType: type,
    x: 0,
    y: 0,
    width: 200,
    height: type === "TEXT" ? 40 : type === "BUTTON" ? 44 : type === "SHAPE" ? 100 : 150,
    rotation: 0,
    zIndex: 1,
    pinH: "left",
    pinV: "top",
    visible: true,
    locked: false,
    config: {},
  };

  if (type === "TEXT") {
    base.config = { text: "Hello World", fontFamily: "sans", fontSize: 16, textColor: "var(--fcw-color-text)", textAlignment: "left" };
  } else if (type === "BUTTON") {
    base.config = { buttonText: "Click me", buttonFill: "var(--fcw-color-primary)", buttonTextColor: "#fff", buttonBorderRadius: 8, buttonFontSize: 14 };
  } else if (type === "SHAPE") {
    base.config = { shapeType: "rectangle", shapeFill: "var(--fcw-color-primary)", shapeOpacity: 1 };
  } else if (type === "IMAGE") {
    base.config = { imageFit: "cover", imageBorderRadius: 0 };
  } else if (type === "GALLERY") {
    base.width = 300;
    base.height = 200;
    base.config = { galleryLayout: "grid", galleryImages: [], galleryGap: 8, galleryImageRadius: 4 };
  }

  return { ...base, ...overrides, config: { ...base.config, ...(overrides?.config || {}) } };
}

export const FONT_FAMILIES: { value: FontFamily; label: string; css: string }[] = [
  { value: "sans", label: "Sans", css: "Inter, sans-serif" },
  { value: "serif", label: "Serif", css: "Georgia, serif" },
  { value: "mono", label: "Mono", css: "'JetBrains Mono', monospace" },
  { value: "display", label: "Display", css: "'Clash Display', sans-serif" },
  { value: "rounded", label: "Rounded", css: "'Nunito', sans-serif" },
  { value: "handwritten", label: "Hand", css: "'Caveat', cursive" },
];

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72];

export const PIN_H_OPTIONS: { value: PinH; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "scale", label: "Scale" },
];

export const PIN_V_OPTIONS: { value: PinV; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "scale", label: "Scale" },
];

// Legacy types for backward compat
export type CardBlockType = "HERO" | "DROPS" | "BRANCHES" | "SERVICES" | "CONTACTS" | "GALLERY" | "ABOUT";
export type BlockShape = "rectangle" | "rounded" | "full-width" | "split";

export interface DropItem { localId: string; name: string; image?: string; price?: string; status?: string; }
export interface BranchItem { localId: string; name: string; address: string; city: string; hours?: string; }
export interface ServiceItem { localId: string; name: string; description?: string; price?: string; duration?: string; }
export interface ContactItem { localId: string; provider: string; url: string; label: string; }

export interface CardBlockConfig {
  backgroundColor?: string; textColor?: string; fontFamily?: string; fontSize?: number;
  alignment?: string; shape?: string; height?: number; width?: number; hidden?: boolean;
  heroImage?: string; heroTitle?: string; heroSubtitle?: string; heroCtaText?: string; heroLayout?: string;
  drops?: DropItem[]; branches?: BranchItem[]; services?: ServiceItem[]; contacts?: ContactItem[];
  images?: string[]; aboutTitle?: string; aboutText?: string;
}

export interface CardBlock {
  localId: string;
  blockType: CardBlockType;
  displayOrder: number;
  config: CardBlockConfig;
}
