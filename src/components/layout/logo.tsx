import Link from "next/link";
import { Workflow } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Workflow className="h-4 w-4" />
      </span>
      <span className="text-lg tracking-tight">PipeFlow</span>
    </Link>
  );
}
