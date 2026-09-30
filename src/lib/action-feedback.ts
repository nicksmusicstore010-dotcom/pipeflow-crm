import { toast } from "sonner";

import type { ActionFailure } from "@/lib/action-result";

/** Error toast for a failed Server Action; an expired session gets an "Entrar" button back to this page. */
export function toastActionError(failure: ActionFailure) {
  if (!failure.unauthenticated) {
    toast.error(failure.error);
    return;
  }
  const next = window.location.pathname + window.location.search;
  toast.error(failure.error, {
    // Outside React (a toast callback), and a full load drops the stale signed-out client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    action: { label: "Entrar", onClick: () => window.location.assign(`/login?next=${encodeURIComponent(next)}`) },
  });
}

/** The action threw instead of answering (offline, server restarting, deploy in progress). */
export const NETWORK_ERROR: ActionFailure = {
  ok: false,
  error: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
};
