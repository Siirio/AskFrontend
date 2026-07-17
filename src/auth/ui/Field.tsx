import type { ReactNode } from "react";

/**
 * A labelled form field with an optional validation message — the auth forms'
 * one field shape (slice-private). Native `<label>`/`<p>`; every value is a
 * token (P9.2). The error is announced (`role="alert"`) and rendered in the
 * destructive colour, never invented visuals (P9.3).
 */
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {/* Rendered only when an error exists. A permanently reserved error line
          was tried (layout stability) and REVERTED by owner review 2026-07-16:
          +26px per field broke the form's rhythm — the compact spacing wins,
          the shift-on-error is accepted. */}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
