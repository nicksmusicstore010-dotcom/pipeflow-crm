"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { WorkspaceSummary } from "@/lib/workspaces";

export function MobileNav({
  user,
  workspaces,
  currentWorkspace,
}: {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary;
}) {
  const [open, setOpen] = useState(false);
  const homeHref = `/${currentWorkspace.slug}/dashboard`;

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-sidebar px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center px-5">
            <Logo href={homeHref} />
          </div>
          <div className="px-3 pb-2">
            <WorkspaceSwitcher
              workspaces={workspaces}
              current={currentWorkspace}
              onNavigate={() => setOpen(false)}
            />
          </div>
          <div className="flex-1 px-3 py-2">
            <SidebarNav workspaceSlug={currentWorkspace.slug} onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t p-3">
            <UserMenu user={user} />
          </div>
        </SheetContent>
      </Sheet>
      <Logo href={homeHref} />
    </header>
  );
}
