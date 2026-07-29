export type PlatformSection = "summary" | "businesses" | "chats" | "accounts" | "team";

export type PlatformRiskSeverity = "REVIEW" | "CRITICAL";

export type PlatformSectionEventCount = {
  review: number;
  critical: number;
};

export type PlatformEventCounts = Record<PlatformSection, PlatformSectionEventCount>;

export type PlatformNavigationItem = {
  section: PlatformSection;
  permission?: string;
};

export const PLATFORM_NAVIGATION: PlatformNavigationItem[] = [
  { section: "summary" },
  { section: "businesses" },
  { section: "chats", permission: "MANAGE_SUPPORT_CHATS" },
  { section: "accounts", permission: "MODERATE_APP_USERS" },
  { section: "team", permission: "MANAGE_PLATFORM_USERS" },
];

export const PLATFORM_CHAT_TABS = [
  { type: "PLATFORM_SUPPORT", labelKey: "platform.chats.tabs.support" },
  { type: "MANAGED_IMPORT", labelKey: "platform.chats.tabs.import" },
  { type: "GENERAL_SUPPORT", labelKey: "platform.chats.tabs.general" },
] as const;

export const EMPTY_PLATFORM_EVENT_COUNTS: PlatformEventCounts = {
  summary: { review: 0, critical: 0 },
  businesses: { review: 0, critical: 0 },
  chats: { review: 0, critical: 0 },
  accounts: { review: 0, critical: 0 },
  team: { review: 0, critical: 0 },
};

