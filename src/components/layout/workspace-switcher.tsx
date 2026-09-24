"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { firstChar } from "@/lib/utils";
import type { WorkspaceSummary } from "@/lib/workspaces";

export function WorkspaceSwitcher({
  workspaces,
  current,
  onNavigate,
}: {
  workspaces: WorkspaceSummary[];
  current: WorkspaceSummary;
  onNavigate?: () => void;
}) {
  // Names aren't unique; when two collide, show the slug so they can be told apart.
  const isDuplicateName = (name: string) => workspaces.filter((w) => w.name === name).length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-card px-2 py-2 text-left text-sm shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary">
          {firstChar(current.name).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{current.name}</span>
          <span className="block text-xs text-muted-foreground">
            {current.plan === "pro" ? "Plano Pro" : "Plano Free"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} asChild>
            {/* No prefetch: opening the menu would render every workspace's layout at once. */}
            <Link href={`/${workspace.slug}/dashboard`} prefetch={false} onClick={onNavigate}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{workspace.name}</span>
                {isDuplicateName(workspace.name) && (
                  <span className="block truncate text-xs text-muted-foreground">
                    /{workspace.slug}
                  </span>
                )}
              </span>
              {workspace.id === current.id && <Check className="text-primary" />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding" onClick={onNavigate}>
            <Plus />
            Criar workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
