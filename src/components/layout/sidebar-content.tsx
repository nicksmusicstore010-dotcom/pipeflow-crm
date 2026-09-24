import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import type { WorkspaceSummary } from "@/lib/workspaces";

/** Logo + workspace switcher + navigation. Shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({
  workspaces,
  currentWorkspace,
  onNavigate,
}: {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary;
  /** Called after a link is followed (the mobile drawer uses it to close itself). */
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href={`/${currentWorkspace.slug}/dashboard`} />
      </div>
      <div className="px-3 pb-2">
        <WorkspaceSwitcher
          workspaces={workspaces}
          current={currentWorkspace}
          onNavigate={onNavigate}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav workspaceSlug={currentWorkspace.slug} onNavigate={onNavigate} />
      </div>
    </>
  );
}
