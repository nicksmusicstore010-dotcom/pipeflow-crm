import { z } from "zod";

import { apiData, apiError, authenticate, DEAL_COLUMNS, isMember, pagination, readBody, writeError } from "@/lib/api/v1";
import { isDealStage } from "@/lib/deal-stages";
import { apiDealCreateSchema } from "@/lib/validations/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/deals?stage=&lead_id=&page=&per_page= — by stage, then board position. */
export async function GET(request: Request) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;

  const url = new URL(request.url);
  const { page, perPage, from, to } = pagination(url);
  let query = ctx.db
    .from("deals")
    .select(DEAL_COLUMNS, { count: "exact" })
    .eq("workspace_id", ctx.workspaceId)
    .order("stage")
    .order("position")
    .range(from, to);

  const stage = url.searchParams.get("stage");
  if (stage) {
    if (!isDealStage(stage)) return apiError(400, "invalid_stage", "stage inválido.");
    query = query.eq("stage", stage);
  }
  const leadId = url.searchParams.get("lead_id");
  if (leadId) {
    if (!z.uuid().safeParse(leadId).success) return apiError(400, "invalid_lead_id", "lead_id inválido.");
    query = query.eq("lead_id", leadId);
  }

  const { data, count, error } = await query;
  if (error?.code === "PGRST103") return apiData([], { meta: { page, per_page: perPage, total: count ?? 0 } });
  if (error) return writeError(error);
  return apiData(data, { meta: { page, per_page: perPage, total: count ?? 0 } });
}

/** POST /api/v1/deals — { title, value_cents?, stage?, lead_id?, owner_id?, due_date? } (goes to the end of its column) */
export async function POST(request: Request) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  const body = await readBody(request, apiDealCreateSchema);
  if (body instanceof Response) return body;

  if (body.owner_id && !(await isMember(ctx, body.owner_id))) {
    return apiError(422, "owner_not_member", "owner_id precisa ser membro do workspace.");
  }
  // lead_id from another workspace is refused by the (lead_id, workspace_id) foreign key.
  const { data, error } = await ctx.db
    .from("deals")
    .insert({ ...body, workspace_id: ctx.workspaceId, created_by: ctx.actorId })
    .select(DEAL_COLUMNS)
    .single();
  if (error) return writeError(error);
  return apiData(data, { status: 201 });
}
