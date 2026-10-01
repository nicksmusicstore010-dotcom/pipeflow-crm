import { z } from "zod";

import { apiData, apiError, authenticate, isMember, LEAD_COLUMNS, readBody, writeError } from "@/lib/api/v1";
import { apiLeadUpdateSchema } from "@/lib/validations/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const notFound = () => apiError(404, "not_found", "Lead não encontrado.");

/** GET /api/v1/leads/:id */
export async function GET(request: Request, { params }: Params) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound();

  const { data, error } = await ctx.db
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("workspace_id", ctx.workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) return writeError(error);
  return data ? apiData(data) : notFound();
}

/** PATCH /api/v1/leads/:id — any of { name, email, phone, company, position, status, owner_id } */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await authenticate(request);
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound();
  const body = await readBody(request, apiLeadUpdateSchema);
  if (body instanceof Response) return body;

  if (body.owner_id && !(await isMember(ctx, body.owner_id))) {
    return apiError(422, "owner_not_member", "owner_id precisa ser membro do workspace.");
  }
  const { data, error } = await ctx.db
    .from("leads")
    .update(body)
    .eq("workspace_id", ctx.workspaceId)
    .eq("id", id)
    .select(LEAD_COLUMNS)
    .maybeSingle();
  if (error) return writeError(error);
  return data ? apiData(data) : notFound();
}
