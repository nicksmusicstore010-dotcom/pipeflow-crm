import { redirect } from "next/navigation";

export default function WorkspaceHomePage({ params }: { params: { workspaceSlug: string } }) {
  redirect(`/${params.workspaceSlug}/dashboard`);
}
