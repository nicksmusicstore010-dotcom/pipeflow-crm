/** What a Server Action returns when it fails; `unauthenticated` = session expired. */
export type ActionFailure = { ok: false; error: string; unauthenticated?: boolean };

/** Result of a Server Action: `{ ok: true, ...data }` or an `ActionFailure`. */
export type ActionResult<T extends object = object> = ({ ok: true } & T) | ActionFailure;
