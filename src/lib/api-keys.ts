import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/types/supabase";

/** "pf_" + 32 random bytes. Only its SHA-256 goes to the database. */
export function generateApiKey() {
  const token = `pf_${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashApiKey(token), prefix: token.slice(0, 11) };
}

export function hashApiKey(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** The workspace's keys, newest first (admins only, by RLS; the hash is never selected). */
export async function listApiKeys(workspaceId: string): Promise<ApiKey[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, workspace_id, name, prefix, created_by, created_at, last_used_at, revoked_at")
    .eq("workspace_id", workspaceId)
    .order("revoked_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
