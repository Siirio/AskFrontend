/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import type { ReactNode } from "react";

/**
 * A labelled form field with an optional validation message — the auth forms'
 * one field shape (slice-private). Native `<label>`/`<p>`; every value is a
 * token (P9.2). The error is announced (`role="alert"`) and rendered in the
 * destructive colour, never invented visuals (P9.3).
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
        <p
          id={fieldErrorId(htmlFor)}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
