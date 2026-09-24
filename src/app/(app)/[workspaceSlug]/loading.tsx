import { Skeleton } from "@/components/ui/skeleton";

/** Shown inside the app shell while a workspace page loads. */
export default function WorkspaceLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-lg" />
    </div>
  );
}
