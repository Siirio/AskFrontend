export type CardBlockType = "HERO" | "DROPS" | "BRANCHES" | "SERVICES" | "CONTACTS" | "GALLERY" | "ABOUT";

export type BlockShape = "rectangle" | "rounded" | "full-width" | "split";
export type TextAlignment = "left" | "center" | "right";
export type FontFamily = "inter" | "serif" | "mono";
export type HeroLayout = "centered" | "left" | "split";

export interface DropItem {
  localId: string;
  name: string;
  image?: string;
  price?: string;
  status?: string;
}

export interface BranchItem {
  localId: string;
  name: string;
  address: string;
  city: string;
  hours?: string;
}

export interface ServiceItem {
  localId: string;
  name: string;
  description?: string;
  price?: string;
  duration?: string;
}

export interface ContactItem {
  localId: string;
  provider: string;
  url: string;
  label: string;
}

export interface CardBlockConfig {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  alignment?: TextAlignment;
  shape?: BlockShape;
  height?: number;
  width?: number;
  hidden?: boolean;
  heroImage?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroLayout?: HeroLayout;
  drops?: DropItem[];
  branches?: BranchItem[];
  services?: ServiceItem[];
  contacts?: ContactItem[];
  images?: string[];
  aboutTitle?: string;
  aboutText?: string;
}

export interface CardBlock {
  localId: string;
  blockType: CardBlockType;
  displayOrder: number;
  config: CardBlockConfig;
}

export interface BusinessCardDto {
  businessId: string;
  blocks: CardBlock[];
  publishedAt?: string | null;
}
