import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";

/** Desktop sidebar. The workspace switcher goes under the logo (Milestone 2). */
export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo href="/dashboard" />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
