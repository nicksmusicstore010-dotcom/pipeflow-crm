import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** The logged-in user, fetched once per request. */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
