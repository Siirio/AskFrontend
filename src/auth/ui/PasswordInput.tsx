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
 */
export function PasswordInput({
  id,
  value,
  autoComplete,
  placeholder,
  invalid,
  visible,
  onToggleVisible,
  onChange,
}: {
  id: string;
  value: string;
  autoComplete: string;
  placeholder?: string;
  invalid: boolean;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("auth");
  const label = visible ? t("fields.hidePassword") : t("fields.showPassword");

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="h-11 pe-11 text-base"
        value={value}
        aria-invalid={invalid}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        data-testid={`${id}-toggle`}
        aria-label={label}
        title={label}
        onClick={onToggleVisible}
        className="absolute inset-y-0 inset-e-0 flex w-11 cursor-pointer items-center justify-center rounded-xs text-foreground-muted focus-ring transition-colors hover:text-foreground"
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
