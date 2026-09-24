import { z } from "zod";

import { LEAD_STATUSES } from "@/lib/lead-status";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use no máximo ${max} caracteres.`);

/**
 * Lead form fields. Shared by the form (client) and the Server Actions (server).
 * Optional fields are strings where "" means empty; `toLeadRow` turns them into nulls.
 */
export const leadSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120, "Use no máximo 120 caracteres."),
  email: optionalText(254).refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "E-mail inválido.",
  ),
  phone: optionalText(40),
  company: optionalText(120),
  position: optionalText(120),
  status: z.enum(LEAD_STATUSES, "Status inválido."),
  /** "" = sem responsável. */
  ownerId: z.union([z.literal(""), z.uuid("Responsável inválido.")]),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

/** Validated form values → columns of `leads`. */
export function toLeadRow(values: LeadFormValues) {
  return {
    name: values.name,
    email: values.email.toLowerCase() || null,
    phone: values.phone || null,
    company: values.company || null,
    position: values.position || null,
    status: values.status,
    owner_id: values.ownerId || null,
  };
}
