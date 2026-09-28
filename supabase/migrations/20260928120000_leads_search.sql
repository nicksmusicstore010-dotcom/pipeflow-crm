-- Accent- and case-insensitive lead search: "joao" finds "João", "clinica" finds "Clínica".
-- A generated column keeps name + e-mail + company unaccented and lowercased; a trigram
-- index keeps `ilike '%term%'` fast as the list grows.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() is only STABLE (it reads a dictionary), and generated columns need an
-- IMMUTABLE expression. Pinning the dictionary makes the result fixed for a given input.
create function public.search_normalize(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
$$;

alter table public.leads
  add column search_text text generated always as (
    public.search_normalize(name || ' ' || coalesce(email, '') || ' ' || coalesce(company, ''))
  ) stored;

create index leads_search_text_trgm_idx on public.leads using gin (search_text extensions.gin_trgm_ops);
