"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import { passwordStrength } from "../model";

/**
 * Password input with an in-field visibility toggle and an optional strength
 * meter (slice-private; auth is the first consumer — D8 rule of three, same
 * call as the agreement checkbox).
 *
 * Visibility is CONTROLLED by the caller: the register form shares ONE state
 * between password and confirmation, so either eye flips both fields together;
 * the login form owns a single state.
 *
 * The toggle is a full-height 44px hit area inside the field (platform §7
 * touch floor); the input pads end-side so text never runs under it. The
 * label flips show/hide (no aria-pressed — WAI pattern for flipping labels).
 *
 * The change prop is `onValueChange` (a string), NOT `onChange`: reusing the
 * native name with different semantics is the trap P3.1 warns about — a
 * caller would reasonably expect an event.
 *
 * `showStrength` (owner request 2026-07-27, adopting neumorui's PasswordInput)
 * is OPT-IN and belongs on exactly one field in the product: sign-up's new
 * password. Rating the password someone is recalling — the login field, or the
 * confirmation, which is a transcription of the field above it — tells them
 * nothing they can act on and reads as the form grading them at the door.
 */
export function PasswordInput({
  id,
  value,
  autoComplete,
  placeholder,
  invalid,
  describedBy,
  visible,
  showStrength = false,
  onToggleVisible,
  onValueChange,
}: {
  id: string;
  value: string;
  autoComplete: string;
  placeholder?: string;
  invalid: boolean;
  /** id of the field's error message (aria-describedby), when one shows. */
  describedBy?: string;
  visible: boolean;
  /** Render the strength meter under the field. Sign-up's new password only. */
  showStrength?: boolean;
  onToggleVisible: () => void;
  onValueChange: (value: string) => void;
}) {
  const t = useTranslations("auth");
  const label = visible ? t("fields.hidePassword") : t("fields.showPassword");
  const strength = passwordStrength(value);
  const meterShown = showStrength && strength.level !== null;
  const strengthId = `${id}-strength`;
  // The meter's verdict is a DESCRIPTION of the field, not an announcement of
  // its own: appended to aria-describedby so a screen-reader user hears it when
  // they arrive at the input, rather than having every keystroke narrated by a
  // live region. The error keeps its place first — a validation failure is the
  // more urgent of the two.
  const describedByIds =
    [describedBy, meterShown ? strengthId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="pe-12"
          value={value}
          aria-invalid={invalid}
          aria-describedby={describedByIds}
          placeholder={placeholder}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <button
          type="button"
          data-testid={`${id}-toggle`}
          aria-label={label}
          title={label}
          onClick={onToggleVisible}
          // The toggle sits INSIDE the carved field, so it gets no surface of its
          // own — a raised button in a well would read as a second control. Ink
          // alone marks it; `inset-y-1 inset-e-1` keeps it clear of the inset shadow
          // at the field's edge, and w-11 holds the 44px touch floor.
          className="absolute inset-y-1 inset-e-1 flex w-11 cursor-pointer items-center justify-center rounded-md text-foreground-subtle focus-ring transition-colors hover:text-foreground"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4.5" />
          ) : (
            <Eye aria-hidden="true" className="size-4.5" />
          )}
        </button>
      </div>

      {/* The meter appears only once there is something to measure, so an
          untouched sign-up form is not pre-judging an empty field. It reserves
          no space when hidden — the same call Field made about the error line
          (owner review 2026-07-16): the compact rhythm wins over layout
          stability on a form this tall. */}
      {meterShown ? (
        <div className="flex items-center gap-3 ps-1">
          {/* The track is decorative — every fact it carries is in the label
              beside it, which IS exposed (aria-describedby above). */}
          <div aria-hidden="true" className="neu-meter-track grow">
            <div
              className="neu-meter-fill"
              data-level={strength.level}
              style={{ width: `${(strength.score / 5) * 100}%` }}
            />
          </div>
          <p
            id={strengthId}
            data-level={strength.level}
            data-testid={strengthId}
            className="neu-meter-label"
          >
            {t(`fields.strength.${strength.level}`)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
