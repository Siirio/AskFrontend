import type { ReactNode } from "react";

/**
 * A labelled form field with an optional validation message — the auth forms'
 * one field shape (slice-private). Native `<label>`/`<p>`; every value is a
 * token (P9.2). The error is announced (`role="alert"`) and rendered in the
 * destructive colour, never invented visuals (P9.3).
 *
 * On ORANGE NEUMORPHISM (D25) the label steps DOWN to `foreground-muted` while
 * the input's own text is heavy and full-contrast. On the old bordered skin the
 * label had to be strong enough to compete with a hairline box; here the field
 * is a carved well that already announces itself, so a bold black label above
 * it just shouts. `ps-1` insets both label and error to sit over the field's
 * 16px inner padding rather than its outer edge.
 *
 * The error carries the id `{htmlFor}-error` (see fieldErrorId) so the input
 * can reference it via aria-describedby — role="alert" alone announces once
 * but never durably associates the message with the control.
 */

/** The ONE id convention binding an input to its Field error (P6.2). */
export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}
export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
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
      {children}
      {/* Rendered only when an error exists. A permanently reserved error line
          was tried (layout stability) and REVERTED by owner review 2026-07-16:
          +26px per field broke the form's rhythm — the compact spacing wins,
          the shift-on-error is accepted. */}
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
