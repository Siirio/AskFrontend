import type { ReactNode } from "react";

/**
 * A labelled filter-panel field — this slice's one field shape.
 *
 * A near-copy of `business-cabinet/ui/Field.tsx` (itself a copy of
 * `auth/ui/Field.tsx`), deliberately (D8): the three share a LOOK, not
 * knowledge. Promote to `shared/ui` only if a fourth copy appears — the rule
 * of three, not the second consumer (§5).
 */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
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
    </div>
  );
}
