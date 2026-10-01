import { Skeleton } from "@/components/ui/skeleton";

/** Below the settings header and tabs (from the layout). */
export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando configurações" className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
