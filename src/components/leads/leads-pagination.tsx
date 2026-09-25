import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/** "Mostrando 21–40 de 57" + previous/next links that keep the current filters. */
export function LeadsPagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && key !== "page") params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <p className="tabular-nums">
        Mostrando {first}–{last} de {total} {total === 1 ? "lead" : "leads"}
      </p>
      {lastPage > 1 && (
        <div className="flex items-center gap-2">
          <PageLink href={hrefFor(page - 1)} disabled={page <= 1} label="Página anterior">
            <ChevronLeft />
          </PageLink>
          <span className="tabular-nums">
            {page} / {lastPage}
          </span>
          <PageLink href={hrefFor(page + 1)} disabled={page >= lastPage} label="Próxima página">
            <ChevronRight />
          </PageLink>
        </div>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon" asChild>
      <Link href={href} aria-label={label} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}
