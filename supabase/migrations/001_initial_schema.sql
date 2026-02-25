-- MetaVibeCoder v1 — Initial database schema
-- Run via: supabase db push

-- ── Prompt Optimizations ──
create table if not exists public.prompt_optimizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_prompt text not null,
  optimized_prompt text not null,
  strategy text not null check (strategy in ('clarity', 'specificity', 'chain-of-thought', 'few-shot', 'role-based')),
  score_before smallint,
  score_after smallint,
  created_at timestamptz not null default now()
);

alter table public.prompt_optimizations enable row level security;
create policy "Users read own optimizations" on public.prompt_optimizations
  for select using (auth.uid() = user_id);
create policy "Users insert own optimizations" on public.prompt_optimizations
  for insert with check (auth.uid() = user_id);

-- ── Swarm Runs ──
create table if not exists public.swarm_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  messages jsonb not null default '[]'::jsonb,
  final_output text not null default '',
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.swarm_runs enable row level security;
create policy "Users read own swarm runs" on public.swarm_runs
  for select using (auth.uid() = user_id);
create policy "Users insert own swarm runs" on public.swarm_runs
  for insert with check (auth.uid() = user_id);
create policy "Users update own swarm runs" on public.swarm_runs
  for update using (auth.uid() = user_id);

-- ── Critiques ──
create table if not exists public.critiques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  swarm_run_id uuid references public.swarm_runs(id) on delete set null,
  code_snippet text not null,
  issues jsonb not null default '[]'::jsonb,
  overall_score smallint not null check (overall_score between 0 and 100),
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.critiques enable row level security;
create policy "Users read own critiques" on public.critiques
  for select using (auth.uid() = user_id);
create policy "Users insert own critiques" on public.critiques
  for insert with check (auth.uid() = user_id);

-- ── Memory (vector store) ──
-- Requires the pgvector extension to be enabled in Supabase dashboard.
create extension if not exists vector with schema extensions;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;
create policy "Users read own memories" on public.memories
  for select using (auth.uid() = user_id);
create policy "Users insert own memories" on public.memories
  for insert with check (auth.uid() = user_id);
create policy "Users delete own memories" on public.memories
  for delete using (auth.uid() = user_id);

-- Similarity search function
create or replace function public.match_memories(
  query_embedding vector(1536),
  match_count int default 5,
  filter_user_id uuid default null
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.content,
    m.metadata,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where (filter_user_id is null or m.user_id = filter_user_id)
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Index for fast vector similarity search
create index if not exists memories_embedding_idx
  on public.memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
