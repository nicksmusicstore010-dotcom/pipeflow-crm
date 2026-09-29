import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.").max(254, "E-mail longo demais.")),
  role: z.enum(["admin", "member"], { message: "Escolha o papel." }),
});

export type InviteInput = z.input<typeof inviteSchema>;

export const roleSchema = z.enum(["admin", "member"]);
