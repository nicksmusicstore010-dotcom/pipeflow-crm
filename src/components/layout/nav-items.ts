import { LayoutDashboard, Settings, SquareKanban, Users, type LucideIcon } from "lucide-react";

export type NavItem = { path: string; label: string; icon: LucideIcon };

/** Main app navigation; paths are relative to `/[workspaceSlug]`. */
export const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/pipeline", label: "Pipeline", icon: SquareKanban },
  { path: "/settings", label: "Configurações", icon: Settings },
];

/** Nav item matching the current pathname (exact or nested route), if any. */
export function findActiveNavItem(pathname: string, workspaceSlug: string) {
  return NAV_ITEMS.find(({ path }) => {
    const href = `/${workspaceSlug}${path}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}
