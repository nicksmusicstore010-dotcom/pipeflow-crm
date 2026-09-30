import { Skeleton } from "@/components/ui/skeleton";

/** Lead page shape (otherwise the leads list's table skeleton would show). */
export default function LeadLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando lead">
      <Skeleton className="mb-4 h-4 w-16" />
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
