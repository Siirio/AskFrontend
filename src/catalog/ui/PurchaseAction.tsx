"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

import { resolvePurchaseAction, type PurchaseDestination } from "../model";

/**
 * The "Proceed to Purchase" control (G3, PRODUCT_VISION UF 2.1 append).
 *
 * `resolvePurchaseAction` decides the shape from `destinations.length`:
 * `"unavailable"` (0) renders NOTHING — the zero-destination chat fallback
 * belongs to slice #4 (`@/chats` has no `index.ts` yet, R2), and a reachable
 * control that goes nowhere is forbidden (project lock). `"direct"` (1) is a
 * plain external link. `"choose"` (2+) opens a chooser — a brand selling in
 * several places must not have that collapsed into one channel ASK picked.
 */
export function PurchaseAction({
  destinations,
}: {
  destinations: PurchaseDestination[];
}) {
  const t = useTranslations("catalog");
  const [chooserOpen, setChooserOpen] = useState(false);
  const action = resolvePurchaseAction(destinations);

  if (action.kind === "unavailable") return null;

  if (action.kind === "direct") {
    return (
      <Button asChild size="lg">
        <a
          href={action.destination.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("modal.proceedToPurchase")}
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" onClick={() => setChooserOpen(true)}>
        {t("modal.proceedToPurchase")}
      </Button>
      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("modal.chooserTitle")}</DialogTitle>
            <DialogDescription>
              {t("modal.chooserDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {action.destinations.map((destination, index) => (
              <a
                key={`${index}-${destination.label}`}
                href={destination.url}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-row focus-ring flex min-h-11 items-center px-4 py-3 text-sm font-medium text-foreground transition hover:opacity-90"
              >
                {destination.label}
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
