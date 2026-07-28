import { Skeleton } from "@/shared/ui/skeleton";

/** Skeleton result cards for the Catalog Page's loading state (P8.4/P9.3) —
 *  the shared/ui Skeleton primitive, never an invented visual. */
export function CatalogSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="neu-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
