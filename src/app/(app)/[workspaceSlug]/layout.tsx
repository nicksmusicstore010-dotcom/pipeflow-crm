import { notFound, redirect } from "next/navigation";

import { PrepaidExpiryBanner } from "@/components/billing/prepaid-expiry-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { RememberWorkspace } from "@/components/workspaces/remember-workspace";
import { prepaidPro } from "@/lib/billing";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { getUserWorkspaces } from "@/lib/workspaces";

export default async function WorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { children } = props;
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // RLS only returns the user's own workspaces, so a foreign slug is a 404
  // (we don't reveal whether it exists).
  const workspaces = await getUserWorkspaces();
  const currentWorkspace = workspaces.find((w) => w.slug === params.workspaceSlug);
  if (!currentWorkspace) notFound();

  // Pro paid with Pix about to end: remind the admins (who can renew) on every page.
  const prepaid = currentWorkspace.role === "admin" ? prepaidPro(currentWorkspace.pro_until) : null;
  const expiringSoon = prepaid && prepaid.daysLeft <= 5 ? prepaid : null;

  const sessionUser = {
    name: (user.user_metadata.full_name as string | undefined) || user.email || "Usuário",
    email: user.email ?? "",
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <RememberWorkspace slug={currentWorkspace.slug} />
      <AppSidebar workspaces={workspaces} currentWorkspace={currentWorkspace} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar user={sessionUser} workspaces={workspaces} currentWorkspace={currentWorkspace} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {expiringSoon && (
            <PrepaidExpiryBanner
              workspaceSlug={currentWorkspace.slug}
              daysLeft={expiringSoon.daysLeft}
              until={formatDate(expiringSoon.until)}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
