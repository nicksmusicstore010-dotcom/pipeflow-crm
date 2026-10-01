import { z } from "zod";

import { apiData, apiError, authenticate, DEAL_COLUMNS, isMember, readBody, writeError } from "@/lib/api/v1";
import { apiDealUpdateSchema } from "@/lib/validations/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const notFound = () => apiError(404, "not_found", "Negócio não encontrado.");

/** GET /api/v1/deals/:id */
export async function GET(request: Request, { params }: Params) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound();

  const { data, error } = await ctx.db
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", ctx.workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) return writeError(error);
  return data ? apiData(data) : notFound();
}

/**
 * PATCH /api/v1/deals/:id — any of { title, value_cents, stage, lead_id, owner_id, due_date }.
 * A new stage puts the deal at the end of that column (like the app's form).
 */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound();
  const body = await readBody(request, apiDealUpdateSchema);
  if (body instanceof Response) return body;

  if (body.owner_id && !(await isMember(ctx, body.owner_id))) {
    return apiError(422, "owner_not_member", "owner_id precisa ser membro do workspace.");
  }

  const { stage, ...fields } = body;
  if (Object.keys(fields).length > 0) {
    const { data, error } = await ctx.db
      .from("deals")
      .update(fields)
      .eq("workspace_id", ctx.workspaceId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return writeError(error);
    if (!data) return notFound();
  }
  if (stage) {
    const { error } = await ctx.db.rpc("api_move_deal", {
      p_workspace_id: ctx.workspaceId,
      p_deal_id: id,
      p_stage: stage,
      p_index: 100_000,
    });
    if (error?.code === "P0002") return notFound();
    if (error) return writeError(error);
  }

  const { data, error } = await ctx.db
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", ctx.workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) return writeError(error);
  return data ? apiData(data) : notFound();
}
