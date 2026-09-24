import { SidebarContent } from "@/components/layout/sidebar-content";
import type { WorkspaceSummary } from "@/lib/workspaces";

/** Fixed desktop sidebar (lg+). On smaller screens `MobileNav` shows the same content in a drawer. */
export function AppSidebar({
  workspaces,
  currentWorkspace,
}: {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarContent workspaces={workspaces} currentWorkspace={currentWorkspace} />
    </aside>
  );
}
