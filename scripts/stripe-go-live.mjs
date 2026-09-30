// Puts Stripe billing live in production in one run:
//   1. Pro product + R$ 49/mês price (reused if it already exists)
//   2. Customer Portal (card, invoices, cancel at period end)
//   3. Webhook endpoint for <site>/api/webhooks/stripe with the 5 events the app handles
//   4. STRIPE_* variables on Vercel (Production) + redeploy
//
// Usage (PowerShell or bash, from the project root):
//   npm run stripe:go-live
// The live keys are asked for in the terminal (typing hidden) and never printed or saved
// to disk. Idempotent: running it again reuses the price/portal and replaces the webhook.
//
// Options:
//   --site <url>   production URL (default: https://pipeflow-crm-olive.vercel.app)
//   --test         accept test-mode keys and skip Vercel (to try the script on a sandbox)
import { spawnSync } from "node:child_process";
import readline from "node:readline";

import Stripe from "stripe";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const TEST = flag("--test");
const SITE = option("--site", "https://pipeflow-crm-olive.vercel.app").replace(/\/+$/, "");
const WEBHOOK_URL = `${SITE}/api/webhooks/stripe`;
const PRICE_LOOKUP_KEY = "pipeflow_pro_monthly";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

const step = (msg) => console.log(`\n→ ${msg}`);
const done = (msg) => console.log(`  ✓ ${msg}`);
function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

/** Reads a line from the terminal without echoing it. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

/** Sets a Vercel Production variable, value through stdin (never on the command line). */
function setVercelEnv(name, value, sensitive) {
  // One command string (fixed names only; the value goes through stdin): npx needs a shell on Windows.
  const result = spawnSync(
    `npx -y vercel env add ${name} production --force ${sensitive ? "--sensitive" : "--no-sensitive"}`,
    { input: value, encoding: "utf8", shell: true },
  );
  if (result.status !== 0) fail(`Vercel recusou ${name}:\n${(result.stderr || result.stdout).slice(-600)}`);
  done(`${name} gravada na Vercel (Production${sensitive ? ", sensível" : ""})`);
}

// ---------------------------------------------------------------------------

console.log(`PipeFlow — colocar a cobrança do Stripe no ar${TEST ? " (modo --test: sandbox, sem Vercel)" : ""}`);
console.log(`Site: ${SITE}`);

const secretKey =
  process.env.STRIPE_GO_LIVE_SECRET_KEY?.trim() ||
  (await askHidden("Chave secreta (sk_live_… — Stripe → Developers → API keys): "));
const livePrefix = /^(sk|rk)_live_/;
if (!TEST && !livePrefix.test(secretKey)) fail("A chave precisa ser live (sk_live_…). Chave de teste em produção deixa qualquer um virar Pro com o cartão 4242.");
if (TEST && livePrefix.test(secretKey)) fail("--test é só para chaves de teste.");

const publishableKey = TEST
  ? ""
  : process.env.STRIPE_GO_LIVE_PUBLISHABLE_KEY?.trim() ||
    (await askHidden("Chave publicável (pk_live_… — opcional, Enter para pular): "));
if (publishableKey && !publishableKey.startsWith("pk_live_")) fail("A chave publicável precisa começar com pk_live_.");

const stripe = new Stripe(secretKey, { appInfo: { name: "PipeFlow CRM go-live" } });

step("Conta Stripe");
let account = null;
try {
  account = await stripe.accounts.retrieve();
  done(`${account.settings?.dashboard?.display_name || account.id} (${account.country})`);
} catch (error) {
  // An unclaimed sandbox key can't read the account; a live secret key always can.
  if (!TEST) fail(`O Stripe recusou a chave: ${error.message}`);
  done("sandbox sem acesso aos dados da conta — seguindo (--test)");
}
if (!TEST && !account.charges_enabled) {
  fail("A conta ainda não pode receber pagamentos (charges_enabled = false). Termine a ativação no painel do Stripe e rode de novo.");
}

step("Produto e preço do Pro");
const existing = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
let price = existing.data[0];
if (price) {
  done(`reaproveitado: ${price.id}`);
} else {
  const product = await stripe.products.create({
    name: "PipeFlow Pro",
    description: "Leads e membros ilimitados",
    metadata: { app: "pipeflow" },
  });
  price = await stripe.prices.create({
    product: product.id,
    currency: "brl",
    unit_amount: 4900,
    recurring: { interval: "month" },
    lookup_key: PRICE_LOOKUP_KEY,
    nickname: "Pro mensal",
  });
  done(`criado: ${product.id} / ${price.id} (R$ 49,00/mês)`);
}
if (price.currency !== "brl" || price.unit_amount !== 4900 || price.recurring?.interval !== "month") {
  fail(`O preço ${price.id} não é R$ 49/mês — confira no painel.`);
}

step("Customer Portal");
const portals = await stripe.billingPortal.configurations.list({ is_default: true, active: true, limit: 1 });
if (portals.data[0]) {
  done(`já configurado: ${portals.data[0].id}`);
} else {
  const portal = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "PipeFlow CRM" },
    default_return_url: SITE,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  done(`criado: ${portal.id}`);
}

step("Webhook");
// The signing secret is only returned on creation: replace any endpoint already at this URL.
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
for (const old of endpoints.data.filter((e) => e.url === WEBHOOK_URL)) {
  await stripe.webhookEndpoints.del(old.id);
  done(`endpoint antigo removido: ${old.id}`);
}
const endpoint = await stripe.webhookEndpoints.create({
  url: WEBHOOK_URL,
  enabled_events: WEBHOOK_EVENTS,
  description: "PipeFlow CRM — plano Pro",
});
done(`${endpoint.id} → ${WEBHOOK_URL} (${WEBHOOK_EVENTS.length} eventos)`);

if (TEST) {
  console.log(`\n(--test) Nada foi gravado na Vercel. Preço: ${price.id}. Webhook de teste: ${endpoint.id}.`);
  process.exit(0);
}

step("Variáveis na Vercel (Production)");
setVercelEnv("STRIPE_SECRET_KEY", secretKey, true);
setVercelEnv("STRIPE_WEBHOOK_SECRET", endpoint.secret, true);
setVercelEnv("STRIPE_PRO_PRICE_ID", price.id, false);
if (publishableKey) setVercelEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", publishableKey, false);

step("Nova publicação (as variáveis só valem depois dela)");
const redeploy = spawnSync(`npx -y vercel redeploy ${new URL(SITE).host} --target production`, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});
if (redeploy.status !== 0) {
  fail(`As variáveis foram gravadas, mas a nova publicação falhou. Rode: npx vercel redeploy ${new URL(SITE).host} --target production\n${redeploy.stderr.slice(-600)}`);
}
done("publicado");

console.log(`
Pronto: a cobrança está no ar em ${SITE}.
Teste com um cartão real (dá para cancelar logo depois em "Gerenciar assinatura" e
reembolsar pelo painel do Stripe). Os cartões de teste (4242…) são recusados no modo live.`);
