"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

/**
 * Password input with an in-field visibility toggle (slice-private; auth is
 * the first consumer — D8 rule of three, same call as the agreement checkbox).
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
 */
export function PasswordInput({
  id,
  value,
  autoComplete,
  placeholder,
  invalid,
  describedBy,
  visible,
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
  onToggleVisible: () => void;
  onValueChange: (value: string) => void;
}) {
  const t = useTranslations("auth");
  const label = visible ? t("fields.hidePassword") : t("fields.showPassword");

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="pe-12"
        value={value}
        aria-invalid={invalid}
        aria-describedby={describedBy}
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
  );
}
