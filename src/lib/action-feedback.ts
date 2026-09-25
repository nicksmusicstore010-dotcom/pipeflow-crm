import { toast } from "sonner";

import type { LeadActionResult } from "@/actions/leads";

type ActionFailure = Extract<LeadActionResult, { ok: false }>;

/** Error toast for a failed Server Action; an expired session gets an "Entrar" button back to this page. */
export function toastActionError(failure: ActionFailure) {
  if (!failure.unauthenticated) {
    toast.error(failure.error);
    return;
  }
  const next = window.location.pathname + window.location.search;
  toast.error(failure.error, {
    action: { label: "Entrar", onClick: () => window.location.assign(`/login?next=${encodeURIComponent(next)}`) },
  });
}

/** The action threw instead of answering (offline, server restarting, deploy in progress). */
export const NETWORK_ERROR: ActionFailure = {
  ok: false,
  error: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
};
