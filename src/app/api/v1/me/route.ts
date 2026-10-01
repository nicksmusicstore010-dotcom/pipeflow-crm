import { apiData, authenticate, writeError } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

/** GET /api/v1/me — the key's workspace (handy to test a key). */
export async function GET(request: Request) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;

  const { data, error } = await ctx.db
    .from("workspaces")
    .select("id, name, slug, plan")
    .eq("id", ctx.workspaceId)
    .single();
  if (error) return writeError(error);
  return apiData({ workspace: data });
}
