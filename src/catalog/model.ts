/**
 * Catalog domain types and pure view-model logic for the Product Card modal
 * (D33 — the ONE and only presentation; there is no full-page card).
 *
 * `ProductCardData` deliberately DUPLICATES the relevant fields of
 * `SearchCardResponse` (`search/model.ts`) instead of importing it, and
 * `separateBadges` below duplicates `search/model.ts`'s function of the same
 * name. Both are the SAME wire data (backend `search/basic`'s
 * `SearchCardResponse` — D9, the backend is the data authority for both), but
 * `search/ui/ResultStream.tsx` already has to import `ProductCardModal` FROM
 * this slice (`@/catalog`) to render it over the Catalog Page. Catalog
 * importing a type back from `@/search` would close a cycle between the two
 * slices, which R5 forbids outright ("if two slices need each other... the
 * boundary is wrong — raise it"). Duplicating this small, closed shape here
 * keeps the dependency one-directional (search → catalog only) with zero
 * runtime cost — a `SearchCardResponse` value passed into a `ProductCardData`
 * prop type-checks structurally, no cast needed.
 *
 * Platform-neutral and DOM-free (D5), like every slice's model.ts.
 */

export type PurchaseDestination = {
  label: string;
  url: string;
};

export type CatalogImage = {
  id: string;
  url: string;
};

export type ProductCardData = {
  businessName: string;
  brandColor: string;
  brandLogoUrl: string | null;
  title: string;
  summary: string | null;
  images: CatalogImage[];
  purchaseDestinations: PurchaseDestination[];
  categoryLabel: string | null;
  price: number | null;
  currency: string | null;
  businessProfile: {
    description: string | null;
    number: string | null;
    email: string | null;
    instagramUrl: string | null;
    telegramUrl: string | null;
    websiteUrl: string | null;
  } | null;
  availability: "UNKNOWN" | "AVAILABLE" | "UNAVAILABLE";
  availabilityWarning: string | null;
  badges: string[];
  hasActiveOffer: boolean | null;
  distanceMeters: number | null;
  branchName: string | null;
  branchAddress: string | null;
  branchCity: string | null;
};

// ── Proceed to Purchase (G3, PRODUCT_VISION UF 2.1 append) ─────────────────

/**
 * `purchaseDestinations.length` decides the shape, per the owner ruling:
 * none → the chat fallback (slice #4, `@/chats` — not built yet, so
 * `"unavailable"` renders NOTHING here, never a disabled button — project
 * lock, "a reachable control must DO something"); one → go straight there;
 * several → a chooser modal, because a brand selling in multiple places must
 * not have that collapsed into one channel ASK picked for them.
 */
export type ProceedToPurchaseAction =
  | { kind: "direct"; destination: PurchaseDestination }
  | { kind: "choose"; destinations: PurchaseDestination[] }
  | { kind: "unavailable" };

export function resolvePurchaseAction(
  destinations: PurchaseDestination[],
): ProceedToPurchaseAction {
  const [only] = destinations;
  if (destinations.length === 0) return { kind: "unavailable" };
  if (destinations.length === 1 && only) {
    return { kind: "direct", destination: only };
  }
  return { kind: "choose", destinations };
}

// ── Badges — closed token set (duplicated from search/model.ts; see header) ─

const BADGE_I18N_KEYS: Record<string, string> = {
  OFFICIAL_CHANNEL: "badges.officialChannel",
  COMPLETE_CARD: "badges.completeCard",
  PICKUP: "badges.pickup",
};

/**
 * Same logic and same i18n keys as `search/model.ts`'s `separateBadges` — the
 * Product Card resolves the SAME `search.badges.*` translations (next-intl
 * namespaces are message-tree strings, not a slice-boundary import, so
 * reusing them here crosses no ESLint boundary). Only the mapping FUNCTION is
 * duplicated, to avoid the cross-slice cycle described above; the strings
 * themselves are not re-authored in `messages/*.json`.
 */
export function separateBadges(
  badges: string[],
  hasActiveOffer: boolean | null,
): { badgeKeys: string[]; offerLabel: string | null } {
  const offerLabel = hasActiveOffer === true ? (badges[0] ?? null) : null;
  const tokens = offerLabel === null ? badges : badges.slice(1);
  const badgeKeys = tokens
    .map((token) => BADGE_I18N_KEYS[token])
    .filter((key): key is string => key !== undefined);
  return { badgeKeys, offerLabel };
}
