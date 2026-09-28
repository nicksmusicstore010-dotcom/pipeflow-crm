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

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
})

/** timestamptz → "25/09/2026 às 14:32" in America/Sao_Paulo. */
export function formatDateTime(value: string | Date) {
  const parts = dateTimeFormatter.formatToParts(typeof value === "string" ? new Date(value) : value)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}/${get("month")}/${get("year")} às ${get("hour")}:${get("minute")}`
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

/** "2026-09-30" (a `date` column) → "30/09/2026". Not via Date: UTC midnight is the previous day in São Paulo. */
export function formatDay(day: string) {
  const [year, month, date] = day.split("-")
  return `${date}/${month}/${year}`
}

const saoPauloDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Sao_Paulo",
})

/** Today in São Paulo as "yyyy-MM-dd". */
export function todaySaoPaulo(now = new Date()) {
  return saoPauloDay.format(now)
}

/** Whole days from `from` to `to`, both "yyyy-MM-dd" (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * What someone typed in a money field → cents, or null if it isn't a valid amount.
 * Brazilian format: "1.234,56", "1234,5", "R$ 1.234" and "1234" are accepted; a lone dot with
 * one or two decimals ("99.9") is read as the decimal separator.
 */
export function parseMoneyToCents(input: string) {
  let text = input.replace(/R\$|\s/g, "")
  if (text === "") return null
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".")
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "")
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const cents = Math.round(Number(text) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

/** Cents → "1.234,56" (no currency symbol), for money inputs. */
export function formatMoneyInput(cents: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)
}

const saoPauloParts = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Sao_Paulo",
})

/** A timestamptz (default: now) as "yyyy-MM-ddTHH:mm" in São Paulo, for `<input type="datetime-local">`. */
export function toSaoPauloInput(value: string | Date = new Date()) {
  const parts = saoPauloParts.formatToParts(typeof value === "string" ? new Date(value) : value)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

/** "yyyy-MM-ddTHH:mm" typed in São Paulo (fixed UTC-3, no DST since 2019) → ISO string in UTC. */
export function fromSaoPauloInput(local: string) {
  return new Date(`${local}:00-03:00`).toISOString()
}
