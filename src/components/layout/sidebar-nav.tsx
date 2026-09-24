"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { findActiveNavItem, NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav({
  workspaceSlug,
  onNavigate,
}: {
  workspaceSlug: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const activeItem = findActiveNavItem(pathname, workspaceSlug);

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const { path, label, icon: Icon } = item;
        const href = `/${workspaceSlug}${path}`;
        const active = item === activeItem;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
