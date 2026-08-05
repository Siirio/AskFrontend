"use client";

import { MapPin, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DraftBranch } from "../model";

/**
 * The drafted-branch list — shared between the map modal (adding more),
 * step 3's summary (reviewing what is already added), and step 5's read-only
 * recap. One shape, one place to change it, per the rule of three not
 * applying yet at three callers but the callers being genuinely the same
 * list, not ones that merely look alike (D8).
 *
 * `onRemove` and `onEdit` are both optional, for the same reason: step 5 is
 * explicitly read-only ("Back" through the earlier steps is the correction
 * path, RegisterStepReview's own header comment) and must not offer a
 * button that does nothing there — omitting them hides the actions rather
 * than the caller passing a no-op.
 *
 * `onEdit` (2026-08-05, item 11 — changing an already-drafted branch, not
 * just adding/removing one) opens the SAME `BranchMapModal` pre-filled,
 * rather than a second form — see that component's own header comment for
 * how the seed and the save-vs-add branching work.
 *
 * The leading `MapPin` (2026-08-05, owner report: "icons... to divide this
 * whole bunch of information fields") is the same glyph the delivery-city
 * chips carry one step up (`DeliveryCitiesField`) — both are places, so the
 * icon reads as one visual vocabulary across the two lists rather than a
 * decoration invented per component.
 */
export function BranchList({
  branches,
  onRemove,
  onEdit,
}: {
  branches: DraftBranch[];
  onRemove?: (draftId: string) => void;
  onEdit?: (branch: DraftBranch) => void;
}) {
  const t = useTranslations("businessCabinet");

  if (branches.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {branches.map((branch) => (
        <li
          key={branch.draftId}
          className="neu-row flex items-center gap-3 px-3 py-2.5"
        >
          <MapPin
            aria-hidden="true"
            className="size-4 shrink-0 text-foreground-subtle"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {branch.name}
            </span>
            <span className="text-xs text-foreground-subtle">
              {branch.address}
            </span>
            {branch.addressDetails ? (
              <span className="text-xs text-foreground-subtle">
                {branch.addressDetails}
              </span>
            ) : null}
          </div>
          {onEdit ? (
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full opacity-70 focus-ring hover:opacity-100"
              onClick={() => onEdit(branch)}
              aria-label={t("branchModal.editBranch", { name: branch.name })}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full opacity-70 focus-ring hover:opacity-100"
              onClick={() => onRemove(branch.draftId)}
              aria-label={t("branchModal.removeBranch", { name: branch.name })}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
