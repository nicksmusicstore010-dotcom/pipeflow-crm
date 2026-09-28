export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The Vercel Supabase integration injects the legacy ANON_KEY name.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY). Run `vercel env pull .env.local` or copy .env.example to .env.local and fill them in.",
    );
  }

  return { url, key };
}

/**
 * Secret key (bypasses RLS). Server-only: never prefix it with NEXT_PUBLIC_.
 * Read lazily so the app still boots without it; only admin code needs it.
 */
export function getSupabaseSecretKey() {
  // Older projects and the Vercel integration use the legacy SERVICE_ROLE_KEY name.
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Copy it from Supabase dashboard > Project Settings > API Keys > Secret keys into .env.local.",
    );
  }

  return key;
}
