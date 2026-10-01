import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import { hashApiKey } from "@/lib/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

// Public API (/api/v1): authenticated by a workspace API key, not by a session.
// Reads and writes use the secret key, so EVERY query here must filter by the
// key's workspace and re-check what RLS checks for the app (e.g. the owner must
// be a member of the workspace).

export type AdminClient = ReturnType<typeof createAdminClient>;
export type ApiContext = { workspaceId: string; actorId: string | null; db: AdminClient };

/** Fields returned by the API (values in cents, dates in ISO 8601 / yyyy-MM-dd). */
export const LEAD_COLUMNS = "id, name, email, phone, company, position, status, owner_id, created_at, updated_at";
export const DEAL_COLUMNS =
  "id, title, value_cents, stage, position, lead_id, owner_id, due_date, created_at, updated_at";

const KEY_PATTERN = /^pf_[A-Za-z0-9_-]{43}$/;
const MAX_BODY_BYTES = 64 * 1024;

/** `{ error: { code, message } }` with the HTTP status. */
export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function apiData(data: unknown, init?: { status?: number; meta?: unknown }) {
  return NextResponse.json(init?.meta ? { data, meta: init.meta } : { data }, { status: init?.status ?? 200 });
}

/** The workspace of the `Authorization: Bearer pf_...` key, or the error response. */
export async function authenticate(request: Request): Promise<ApiContext | NextResponse> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || !KEY_PATTERN.test(token)) {
    return apiError(401, "unauthorized", "Envie a chave de API no cabeçalho Authorization: Bearer pf_...");
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("authenticate_api_key", { p_key_hash: hashApiKey(token) }).maybeSingle();
  if (error?.message === "invalid_key") return apiError(401, "unauthorized", "Chave de API inválida ou revogada.");
  if (error?.message === "rate_limited") {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Limite de 120 requisições por minuto atingido." } },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  if (error || !data) {
    console.error("[api] key check failed:", error);
    return apiError(500, "internal_error", "Erro interno. Tente novamente.");
  }
  return { workspaceId: data.workspace_id, actorId: data.created_by, db };
}

/** JSON body validated by `schema`, or the error response. */
export async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | NextResponse> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return apiError(413, "payload_too_large", "Corpo da requisição muito grande.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return apiError(400, "invalid_json", "O corpo precisa ser um JSON válido.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    return apiError(422, "validation_error", issues[0]?.message ?? "Dados inválidos.", issues);
  }
  return parsed.data;
}

/** Whether `userId` is a member of the workspace (what RLS checks for owner_id in the app). */
export async function isMember(ctx: ApiContext, userId: string) {
  const { data, error } = await ctx.db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Database errors a client can fix, as API errors; anything else is a 500. */
export function writeError(error: { code?: string; message?: string }) {
  if (error.message === "plan_limit") {
    return apiError(403, "plan_limit", "O plano do workspace atingiu o limite de leads. Faça upgrade para o Pro.");
  }
  if (error.code === "23503") return apiError(422, "lead_not_found", "lead_id não existe neste workspace.");
  if (error.code === "23514") return apiError(422, "validation_error", "Algum campo está fora dos limites permitidos.");
  console.error("[api] write failed:", error);
  return apiError(500, "internal_error", "Erro interno. Tente novamente.");
}

/** page / per_page from the query string (per_page up to 100). */
export function pagination(url: URL) {
  const page = Math.max(1, Math.min(10_000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
  const perPage = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("per_page") ?? "50", 10) || 50));
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}
