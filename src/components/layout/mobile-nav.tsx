"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { SidebarContent } from "@/components/layout/sidebar-content";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { WorkspaceSummary } from "@/lib/workspaces";

/** Hamburger button + drawer with the sidebar content. Hidden on lg+, where the sidebar is fixed. */
export function MobileNav({
  workspaces,
  currentWorkspace,
}: {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SidebarContent
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
