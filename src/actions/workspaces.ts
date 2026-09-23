"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { workspaceSlugFor } from "@/lib/workspace-slug";

export type WorkspaceFormState = {
  error?: string;
};

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome precisa ter pelo menos 2 caracteres.")
    .max(60, "Use no máximo 60 caracteres."),
});

export async function createWorkspace(
  _prev: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  // create_workspace() inserts the workspace and the caller as admin atomically.
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data.name,
    p_slug: workspaceSlugFor(parsed.data.name),
  });
  if (error || !data) return { error: "Não foi possível criar o workspace. Tente novamente." };

  redirect(`/${data.slug}/dashboard`);
}
