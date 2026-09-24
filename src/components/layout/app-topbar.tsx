"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";
import { findActiveNavItem } from "@/components/layout/nav-items";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";
import type { WorkspaceSummary } from "@/lib/workspaces";

/** Sticky top bar: hamburger (mobile), breadcrumb "Workspace › Página", theme and user menus. */
export function AppTopbar({
  user,
  workspaces,
  currentWorkspace,
}: {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary;
}) {
  const pathname = usePathname();
  const section = findActiveNavItem(pathname, currentWorkspace.slug);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <MobileNav workspaces={workspaces} currentWorkspace={currentWorkspace} />

      <nav aria-label="Você está em" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span className="truncate text-muted-foreground">{currentWorkspace.name}</span>
        {section && (
          <>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            <span className="truncate font-medium">{section.label}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
