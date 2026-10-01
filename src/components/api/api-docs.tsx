const ENDPOINTS = [
  ["GET", "/api/v1/me", "Workspace da chave (teste rápido)"],
  ["GET", "/api/v1/leads", "Lista leads · ?q= &status= &page= &per_page= (até 100)"],
  ["POST", "/api/v1/leads", "Cria lead · name, email, phone, company, position, status, owner_id"],
  ["GET", "/api/v1/leads/:id", "Um lead"],
  ["PATCH", "/api/v1/leads/:id", "Atualiza os campos enviados"],
  ["GET", "/api/v1/deals", "Lista negócios · ?stage= &lead_id= &page= &per_page="],
  ["POST", "/api/v1/deals", "Cria negócio · title, value_cents, stage, lead_id, owner_id, due_date"],
  ["GET", "/api/v1/deals/:id", "Um negócio"],
  ["PATCH", "/api/v1/deals/:id", "Atualiza; mudar stage leva o negócio para o fim da coluna"],
];

/** Short reference for integrators (server component, no JS). */
export function ApiDocs({ baseUrl }: { baseUrl: string }) {
  const example = `curl -X POST ${baseUrl}/api/v1/leads \\
  -H "Authorization: Bearer pf_SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Maria Souza", "email": "maria@acme.com", "company": "Acme"}'`;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">
        Envie a chave no cabeçalho <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">Authorization: Bearer pf_…</code>.
        Corpo e respostas em JSON (<code className="font-mono text-xs text-foreground">{"{ data }"}</code>, listas com{" "}
        <code className="font-mono text-xs text-foreground">meta</code>; erros em <code className="font-mono text-xs text-foreground">{"{ error: { code, message } }"}</code>).
        Valores em centavos, datas em <code className="font-mono text-xs text-foreground">yyyy-MM-dd</code>. Limite: 120 requisições por minuto por chave.
        Os limites do plano valem também pela API.
      </p>
      <div className="overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Endpoints da API">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Método</th>
              <th className="px-3 py-2 font-medium">Caminho</th>
              <th className="px-3 py-2 font-medium">O que faz</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ENDPOINTS.map(([method, path, description]) => (
              <tr key={`${method} ${path}`}>
                <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{method}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{path}</td>
                <td className="px-3 py-2 text-muted-foreground">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1">
        <p className="font-medium">Exemplo: criar um lead</p>
        <pre tabIndex={0} aria-label="Exemplo com curl" className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{example}</pre>
      </div>
    </div>
  );
}
