"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

import { separateBadges, type ProductCardData } from "../model";
import { PurchaseAction } from "./PurchaseAction";

/**
 * The Product Card (UF 2.1 step 3) — the ONE and only presentation is this
 * modal (D33, supersedes D10; there is no full-page `/app/product/:id`).
 * Opened from `ResultCard` (`@/search`), rendered from the SAME
 * `SearchCardResponse` the Catalog Page already fetched — no new request.
 *
 * Same two-layer grammar as `ResultCard` (platform-ui-design §3), with more
 * room: full `summary` (no line-clamp), the up-to-3 image gallery in full
 * (the row only ever shows `images[0]`), and the business's own contact
 * details. `card.badges`/`hasActiveOffer` reuse the identical
 * `separateBadges` logic `ResultCard` uses — duplicated in `../model.ts`
 * rather than imported, see that file's header for why (R5 — cross-slice
 * cycle avoidance). No `matchReasons` anywhere (owner reversal, 2026-08-06).
 *
 * No chat button in this pass — deferred to slice #4 (`@/chats`, see
 * `PurchaseAction`'s own comment and `features/catalog/locks.md`).
 */
export function ProductCardModal({
  card,
  onOpenChange,
}: {
  card: ProductCardData;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("catalog");
  const tSearch = useTranslations("search");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { badgeKeys, offerLabel } = separateBadges(
    card.badges,
    card.hasActiveOffer,
  );
  const activeImage = card.images[activeImageIndex] ?? card.images[0] ?? null;
  const branchLine = [card.branchName, card.branchAddress, card.branchCity]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Gallery — up to 3 images, first primary (seller-ordered, never
              re-sorted). A card with no image is a first-class state, same
              rule `ResultCard` applies: no placeholder box. */}
          {activeImage ? (
            <div className="flex flex-col gap-2">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-md">
                <Image
                  src={activeImage.url}
                  alt={card.title}
                  fill
                  sizes="(min-width: 640px) 36rem, 90vw"
                  className="object-cover"
                />
              </div>
              {card.images.length > 1 ? (
                <div className="flex gap-2">
                  {card.images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={t("modal.galleryImage", {
                        number: index + 1,
                      })}
                      aria-pressed={index === activeImageIndex}
                      className={cn(
                        "neu-row focus-ring relative size-14 shrink-0 overflow-hidden rounded-md transition",
                        index === activeImageIndex
                          ? "opacity-100"
                          : "opacity-60 hover:opacity-90",
                      )}
                    >
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes="3.5rem"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Brand layer */}
          <div className="flex items-center gap-3">
            {/* Not `.neu-avatar` — that class carries the accent GRADIENT and
                is reserved for text-free fills (Locks.md's "saturation is
                action" carve-out). This circle shows the business's OWN
                brand colour plus initials TEXT, same as `ResultCard`'s
                identical brand-layer avatar — plain inline background, no
                neumorphic class. */}
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
              style={{ backgroundColor: card.brandColor }}
              aria-hidden="true"
            >
              {card.brandLogoUrl ? (
                <Image
                  src={card.brandLogoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                card.businessName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {card.businessName}
              </p>
              {card.categoryLabel ? (
                <p className="truncate text-sm text-foreground-subtle">
                  {card.categoryLabel}
                </p>
              ) : null}
            </div>
            {offerLabel ? (
              <span className="rounded-xs bg-offer px-2 py-1 text-xs font-bold text-offer-foreground tabular-nums">
                {offerLabel}
              </span>
            ) : null}
          </div>

          {badgeKeys.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {badgeKeys.map((key) => (
                <Badge key={key}>{tSearch(key)}</Badge>
              ))}
            </div>
          ) : null}

          {/* Decision content */}
          {card.summary ? (
            <p className="text-sm text-foreground-muted">{card.summary}</p>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            {card.price !== null ? (
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {card.price} {card.currency}
              </span>
            ) : (
              <span />
            )}
            {card.distanceMeters !== null ? (
              <span className="flex items-center gap-1 text-sm text-foreground-subtle">
                <MapPin className="size-4" aria-hidden="true" />
                {formatDistance(card.distanceMeters, tSearch)}
              </span>
            ) : null}
          </div>

          {card.availability === "UNKNOWN" && card.availabilityWarning ? (
            <p className="text-sm text-warning">{card.availabilityWarning}</p>
          ) : null}
          {card.availability === "UNAVAILABLE" ? (
            <p className="text-sm text-destructive">
              {tSearch("card.unavailable")}
            </p>
          ) : null}

          {branchLine ? (
            <p className="text-sm text-foreground-subtle">{branchLine}</p>
          ) : null}

          {card.businessProfile ? (
            <BusinessInfo
              profile={card.businessProfile}
              aboutLabel={t("modal.about")}
            />
          ) : null}

          <PurchaseAction destinations={card.purchaseDestinations} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Contact facts the business itself published — description, phone, email,
 *  social/site links. Every field is optional and simply omitted when null;
 *  the whole section is omitted by the caller when `businessProfile` is
 *  null. Renders as a `.neu-row` panel, not a nested `.neu-card` — the modal
 *  itself is already `.neu-card`, and stacking two would double the shadow. */
function BusinessInfo({
  profile,
  aboutLabel,
}: {
  profile: NonNullable<ProductCardData["businessProfile"]>;
  aboutLabel: string;
}) {
  const links = [
    profile.websiteUrl,
    profile.instagramUrl,
    profile.telegramUrl,
  ].filter((url): url is string => Boolean(url));

  if (!profile.description && !profile.number && !profile.email && links.length === 0) {
    return null;
  }

  return (
    <div className="neu-row flex flex-col gap-2 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{aboutLabel}</p>
      {profile.description ? (
        <p className="text-sm text-foreground-muted">{profile.description}</p>
      ) : null}
      {profile.number ? (
        <a
          href={`tel:${profile.number}`}
          className="focus-ring text-sm text-accent underline-offset-4 hover:underline"
        >
          {profile.number}
        </a>
      ) : null}
      {profile.email ? (
        <a
          href={`mailto:${profile.email}`}
          className="focus-ring text-sm text-accent underline-offset-4 hover:underline"
        >
          {profile.email}
        </a>
      ) : null}
      {links.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {links.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring text-sm text-accent underline-offset-4 hover:underline"
            >
              {url}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Duplicated from `search/ui/ResultCard.tsx` (private there, so it cannot be
 *  imported even in-slice, let alone across the R5 boundary) — same reasoning
 *  as `../model.ts`'s header. */
function formatDistance(meters: number, t: Translate): string {
  if (meters < 1000) {
    return t("card.distanceMeters", { value: Math.round(meters) });
  }
  return t("card.distanceKm", { value: (meters / 1000).toFixed(1) });
}
