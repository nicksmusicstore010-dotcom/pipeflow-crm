import { CalendarDays, Mail, Phone, StickyNote, type LucideIcon } from "lucide-react";

import type { Enums } from "@/types/database";

export type ActivityType = Enums<"activity_type">;

/** Activity types in display order — single source of truth for labels, icons and colors. */
export const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const satisfies readonly ActivityType[];

// Full class names (no string building) so Tailwind can see them.
export const ACTIVITY_TYPE_STYLES: Record<
  ActivityType,
  { label: string; icon: LucideIcon; tone: string; placeholder: string }
> = {
  call: {
    label: "Ligação",
    icon: Phone,
    tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    placeholder: "Como foi a ligação? Ex.: Conversei com a Juliana, pediu proposta até sexta.",
  },
  email: {
    label: "E-mail",
    icon: Mail,
    tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    placeholder: "O que foi enviado ou recebido? Ex.: Enviei a apresentação e a tabela de preços.",
  },
  meeting: {
    label: "Reunião",
    icon: CalendarDays,
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    placeholder: "Pauta ou resumo da reunião. Ex.: Demonstração do produto para o time comercial.",
  },
  note: {
    label: "Nota",
    icon: StickyNote,
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    placeholder: "Anotação sobre o lead. Ex.: Prefere contato por WhatsApp à tarde.",
  },
};
