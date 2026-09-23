import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import type { WorkspaceSummary } from "@/lib/workspaces";

/** Desktop sidebar: logo, workspace switcher, navigation and user menu. */
export function AppSidebar({
  user,
  workspaces,
  currentWorkspace,
}: {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo href={`/${currentWorkspace.slug}/dashboard`} />
      </div>
      <div className="px-3 pb-2">
        <WorkspaceSwitcher workspaces={workspaces} current={currentWorkspace} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav workspaceSlug={currentWorkspace.slug} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
