import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, KeyRound } from "lucide-react";

import { ApiDocs } from "@/components/api/api-docs";
import { ApiKeysList } from "@/components/api/api-keys-list";
import { CreateApiKeyForm } from "@/components/api/create-api-key-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listApiKeys } from "@/lib/api-keys";
import { publicSiteUrl } from "@/lib/site-url-public";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export const metadata: Metadata = { title: "API" };

export default async function ApiSettingsPage(props: { params: Promise<{ workspaceSlug: string }> }) {
  const params = await props.params;
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  if (!workspace) notFound();
  // The layout shows the "admins only" notice.
  if (workspace.role !== "admin") return null;

  const keys = await listApiKeys(workspace.id);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
            Chaves de API
          </CardTitle>
          <CardDescription>
            Conecte formulários do site, planilhas ou outros sistemas a este workspace. Cada chave dá acesso aos leads e
            negócios de <span className="font-medium text-foreground">{workspace.name}</span> — guarde-a como uma senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CreateApiKeyForm workspaceSlug={workspace.slug} />
          <ApiKeysList workspaceSlug={workspace.slug} keys={keys} />
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            Como usar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApiDocs baseUrl={publicSiteUrl()} />
        </CardContent>
      </Card>
    </div>
  );
}
