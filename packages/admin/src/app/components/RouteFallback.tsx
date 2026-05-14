import { Skeleton } from "./ui/skeleton";

/**
 * Suspense fallback for lazy-loaded route components. Intentionally generic —
 * shows the rough silhouette of a page header + a content block so the layout
 * doesn't jump when the route chunk finishes loading.
 */
export function RouteFallback() {
  return (
    <div className="flex flex-col gap-4" data-testid="route-fallback">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
