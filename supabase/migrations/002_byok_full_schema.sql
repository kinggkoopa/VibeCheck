-- MetaVibeCoder v1 — Full schema with BYOK encrypted key storage
-- Requires extensions: pgcrypto, vector (enable in Supabase Dashboard)

-- ── Extensions ──
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector  with schema extensions;

-- ── Vault: store the symmetric encryption passphrase ──
-- Run this ONCE manually in the Supabase SQL editor:
--   select vault.create_secret('your-strong-random-passphrase', 'metavibecoder_encryption_key');
-- The passphrase is used by pgp_sym_encrypt/decrypt for BYOK key storage.
-- NEVER expose this passphrase outside the database.

-- Helper: retrieve the encryption passphrase from Vault
create or replace function get_encryption_key()
returns text
language plpgsql
security definer
as $$
declare
  enc_key text;
begin
  select decrypted_secret into enc_key
  from vault.decrypted_secrets
  where name = 'metavibecoder_encryption_key'
  limit 1;

  if enc_key is null then
    raise exception 'Encryption key not found in Vault. Run: select vault.create_secret(...)';
  end if;

  return enc_key;
end;
$$;

-- Revoke direct access — only callable by functions with SECURITY DEFINER
revoke execute on function get_encryption_key() from public;
revoke execute on function get_encryption_key() from anon;
revoke execute on function get_encryption_key() from authenticated;


-- ══════════════════════════════════════════════════════════════════
-- TABLE: user_llm_keys — BYOK encrypted API key storage
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.user_llm_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('anthropic', 'openrouter', 'groq', 'openai', 'ollama')),
  display_label text not null default '',
  encrypted_key bytea not null,            -- pgp_sym_encrypt'd API key
  model_default text,                      -- user's preferred model for this provider
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)               -- one key per provider per user
);

alter table public.user_llm_keys enable row level security;

create policy "Users manage own keys"
  on public.user_llm_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RPC: store an API key (encrypts before INSERT)
create or replace function store_user_key(
  p_provider      text,
  p_api_key       text,
  p_display_label text default '',
  p_model_default text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
  enc_key text := get_encryption_key();
begin
  insert into public.user_llm_keys (user_id, provider, display_label, encrypted_key, model_default)
  values (
    auth.uid(),
    p_provider,
    p_display_label,
    extensions.pgp_sym_encrypt(p_api_key, enc_key),
    p_model_default
  )
  on conflict (user_id, provider) do update set
    encrypted_key = extensions.pgp_sym_encrypt(p_api_key, enc_key),
    display_label = excluded.display_label,
    model_default = coalesce(excluded.model_default, public.user_llm_keys.model_default),
    is_active     = true,
    updated_at    = now()
  returning id into new_id;

  return new_id;
end;
$$;

-- RPC: retrieve a decrypted API key (server-side only)
create or replace function get_decrypted_key(p_provider text)
returns text
language plpgsql
security definer
as $$
declare
  raw_key text;
  enc_key text := get_encryption_key();
begin
  select extensions.pgp_sym_decrypt(encrypted_key, enc_key)
  into raw_key
  from public.user_llm_keys
  where user_id = auth.uid()
    and provider = p_provider
    and is_active = true;

  return raw_key; -- null if not found
end;
$$;

-- RPC: list keys (metadata only — never returns decrypted keys)
create or replace function list_user_keys()
returns table (
  id            uuid,
  provider      text,
  display_label text,
  model_default text,
  is_active     boolean,
  created_at    timestamptz
)
language sql
security definer
stable
as $$
  select id, provider, display_label, model_default, is_active, created_at
  from public.user_llm_keys
  where user_id = auth.uid()
  order by created_at;
$$;


-- ══════════════════════════════════════════════════════════════════
-- TABLE: memories — pgvector persistent memory
-- ══════════════════════════════════════════════════════════════════
drop table if exists public.memories cascade;

create table public.memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null,
  embedding  vector(1536),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;

create policy "Users manage own memories"
  on public.memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Similarity search function
create or replace function match_memories(
  query_embedding vector(1536),
  match_count     int default 5,
  filter_user_id  uuid default null
)
returns table (id uuid, content text, metadata jsonb, similarity float)
language plpgsql stable
as $$
begin
  return query
  select m.id, m.content, m.metadata,
         1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where (filter_user_id is null or m.user_id = filter_user_id)
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;

create index if not exists memories_embedding_idx
  on public.memories using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);


-- ══════════════════════════════════════════════════════════════════
-- TABLE: prompt_optimizations
-- ══════════════════════════════════════════════════════════════════
drop table if exists public.prompt_optimizations cascade;

create table public.prompt_optimizations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  original_prompt  text not null,
  optimized_prompt text not null,
  strategy         text not null check (strategy in (
    'clarity','specificity','chain-of-thought','few-shot','role-based'
  )),
  score_before     smallint,
  score_after      smallint,
  created_at       timestamptz not null default now()
);

alter table public.prompt_optimizations enable row level security;

create policy "Users manage own optimizations"
  on public.prompt_optimizations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════
-- TABLE: swarm_runs — multi-agent execution logs
-- ══════════════════════════════════════════════════════════════════
drop table if exists public.swarm_runs cascade;

create table public.swarm_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  task         text not null,
  messages     jsonb not null default '[]'::jsonb,
  final_output text not null default '',
  status       text not null default 'running'
    check (status in ('running','completed','failed')),
  iteration    smallint not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.swarm_runs enable row level security;

create policy "Users manage own swarm runs"
  on public.swarm_runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════
-- TABLE: critiques — code review results
-- ══════════════════════════════════════════════════════════════════
drop table if exists public.critiques cascade;

create table public.critiques (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  swarm_run_id  uuid references public.swarm_runs(id) on delete set null,
  code_snippet  text not null,
  issues        jsonb not null default '[]'::jsonb,
  overall_score smallint not null check (overall_score between 0 and 100),
  summary       text not null,
  created_at    timestamptz not null default now()
);

alter table public.critiques enable row level security;

create policy "Users manage own critiques"
  on public.critiques for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════
-- TABLE: prompt_library — saved reusable prompts
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.prompt_library (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  content    text not null,
  tags       text[] not null default '{}',
  usage_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prompt_library enable row level security;

create policy "Users manage own prompts"
  on public.prompt_library for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════
-- TABLE: analytics — usage tracking for vibe profile
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.analytics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'optimization','swarm_run','critique','memory_store','memory_search'
  )),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics enable row level security;

create policy "Users read own analytics"
  on public.analytics for select
  using (auth.uid() = user_id);

create policy "System inserts analytics"
  on public.analytics for insert
  with check (auth.uid() = user_id);

-- Index for analytics dashboard queries
create index if not exists analytics_user_event_idx
  on public.analytics (user_id, event_type, created_at desc);
