import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LAST_WORKSPACE_COOKIE } from "@/lib/workspace-slug";
import { getUserWorkspaces } from "@/lib/workspaces";

/** Post-login entry point: last workspace opened, else the first one, else onboarding. */
export default async function AppEntryPage() {
  const workspaces = await getUserWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");

  const lastSlug = cookies().get(LAST_WORKSPACE_COOKIE)?.value;
  const target = workspaces.find((w) => w.slug === lastSlug) ?? workspaces[0];
  redirect(`/${target.slug}/dashboard`);
}
