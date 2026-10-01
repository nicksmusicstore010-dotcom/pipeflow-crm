import { z } from "zod";

import { DEAL_STAGES } from "@/lib/deal-stages";
import { LEAD_STATUSES } from "@/lib/lead-status";
import { isCalendarDay } from "@/lib/validations/deal";

// Bodies of the public API (/api/v1), in snake_case like its responses. Same
// limits as the forms and the database checks. `null` clears an optional field.

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((value) => value || null)
    .nullable();

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((value) => value === "" || z.email().safeParse(value).success, "E-mail inválido.")
  .transform((value) => value || null)
  .nullable();

const leadFields = {
  name: z.string().trim().min(1, "Informe o nome.").max(120, "Use no máximo 120 caracteres."),
  email,
  phone: text(40),
  company: text(120),
  position: text(120),
  status: z.enum(LEAD_STATUSES, "Status inválido."),
  owner_id: z.uuid("owner_id inválido.").nullable(),
};

export const apiLeadCreateSchema = z.strictObject({
  ...leadFields,
  email: leadFields.email.optional(),
  phone: leadFields.phone.optional(),
  company: leadFields.company.optional(),
  position: leadFields.position.optional(),
  status: leadFields.status.optional(),
  owner_id: leadFields.owner_id.optional(),
});

export const apiLeadUpdateSchema = z
  .strictObject(leadFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Envie pelo menos um campo.");

const dealFields = {
  title: z.string().trim().min(1, "Informe o título.").max(120, "Use no máximo 120 caracteres."),
  value_cents: z.int("value_cents precisa ser um inteiro (centavos).").min(0).max(1_000_000_000_000),
  stage: z.enum(DEAL_STAGES, "Etapa inválida."),
  lead_id: z.uuid("lead_id inválido.").nullable(),
  owner_id: z.uuid("owner_id inválido.").nullable(),
  due_date: z.string().refine(isCalendarDay, "due_date precisa ser uma data yyyy-MM-dd.").nullable(),
};

export const apiDealCreateSchema = z.strictObject({
  ...dealFields,
  value_cents: dealFields.value_cents.optional(),
  stage: dealFields.stage.optional(),
  lead_id: dealFields.lead_id.optional(),
  owner_id: dealFields.owner_id.optional(),
  due_date: dealFields.due_date.optional(),
});

export const apiDealUpdateSchema = z
  .strictObject(dealFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Envie pelo menos um campo.");
