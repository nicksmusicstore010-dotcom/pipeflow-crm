import { cache } from "react";
import { z } from "zod";

import { isLeadStatus, type LeadStatus } from "@/lib/lead-status";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export const LEADS_PAGE_SIZE = 20;

export type Lead = Tables<"leads">;

export type LeadFilters = {
  q: string;
  status: LeadStatus | null;
  /** A member's id, "none" (no owner) or null (any). */
  owner: string | null;
  /** yyyy-MM-dd, inclusive, in America/Sao_Paulo. */
  from: string | null;
  to: string | null;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// Far beyond any real list; keeps the range offset a plain integer.
const MAX_PAGE = 100_000;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** A real calendar date in yyyy-MM-dd ("2026-02-31" and "2026-13-01" are rejected), or null. */
function parseDate(value: string | undefined) {
  const match = value ? DATE.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? value! : null;
}

/** Query string → filters. Anything invalid is ignored rather than erroring. */
export function parseLeadFilters(searchParams: SearchParams): LeadFilters {
  const status = single(searchParams.status);
  const owner = single(searchParams.owner);
  const from = single(searchParams.from);
  const to = single(searchParams.to);  const page = Number.parseInt(single(searchParams.page) ?? "1", 10);

  return {
    q: (single(searchParams.q) ?? "").trim().slice(0, 100),
    status: isLeadStatus(status) ? status : null,
    owner: owner === "none" || z.uuid().safeParse(owner).success ? owner! : null,
    from: parseDate(from),
    to: parseDate(to),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
  };
}

export function hasActiveFilters(filters: LeadFilters) {
  return Boolean(filters.q || filters.status || filters.owner || filters.from || filters.to);
}

// Brazil has had no DST since 2019, so São Paulo is a fixed UTC-3.
const startOfDaySaoPaulo = (date: string) => new Date(`${date}T00:00:00-03:00`);

/** One page of leads matching the filters, newest first, plus the total count. */
export async function listLeads(workspaceId: string, filters: LeadFilters) {
  const supabase = createClient();
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (filters.q) {
    // Characters with meaning in PostgREST's or() / ilike syntax are dropped.
    const term = filters.q.replace(/[%_,()*"\\]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.owner === "none") query = query.is("owner_id", null);
  else if (filters.owner) query = query.eq("owner_id", filters.owner);
  if (filters.from) query = query.gte("created_at", startOfDaySaoPaulo(filters.from).toISOString());
  if (filters.to) {
    const nextDay = new Date(startOfDaySaoPaulo(filters.to).getTime() + 24 * 60 * 60 * 1000);
    query = query.lt("created_at", nextDay.toISOString());
  }

  const start = (filters.page - 1) * LEADS_PAGE_SIZE;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(start, start + LEADS_PAGE_SIZE - 1);

  // PGRST103: page past the end (e.g. a stale link after deletions).
  if (error?.code === "PGRST103") return { leads: [] as Lead[], total: count ?? 0 };
  if (error) throw error;
  return { leads: data, total: count ?? 0 };
}

/** A lead of this workspace, or null. Cached per request (metadata + page both call it). */
export const getLead = cache(async (workspaceId: string, leadId: string) => {
  if (!z.uuid().safeParse(leadId).success) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw error;
  return data;
});

/** Number of leads in a workspace (head-only count, no rows transferred). */
export async function countLeads(workspaceId: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return count ?? 0;
}
