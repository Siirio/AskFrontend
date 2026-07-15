import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The Loading primitive's active form (its passive form is Skeleton). Own code,
 * not a shadcn scaffold — it is one lucide icon and one Tailwind class.
 *
 * `animate-spin` is a built-in transform (rotate), so it is exempt from the
 * transform/opacity animation lock — it never touches layout — and needs no
 * GSAP. It freezes under the global prefers-reduced-motion gate. `currentColor`
 * means it inherits the text colour of wherever it is placed, so it needs no
 * colour token of its own.
 */
function Spinner({
  className,
  label = "Загрузка…",
  ...props
}: React.ComponentProps<"span"> & { label?: string }) {
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
