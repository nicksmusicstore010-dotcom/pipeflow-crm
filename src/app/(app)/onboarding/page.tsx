import type { Metadata } from "next";

import { Logo } from "@/components/layout/logo";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";
import { getUserWorkspaces } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Criar workspace" };

export default async function OnboardingPage() {
  const workspaces = await getUserWorkspaces();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-12">
      <Logo href="/app" />
      <div className="w-full max-w-sm">
        <CreateWorkspaceForm isFirst={workspaces.length === 0} />
      </div>
    </div>
  );
}
