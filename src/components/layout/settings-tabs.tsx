"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Braces, CreditCard, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { path: "/settings", label: "Membros", icon: Users },
  { path: "/settings/billing", label: "Cobrança", icon: CreditCard },
  { path: "/settings/api", label: "API", icon: Braces },
];

/** Sub-navigation of the settings pages. */
export function SettingsTabs({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Configurações" className="mb-6 flex gap-1 border-b">
      {TABS.map(({ path, label, icon: Icon }) => {
        const href = `/${workspaceSlug}${path}`;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
