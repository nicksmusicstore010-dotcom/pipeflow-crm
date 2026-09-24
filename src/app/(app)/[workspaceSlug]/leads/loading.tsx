import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando leads">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="mb-4 h-9 w-full" />
      <div className="space-y-px overflow-hidden rounded-lg border">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-none" />
        ))}
      </div>
    </div>
  );
}
