import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
})

/** Integer cents → "R$ 1.234,56". */
export function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100)
}

/** timestamptz (ISO string or Date) → "dd/MM/yyyy" in America/Sao_Paulo. */
export function formatDate(value: string | Date) {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value)
}

/** First character of a string, emoji-safe ("🚀 Time" → "🚀", not half a surrogate pair). */
export function firstChar(value: string) {
  return Array.from(value.trim())[0] ?? ""
}

/** "Maria da Silva" → "MS"; "ana" → "A". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = firstChar(parts[0] ?? "")
  const last = parts.length > 1 ? firstChar(parts[parts.length - 1]) : ""
  return (first + last).toUpperCase()
}
