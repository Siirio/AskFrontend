"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DraftBranch } from "../model";

/**
 * The drafted-branch list — shared between the map modal (adding more) and
 * step 3's summary (reviewing what is already added). One shape, one place
 * to change it, per the rule of three not applying yet at two callers but
 * the two callers being genuinely the same list, not two that merely look
 * alike (D8).
 */
export function BranchList({
  branches,
  onRemove,
}: {
  branches: DraftBranch[];
  onRemove: (draftId: string) => void;
}) {
  const t = useTranslations("businessCabinet");

  if (branches.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {branches.map((branch) => (
        <li
          key={branch.draftId}
          className="neu-row flex items-center justify-between gap-3 px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {branch.name}
            </span>
            <span className="text-xs text-foreground-subtle">
              {branch.address}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full opacity-70 focus-ring hover:opacity-100"
            onClick={() => onRemove(branch.draftId)}
            aria-label={t("branchModal.removeBranch", { name: branch.name })}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
