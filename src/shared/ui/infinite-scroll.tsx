"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

/*
 * Scroll-to-load-more, as an IntersectionObserver sentinel.
 *
 * ── PROVENANCE (D12) ───────────────────────────────────────────────────────
 * The PROP SHAPE is taken from `neumorui`'s InfiniteScroll
 * (https://neumorui.vercel.app/docs/infinite-scroll) — `onLoadMore`, `hasMore`,
 * `loading`, `loader`, `endMessage`, `threshold`, `children`. Nothing else is.
 * The package is NOT installed (owner decision 2026-08-04): it ships
 * `NeuProvider` + `neumorui/styles` with a violet accent, which collides with
 * six design locks at once — the ORANGE accent lock, the measured-contrast lock
 * that `scripts/check-tokens.mjs` ENFORCES in `npm run build`, the single
 * visual source (D13), D21's one theme system, and the `neu-skin` placement
 * lock. It would also have pulled 18 transitive dependencies for what is, in
 * substance, one observer and two states.
 *
 * So this is the D12 law applied to a third party that is not shadcn: take the
 * BEHAVIOUR, own the code, style every value from `design-system/`. Same
 * reasoning that makes Radix legal here and a Radix default value illegal.
 *
 * ── WHY A SENTINEL AND NOT A SCROLL LISTENER ───────────────────────────────
 * An IntersectionObserver fires off the main thread and needs no throttling; a
 * scroll handler runs on every frame and has to be debounced into approximately
 * this behaviour anyway. `threshold` is expressed as a rootMargin in px, which
 * is what makes the next page arrive BEFORE the user hits the bottom.
 *
 * Reduced motion needs no branch: nothing here animates. The only moving part
 * is Spinner, which freezes under the global gate.
 */
function InfiniteScroll({
  onLoadMore,
  hasMore,
  loading = false,
  loader,
  endMessage,
  threshold = 200,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** Called when the sentinel comes into view and a load is possible. */
  onLoadMore: () => void;
  /** Whether the server says another page exists (`SearchResponse.hasNext`). */
  hasMore: boolean;
  loading?: boolean;
  /** Rendered while `loading`. Caller supplies it so this file needs no i18n. */
  loader?: React.ReactNode;
  /** Rendered once when `hasMore` is false. Caller supplies it, same reason. */
  endMessage?: React.ReactNode;
  /** How far below the viewport the sentinel triggers, in px. */
  threshold?: number;
  children: React.ReactNode;
}) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Read through a ref so a caller passing an inline arrow does not tear down
  // and rebuild the observer on every render — the same pattern AddressSelect
  // uses for its onChange.
  const onLoadMoreRef = React.useRef(onLoadMore);
  React.useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    // No sentinel is rendered once `hasMore` is false, so there is nothing to
    // observe at the end of the list — the observer is torn down rather than
    // left watching a node that will never intersect again.
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // `loading` is read from the ref-free closure deliberately: the effect
        // re-runs when it changes, so the observer always sees a current value
        // and a second page cannot be requested while the first is in flight.
        if (entries[0]?.isIntersecting && !loading) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: `0px 0px ${threshold}px 0px` },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, threshold]);

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {children}

      {/* Status region, not decoration: a screen reader is told a page is
          loading, and told when the list has ended. `aria-live="polite"` so it
          never interrupts. */}
      <div
        aria-live="polite"
        className="flex min-h-11 items-center justify-center py-4"
      >
        {hasMore ? loading && loader : endMessage}
      </div>

      {/* The trigger. Zero-height and aria-hidden — it is a scroll position,
          not content. */}
      {hasMore ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      ) : null}
    </div>
  );
}

/** The default loader body: our Spinner plus the caller's translated label.
 *  Kept beside the component so a caller does not re-invent the arrangement,
 *  but the STRING still comes from the caller (shared/ui carries no copy). */
function InfiniteScrollLoader({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-foreground-muted">
      <Spinner label={label} />
      {label}
    </span>
  );
}

export { InfiniteScroll, InfiniteScrollLoader };
