import { redirect } from "next/navigation";

export default async function WorkspaceHomePage(props: { params: Promise<{ workspaceSlug: string }> }) {
  const params = await props.params;
  redirect(`/${params.workspaceSlug}/dashboard`);
}
