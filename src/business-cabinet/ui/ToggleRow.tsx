"use client";

import type { ComponentType } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A full-width, single boolean toggle — "Only online" (step 3) and "I confirm
 * this information is accurate" (step 5) both read as a single yes/no
 * decision that deserves its own row, not a small chip competing for width
 * with everything else on the page (2026-07-29, replacing the original chip
 * treatment on both).
 *
 * `indicator="switch"` reads as a MODE (on/off, step 3's online-only);
 * `indicator="checkbox"` reads as a CONFIRMATION (step 5's agreement) — both
 * built on the neumorui primitives already in design-system/neumorphism.css
 * (`.neu-switch-*`, `.neu-checkbox-box`), unused until now. The row itself
 * carries the interactive role; the indicator glyph is presentational.
 */
export function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
  indicator,
  invalid,
  describedBy,
  testId,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  description?: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  indicator: "switch" | "checkbox";
  invalid?: boolean;
  describedBy?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      data-active={checked}
      data-testid={testId}
      onClick={() => onToggle(!checked)}
      className={cn(
        "neu-row flex w-full min-h-16 items-center gap-3.5 px-4 py-3.5 text-start focus-ring",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
          checked ? "text-accent" : "text-foreground-subtle",
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>

      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {description ? (
          <span className="text-xs text-foreground-subtle">
            {description}
          </span>
        ) : null}
      </span>

      {indicator === "switch" ? (
        <span aria-hidden="true" className="neu-switch-track" data-on={checked}>
          <span className="neu-switch-thumb" data-on={checked} />
        </span>
      ) : (
        <span aria-hidden="true" className="neu-checkbox-box" data-on={checked}>
          {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      )}
    </button>
  );
}
