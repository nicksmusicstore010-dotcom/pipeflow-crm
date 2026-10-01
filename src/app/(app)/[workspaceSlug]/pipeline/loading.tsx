import { Skeleton } from "@/components/ui/skeleton";

// Cards per column, so the placeholder looks like a board and not a grid.
const CARDS = [2, 1, 2, 1, 1, 0];

export default function PipelineLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando pipeline">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="-mx-4 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-start gap-4">
          {CARDS.map((cards, i) => (
            <div key={i} className="w-[17rem] shrink-0 space-y-2 rounded-lg border bg-card p-2">
              <Skeleton className="h-6 w-2/3" />
              {Array.from({ length: cards }, (_, j) => (
                <Skeleton key={j} className="h-28 rounded-md" />
              ))}
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
