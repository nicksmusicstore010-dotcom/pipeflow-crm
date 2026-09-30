import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Plan limit notice with the upgrade CTA (admins) or who to ask (members). */
export function PlanLimitAlert({
  workspaceSlug,
  isAdmin,
  children,
}: {
  workspaceSlug: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p>
          {children}{" "}
          {!isAdmin && "Peça a um administrador do workspace para fazer upgrade para o Pro."}
        </p>
      </div>
      {isAdmin && (
        <Button asChild size="sm" className="shrink-0">
          <Link href={`/${workspaceSlug}/settings/billing`}>Fazer upgrade</Link>
        </Button>
      )}
    </div>
  );
}
