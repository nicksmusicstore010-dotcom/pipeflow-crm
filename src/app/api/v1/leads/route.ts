import { apiData, apiError, authenticate, isMember, LEAD_COLUMNS, pagination, readBody, writeError } from "@/lib/api/v1";
import { isLeadStatus } from "@/lib/lead-status";
import { normalizeSearch } from "@/lib/leads";
import { apiLeadCreateSchema } from "@/lib/validations/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/leads?q=&status=&page=&per_page= — newest first. */
export async function GET(request: Request) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;

  const url = new URL(request.url);
  const { page, perPage, from, to } = pagination(url);
  let query = ctx.db
    .from("leads")
    .select(LEAD_COLUMNS, { count: "exact" })
    .eq("workspace_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  const status = url.searchParams.get("status");
  if (status) {
    if (!isLeadStatus(status)) return apiError(400, "invalid_status", "status inválido.");
    query = query.eq("status", status);
  }
  const q = normalizeSearch((url.searchParams.get("q") ?? "").trim().slice(0, 100)).replace(/[%_*\\]/g, " ").trim();
  if (q) query = query.ilike("search_text", `%${q}%`);

  const { data, count, error } = await query;
  if (error?.code === "PGRST103") return apiData([], { meta: { page, per_page: perPage, total: count ?? 0 } });
  if (error && q && !error.code) return apiError(400, "search_blocked", "Não foi possível buscar por esse termo.");
  if (error) return writeError(error);
  return apiData(data, { meta: { page, per_page: perPage, total: count ?? 0 } });
}

/** POST /api/v1/leads — { name, email?, phone?, company?, position?, status?, owner_id? } */
export async function POST(request: Request) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  const body = await readBody(request, apiLeadCreateSchema);
  if (body instanceof Response) return body;

  if (body.owner_id && !(await isMember(ctx, body.owner_id))) {
    return apiError(422, "owner_not_member", "owner_id precisa ser membro do workspace.");
  }
  const { data, error } = await ctx.db
    .from("leads")
    .insert({ ...body, workspace_id: ctx.workspaceId, created_by: ctx.actorId })
    .select(LEAD_COLUMNS)
    .single();
  if (error) return writeError(error);
  return apiData(data, { status: 201 });
}
