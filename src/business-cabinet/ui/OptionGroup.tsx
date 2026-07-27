"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A single-choice segmented control — the shape for the two closed enumerations
 * this form asks about (what the business sells; its legal form).
 *
 * A native `<select>` was the alternative and loses on both counts that matter
 * here: the option sets are two and three items long, so hiding them behind a
 * popover costs a tap to reveal information that fits on the line; and each
 * option carries a HINT, which a select cannot show at all. The legal-form
 * hints are the part people actually decide on.
 *
 * On ORANGE NEUMORPHISM the vocabulary already exists: `.neu-tab-list` is one
 * carved groove and the selected `.neu-tab-trigger` presses INTO it and takes
 * the accent on its label — the same depth-marks-the-choice grammar the role
 * modal uses. No border, no tint.
 *
 * Keyboard: a roving tabindex with arrow keys, per the WAI radiogroup pattern —
 * one Tab stop for the group, arrows move AND select within it.
 */
export function OptionGroup<T extends string>({
  name,
  label,
  value,
  options,
  invalid,
  describedBy,
  onChange,
}: {
  /** Used for the option test ids; not a native form name (these are buttons). */
  name: string;
  /** Accessible name for the group itself. */
  label: string;
  value: T | null;
  options: { value: T; label: string; hint?: string }[];
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: T) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (delta: number) => {
    const index = options.findIndex((o) => o.value === value);
    // Nothing chosen yet: an arrow key enters the group at the first option
    // rather than doing nothing, so the control is reachable without a pointer.
    const next =
      index === -1 ? 0 : (index + delta + options.length) % options.length;
    const target = options[next].value;
    onChange(target);
    refs.current[target]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className="neu-tab-list flex w-full flex-col gap-1 p-1.5 sm:flex-row"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: the selected option is the group's Tab stop, or
            // the first one while nothing is selected.
            tabIndex={selected || (value === null && index === 0) ? 0 : -1}
            data-testid={`${name}-${option.value}`}
            data-active={selected}
            ref={(node) => {
              refs.current[option.value] = node;
            }}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              // min-h-11 holds the 44px touch floor (platform §7); the column
              // layout below `sm` keeps three legal-form labels from crushing
              // on a phone, where ru and kk both run long.
              "neu-tab-trigger flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-center focus-ring",
            )}
          >
            <span>{option.label}</span>
            {option.hint ? (
              <span
                className={cn(
                  "text-xs font-medium text-balance",
                  selected ? "text-accent" : "text-foreground-subtle",
                )}
              >
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
