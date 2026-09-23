import { notFound, redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/session";
import { getUserWorkspaces } from "@/lib/workspaces";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // RLS only returns the user's own workspaces, so a foreign slug is a 404
  // (we don't reveal whether it exists).
  const workspaces = await getUserWorkspaces();
  const currentWorkspace = workspaces.find((w) => w.slug === params.workspaceSlug);
  if (!currentWorkspace) notFound();

  const sessionUser = {
    name: (user.user_metadata.full_name as string | undefined) || user.email || "Usuário",
    email: user.email ?? "",
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar user={sessionUser} workspaces={workspaces} currentWorkspace={currentWorkspace} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={sessionUser} workspaces={workspaces} currentWorkspace={currentWorkspace} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
