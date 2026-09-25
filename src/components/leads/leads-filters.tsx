"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isLeadStatus, LEAD_STATUS_STYLES, LEAD_STATUSES } from "@/lib/lead-status";
import type { WorkspaceMember } from "@/lib/workspaces";

const ALL = "all";
const FILTER_KEYS = ["q", "status", "owner", "from", "to"];

/** Search + filters kept in the query string, so a filtered list can be shared or bookmarked. */
export function LeadsFilters({ members, currentUserId }: { members: WorkspaceMember[]; currentUserId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    // Carry text still waiting for the debounce, so changing a select doesn't drop it.
    const q = query.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any filter change goes back to page 1
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounced search; skip when the URL already has this term (e.g. first render, back button).
  useEffect(() => {
    if (query.trim() === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => update({ q: query.trim() || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should trigger this
  }, [query]);

  // Keep the box in sync when the URL changes from outside (clear filters, back button).
  // Same term modulo whitespace = our own update: keep what's typed ("Maria " mid-typing).
  useEffect(() => {
    const urlQuery = searchParams.get("q") ?? "";
    setQuery((current) => (current.trim() === urlQuery ? current : urlQuery));
  }, [searchParams]);

  const hasFilters = FILTER_KEYS.some((key) => searchParams.has(key));
  // Values the server ignores (typo, a member who left) show as "Todos" instead of a blank select.
  const status = searchParams.get("status");
  const statusValue = isLeadStatus(status) ? status : ALL;
  const owner = searchParams.get("owner");
  const ownerValue = owner === "none" || members.some((m) => m.id === owner) ? owner! : ALL;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Label htmlFor="leads-search" className="sr-only">
            Buscar leads
          </Label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="leads-search"
            type="search"
            placeholder="Nome, e-mail ou empresa"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
          {pending && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))}>
            <X />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
        <FilterField id="leads-status" label="Status">
          <Select
            value={statusValue}
            onValueChange={(v) => update({ status: v === ALL ? null : v })}
          >
            <SelectTrigger id="leads-status" aria-label="Filtrar por status" className="lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LEAD_STATUS_STYLES[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField id="leads-owner" label="Responsável">
          <Select
            value={ownerValue}
            onValueChange={(v) => update({ owner: v === ALL ? null : v })}
          >
            <SelectTrigger id="leads-owner" aria-label="Filtrar por responsável" className="lg:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="none">Sem responsável</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                  {member.id === currentUserId && " (você)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <DateFilter
          id="leads-from"
          label="Criado a partir de"
          value={searchParams.get("from") ?? ""}
          onChange={(value) => update({ from: value || null })}
        />
        <DateFilter
          id="leads-to"
          label="Criado até"
          value={searchParams.get("to") ?? ""}
          onChange={(value) => update({ to: value || null })}
        />
      </div>
    </div>
  );
}

function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function DateFilter({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FilterField id={id} label={label}>
      <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} className="lg:w-40" />
    </FilterField>
  );
}
