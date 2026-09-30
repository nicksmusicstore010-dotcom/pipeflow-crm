"use client";

import { useFormState } from "react-dom";
import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";

import { NETWORK_ERROR } from "@/lib/action-feedback";

/**
 * `useFormState` for forms whose action returns `{ error?: string }`. When the
 * request itself fails (offline, server restarting, deploy in progress) the
 * form shows the connection message instead of the whole page turning into the
 * error screen and losing what was typed. Redirects still go through.
 */
export function useActionFormState<State extends { error?: string }>(
  action: (state: State, formData: FormData) => Promise<State>,
  initialState: State,
) {
  return useFormState<State, FormData>(async (state, formData) => {
    try {
      return (await action(state, formData)) ?? state;
    } catch (error) {
      if (isRedirectError(error) || isNotFoundError(error)) throw error;
      return { ...state, error: NETWORK_ERROR.error };
    }
  }, initialState as Awaited<State>);
}
