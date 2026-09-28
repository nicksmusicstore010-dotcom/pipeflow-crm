import { z } from "zod";

import { DEAL_STAGES } from "@/lib/deal-stages";
import { parseMoneyToCents } from "@/lib/utils";

/** Mirrors the `value_cents` check in the database (R$ 10 bilhões). */
const MAX_VALUE_CENTS = 1_000_000_000_000;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day as "yyyy-MM-dd" (what `<input type="date">` gives). */
function isCalendarDay(value: string) {
  const match = DAY.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const optionalId = (message: string) => z.union([z.literal(""), z.uuid(message)]);

/**
 * Deal form fields. Shared by the form (client) and the Server Actions (server).
 * `value` is the text typed by the user ("1.234,56"); "" means R$ 0,00.
 */
export const dealSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(120, "Use no máximo 120 caracteres."),
  value: z
    .string()
    .trim()
    .refine((value) => value === "" || parseMoneyToCents(value) !== null, "Valor inválido. Ex.: 1.500,00")
    .refine((value) => (parseMoneyToCents(value) ?? 0) <= MAX_VALUE_CENTS, "Valor muito alto."),
  stage: z.enum(DEAL_STAGES, "Etapa inválida."),
  /** "" = sem lead. */
  leadId: optionalId("Lead inválido."),
  /** "" = sem responsável. */
  ownerId: optionalId("Responsável inválido."),
  /** "" = sem prazo. */
  dueDate: z.union([z.literal(""), z.string().refine(isCalendarDay, "Data inválida.")]),
});

export type DealFormValues = z.infer<typeof dealSchema>;

/** Validated form values → columns of `deals` (stage is handled separately: it moves the card). */
export function toDealRow(values: DealFormValues) {
  return {
    title: values.title,
    value_cents: parseMoneyToCents(values.value) ?? 0,
    lead_id: values.leadId || null,
    owner_id: values.ownerId || null,
    due_date: values.dueDate || null,
  };
}
