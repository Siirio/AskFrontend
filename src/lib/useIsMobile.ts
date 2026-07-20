import { useEffect, useState } from "react";

/**
 * True on a phone-width viewport (below Tailwind's `sm` breakpoint, 640px).
 * A cross-cutting browser utility (viewport detection) — domain-free, so it
 * lives in `lib/` per the architecture decision table (§6), ready for the next
 * platform surface that needs a fly-out→flat or similar layout swap.
 *
 * Starts `false` so SSR and first client paint agree (a consumer that only
 * mounts its responsive branch after open — e.g. a dropdown — never mismatches);
 * it resolves to the real value in an effect and tracks changes live.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}
