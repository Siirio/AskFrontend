"use client";

import { MapPin } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

import { separateBadges, type SearchCardResponse } from "../model";

/**
 * The two-layer result card (platform-ui-design §3): brand layer (name, logo,
 * brand colour, badges) on top, decision layer (price, why it matched,
 * availability, branch/distance, the offer label) below.
 *
 * NON-INTERACTIVE in this slice (confirmed scope): the Product Card modal
 * (D10) belongs to `catalog` (roadmap slice #3, not built yet). No onClick,
 * no href — a reachable control must DO something (project lock), so this
 * card offers no click at all rather than a dead one. When `catalog` ships,
 * this component gains a `select`-style prop threaded from `CatalogPage`; the
 * data here does not change.
 *
 * **Client component since 2026-08-04, and the reason is infinite scroll, not
 * interactivity.** Pages 1..n are fetched in the browser and appended to the
 * list, so the same card has to render on the client — and rendering it there
 * with a second, client-side copy of this markup would be two implementations
 * of one object (P6.1). One component, used from both paths, is the honest
 * shape. Page 0 still arrives server-rendered inside the client island's
 * initial HTML, so first paint is unchanged.
 *
 * `locale` stays in the props even though `useTranslations` reads it from
 * context: `ResultSection` passes it down, and dropping it would ripple through
 * a component the Product Card (#3) is about to modify anyway.
 */
export function ResultCard({ card }: { card: SearchCardResponse }) {
  const t = useTranslations("search");
  // `hasActiveOffer` decides the offer tint — never a guess from badge text
  // (TINT IS INFORMATION lock; AUDIT_2 N8).
  const { badgeKeys, offerLabel } = separateBadges(
    card.badges,
    card.hasActiveOffer,
  );

  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        {/* Brand layer */}
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: card.brandColor }}
            aria-hidden="true"
          >
            {card.brandLogoUrl ? (
              <Image
                src={card.brandLogoUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-full object-cover"
              />
            ) : (
              card.businessName.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {card.businessName}
            </p>
            {card.categoryLabel ? (
              <p className="truncate text-xs text-foreground-subtle">
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
              <Badge key={key}>{t(key)}</Badge>
            ))}
          </div>
        ) : null}

        {/* Decision layer */}
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-foreground">
            {card.title}
          </p>
          {card.summary ? (
            <p className="line-clamp-2 text-sm text-foreground-muted">
              {card.summary}
            </p>
          ) : null}
        </div>

        {card.matchReasons.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {card.matchReasons.map((reason) => (
              <li
                key={reason}
                className="text-xs text-foreground-subtle before:mr-1 before:content-['—']"
              >
                {reason}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          {card.price !== null ? (
            <span className="text-lg font-semibold text-foreground tabular-nums">
              {card.price} {card.currency}
            </span>
          ) : (
            <span />
          )}
          {card.distanceMeters !== null ? (
            <span className="flex items-center gap-1 text-xs text-foreground-subtle">
              <MapPin className="size-3.5" aria-hidden="true" />
              {formatDistance(card.distanceMeters, t)}
            </span>
          ) : null}
        </div>

        {card.availability === "UNKNOWN" && card.availabilityWarning ? (
          <p className="text-xs text-warning">{card.availabilityWarning}</p>
        ) : null}
        {card.availability === "UNAVAILABLE" ? (
          <p className="text-xs text-destructive">{t("card.unavailable")}</p>
        ) : null}

        {(card.branchName || card.branchCity) && (
          <p className="text-xs text-foreground-subtle">
            {[card.branchName, card.branchCity].filter(Boolean).join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Real value only (slice lock) — this function is never called with null.
 *  The unit is a translated string (P9.3's "every user-facing string is an
 *  i18n key" applies to units too — ru/kk spell "km" differently). */
function formatDistance(meters: number, t: Translate): string {
  if (meters < 1000) {
    return t("card.distanceMeters", { value: Math.round(meters) });
  }
  return t("card.distanceKm", { value: (meters / 1000).toFixed(1) });
}
