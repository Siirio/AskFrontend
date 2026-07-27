import type { ReactNode } from "react";

/**
 * A labelled form field with an optional validation message — this slice's one
 * field shape.
 *
 * A near-copy of `auth/ui/Field.tsx`, and deliberately so (D8): the two share a
 * LOOK, not knowledge. Nothing about the auth form's field would have to change
 * if this one changed, and vice versa; importing across the boundary would
 * couple two slices to keep one visual detail in step, and promoting it to
 * `shared/ui` on the second consumer jumps the rule of three. If a third field
 * shape appears, promote then — the values already live in the design system,
 * so the shared primitive will match both by construction (P9.2).
 *
 * The error carries the id `{htmlFor}-error` (see fieldErrorId) so the input can
 * reference it via aria-describedby — role="alert" alone announces once but
 * never durably associates the message with the control.
 */

/** The ONE id convention binding an input to its Field error (P6.2). */
export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  /** Standing guidance shown under the label — not a validation result. */
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="ps-1 text-sm font-semibold text-foreground-muted"
      >
        {label}
      </label>
      {hint ? (
        <p className="-mt-1 ps-1 text-xs text-foreground-subtle">{hint}</p>
      ) : null}
      {children}
      {error ? (
        <p
          id={fieldErrorId(htmlFor)}
          role="alert"
          className="ps-1 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
