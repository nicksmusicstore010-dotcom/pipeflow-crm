import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Supabase client for Client Components. Lazy singleton: created on the first
 * call (not at import, so a missing env doesn't break the bundle) and reused,
 * so the whole tab shares one auth session and one set of listeners.
 */
export function createClient() {
  if (!browserClient) {
    const { url, key } = getSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, key);
  }
  return browserClient;
}
