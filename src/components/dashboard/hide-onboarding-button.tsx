"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Hides the checklist for this workspace (cookie read by the server, so it doesn't flash back on reload). */
export function HideOnboardingButton({ cookieName }: { cookieName: string }) {
  const router = useRouter();

  function hide() {
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${cookieName}=1; path=/; max-age=31536000; samesite=lax${secure}`;
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" className="-mr-2 -mt-1 text-muted-foreground" onClick={hide}>
      <X />
      Ocultar
    </Button>
  );
}
