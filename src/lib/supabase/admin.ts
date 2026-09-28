import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { getSupabaseEnv, getSupabaseSecretKey } from "./env";

/**
 * Supabase client with the secret key: bypasses RLS. Only for webhooks and
 * server jobs, where there is no logged-in user. Always filter by workspace_id
 * yourself — nothing else will. Importing it from client code fails the build.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();

  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
