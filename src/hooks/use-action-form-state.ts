"use client";

import { useActionState } from "react";
import { unstable_rethrow } from "next/navigation";

import { NETWORK_ERROR } from "@/lib/action-feedback";

/** Text the user submitted, by field name (passwords left out). */
export type SubmittedFields = Record<string, string>;

function submittedFields(formData: FormData): SubmittedFields {
  const fields: SubmittedFields = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !/password/i.test(key) && !key.startsWith("$")) fields[key] = value;
  });
  return fields;
}

/**
 * `useActionState` for forms whose action returns `{ error?: string }`.
 *
 * - React 19 resets a `<form action>` after every submit. The state carries
 *   `fields` (what was typed, minus passwords): use them as each input's
 *   `defaultValue`, so a failed attempt (wrong password, taken e-mail) keeps them.
 * - When the request itself fails (offline, server restarting, deploy in
 *   progress) the form shows the connection message instead of the whole page
 *   turning into the error screen. Redirects still go through.
 */
export function useActionFormState<State extends { error?: string }>(
  action: (state: State, formData: FormData) => Promise<State>,
  initialState: State,
) {
  type FormState = State & { fields?: SubmittedFields };
  return useActionState<FormState, FormData>(async (state, formData) => {
    const fields = submittedFields(formData);
    try {
      return { ...((await action(state, formData)) ?? state), fields };
    } catch (error) {
      // redirect() / notFound() travel as errors: let Next handle them.
      unstable_rethrow(error);
      return { ...state, error: NETWORK_ERROR.error, fields };
    }
  }, initialState as Awaited<FormState>);
}
