/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The Loading primitive's active form (its passive form is Skeleton). Own code,
 * not a shadcn scaffold — it is one lucide icon and one Tailwind class.
 *
 * `label` is REQUIRED and the caller translates it: shared/ui chrome carries no
 * hardcoded copy (§7 i18n), and Spinner stays server-safe by not reading i18n
 * itself — the consuming component already has `useTranslations`.
 *
 * `animate-spin` is a built-in transform (rotate), so it is exempt from the
 * transform/opacity animation lock — it never touches layout — and needs no
 * GSAP. It freezes under the global prefers-reduced-motion gate. `currentColor`
 * means it inherits the text colour of wherever it is placed, so it needs no
 * colour token of its own.
 */
function Spinner({
  className,
  label,
  ...props
}: React.ComponentProps<"span"> & { label: string }) {
  return (
    <span
      data-slot="spinner"
      role="status"
      className={cn("inline-flex", className)}
      {...props}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export { Spinner };
