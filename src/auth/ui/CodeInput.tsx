"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * The 6-digit verification code field — one cell per digit (the neumorui
 * OTPInput pattern), slice-private to auth. D8 rule of three: auth is the only
 * consumer, so it stays here; its LOOK is `.neu-otp-cell` in
 * design-system/neumorphism.css, so a future shared primitive already matches.
 *
 * WHY SIX INPUTS AND NOT ONE. A single `maxLength={6}` field is simpler, and it
 * was what this form used before. Six cells earn the extra code because the
 * failure they prevent is the common one: a person reads the code off another
 * device four digits at a time, and a single field gives no landmark for where
 * they stopped. A filled cell presses IN, so the progress is legible without
 * counting characters.
 *
 * THE STATE MODEL. There is exactly ONE piece of state and the caller owns it:
 * `value`, a string of 0–6 digits. The cells are a VIEW of that string
 * (`value[i]`), never six independent states — which is the bug this component
 * exists to not have. Focus is the only thing tracked imperatively, and only
 * because moving focus is a DOM action, not data.
 *
 * WHAT IT HANDLES, all of which real users do:
 *  - typing: fills the cell and advances;
 *  - PASTE anywhere in the group: takes the digits out of whatever was pasted
 *    ("123 456", "Your code is 123456") and fills from the start. This is the
 *    single most common way a code is entered on desktop, and a naive
 *    per-cell field drops all but the first character;
 *  - iOS/Android SMS autofill: `autoComplete="one-time-code"` on the FIRST cell
 *    only — the platform fills it with the whole code, which arrives here as a
 *    multi-character change and is handled by the same path as paste;
 *  - Backspace on an empty cell: clears the previous one and steps back;
 *  - arrow keys and Home/End for correcting a middle digit.
 *
 * ACCESSIBILITY. Each cell states its own position ("Digit 3 of 6"), so a
 * screen-reader user is never lost among six identically-named boxes; the
 * FIRST cell also carries the caller's `id`, which is what the Field's
 * `<label>` and its error are bound to. There is deliberately no wrapping
 * `role="group"`: a group is only useful with an accessible name, and naming it
 * would repeat the Field label that already announces on entry.
 * `inputMode="numeric"` raises the number pad without `type="number"`, which
 * would add spinners and accept "e" and "-".
 */
export function CodeInput({
  id,
  value,
  length = 6,
  invalid,
  describedBy,
  disabled,
  digitLabel,
  onValueChange,
  onComplete,
}: {
  id: string;
  value: string;
  length?: number;
  invalid?: boolean;
  /** id of the field's error message (aria-describedby), when one shows. */
  describedBy?: string;
  disabled?: boolean;
  /** Localised, positional: (position, total) => "Digit 3 of 6". */
  digitLabel: (position: number, total: number) => string;
  onValueChange: (value: string) => void;
  /** Fired once the last digit lands — lets the caller submit without a click. */
  onComplete?: (value: string) => void;
}) {
  const cells = useRef<(HTMLInputElement | null)[]>([]);

  const focusCell = (index: number) => {
    const target = cells.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  /** The one place `value` is written. Digits only, never longer than `length`. */
  const commit = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onValueChange(clean);
    focusCell(focusIndex);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // More than one digit means a paste or an SMS autofill landed in this cell
    // — fill forward from here rather than keeping only the first character.
    if (digits.length > 1) {
      const next = value.slice(0, index) + digits;
      commit(next, index + digits.length);
      return;
    }

    // Replace this position; pad with what is already there so typing into an
    // empty middle cell cannot leave a hole in the string.
    const next = (
      value.padEnd(index, " ").slice(0, index) +
      digits +
      value.slice(index + 1)
    ).replace(/ /g, "");
    commit(next, index + 1);
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (value[index]) {
        // Clear the cell you are on, and stay.
        commit(value.slice(0, index) + value.slice(index + 1), index);
      } else {
        // Already empty — clear the one behind and step back.
        commit(value.slice(0, Math.max(0, index - 1)), index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusCell(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusCell(value.length);
    }
  };

  // Bound on every cell, not just the first: people paste into whichever box
  // they happen to have clicked, and a code always fills from the start.
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    event.preventDefault();
    commit(digits, digits.length);
  };

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          // The first cell carries the form id so the Field's <label> focuses
          // the box a person would start typing in.
          id={index === 0 ? id : `${id}-${index}`}
          ref={(node) => {
            cells.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          // one-time-code on the FIRST cell only — repeating it invites the
          // platform to autofill each box with the whole code.
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // Not maxLength={1}: a paste or SMS autofill must be allowed to land
          // as a multi-character change so handleChange can spread it.
          aria-label={digitLabel(index + 1, length)}
          aria-invalid={invalid || undefined}
          aria-describedby={index === 0 ? describedBy : undefined}
          disabled={disabled}
          data-filled={Boolean(value[index])}
          data-testid={`${id}-cell-${index}`}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className="neu-otp-cell"
        />
      ))}
    </div>
  );
}
