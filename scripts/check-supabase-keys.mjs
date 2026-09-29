// Checks the Supabase keys in .env.local without printing them.
// Run with: npm run check:keys
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

let failed = false;
const ok = (msg) => console.log(`✔ ${msg}`);
const fail = (msg) => {
  failed = true;
  console.log(`✘ ${msg}`);
};

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL ausente");
if (!publishable) fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente");
if (!secret) fail("SUPABASE_SECRET_KEY ausente");
for (const name of Object.keys(process.env)) {
  if (name.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE/.test(name)) {
    fail(`${name}: chave secreta com prefixo NEXT_PUBLIC_ iria para o navegador`);
  }
}

if (url && publishable) {
  // Anonymous: RLS must hide every workspace.
  const anon = createClient(url, publishable, { auth: { persistSession: false } });
  const { data, error } = await anon.from("workspaces").select("id");
  if (error && error.code !== "42501") fail(`chave publicável: ${error.message}`);
  else if (data?.length) fail("chave publicável leu workspaces sem login — RLS com problema");
  else ok("chave publicável conecta e o RLS bloqueia o anônimo");
}

if (url && secret) {
  if (secret.startsWith("sb_publishable_")) fail("SUPABASE_SECRET_KEY contém a chave publicável");
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { count, error } = await admin.from("workspaces").select("id", { count: "exact", head: true });
  if (error) fail(`chave secreta: ${error.message}`);
  else ok(`chave secreta conecta e ignora o RLS (${count} workspace(s) visíveis)`);
}

process.exitCode = failed ? 1 : 0;
