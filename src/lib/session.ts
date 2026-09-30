import { cache } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * The logged-in user, fetched once per request. Null = no session. Supabase
 * unreachable (network, timeout, 5xx) throws instead: pages show the error screen
 * with "Tentar novamente" and actions answer "sem conexão", rather than treating
 * a logged-in user as logged out (404 / back to the login page).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error && isAuthRetryableFetchError(error)) throw new Error("Supabase Auth is unreachable.", { cause: error });
  return user;
});
