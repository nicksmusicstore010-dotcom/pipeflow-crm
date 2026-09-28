import { z } from "zod";

import { ACTIVITY_TYPES } from "@/lib/activity-types";

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** A real "yyyy-MM-ddTHH:mm" (what `<input type="datetime-local">` gives). */
function isLocalDateTime(value: string) {
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    year >= 2000 &&
    year <= 2100 &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
  );
}

/** Activity form fields. Shared by the form (client) and the Server Actions (server). */
export const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES, "Tipo inválido."),
  description: z
    .string()
    .trim()
    .min(1, "Descreva a atividade.")
    .max(2000, "Use no máximo 2000 caracteres."),
  /** São Paulo local time, "yyyy-MM-ddTHH:mm". */
  occurredAt: z.string().refine(isLocalDateTime, "Informe data e hora."),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;
