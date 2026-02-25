-- MetaVibeCoder v1 — Taste Profile, User Settings, and Improvement Logs
-- Migration 006: Adds tables for taste/vibe personalization, general user settings,
-- and self-improving agent logs.

-- ── Taste Preferences ──
-- Stores per-user coding style, framework, and vibe preferences.
-- Injected into ALL LLM system prompts via getTasteInjection().
create table if not exists public.taste_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language_preferences jsonb not null default '["TypeScript"]'::jsonb,
  framework_preferences jsonb not null default '["Next.js", "React", "Tailwind CSS"]'::jsonb,
  code_style text not null default 'functional',
  comment_style text not null default 'minimal',
  naming_convention text not null default 'camelCase',
  tone text not null default 'direct',
  verbosity text not null default 'concise',
  timezone text not null default 'America/New_York',
  locale_city text not null default '',
  vibe_mode text not null default 'flow-state',
  custom_instructions text not null default '',
  avoided_patterns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.taste_prefs enable row level security;
create policy "Users read own taste" on public.taste_prefs
  for select using (auth.uid() = user_id);
create policy "Users upsert own taste" on public.taste_prefs
  for insert with check (auth.uid() = user_id);
create policy "Users update own taste" on public.taste_prefs
  for update using (auth.uid() = user_id);

-- ── User Settings ──
-- General user settings for features like knowledge sync, GitHub, etc.
-- Used by clone/export-import and various feature integrations.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  obsidian_vault_path text,
  notion_api_key text,
  notion_database_id text,
  knowledge_sync_enabled boolean not null default false,
  github_token text,
  github_default_repo text,
  push_subscription jsonb,
  reference_folder_path text,
  reference_index jsonb,
  tts_voice text not null default 'default',
  tts_rate real not null default 1.0,
  tts_pitch real not null default 1.0,
  tts_auto_speak boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "Users read own settings" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "Users upsert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "Users update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- ── Improvement Logs ──
-- Tracks self-improving meta-agent runs and taste profile auto-updates.
create table if not exists public.improvement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis jsonb not null default '{}'::jsonb,
  preferences_added jsonb not null default '[]'::jsonb,
  prompts_updated integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.improvement_logs enable row level security;
create policy "Users read own improvement logs" on public.improvement_logs
  for select using (auth.uid() = user_id);
create policy "Users insert own improvement logs" on public.improvement_logs
  for insert with check (auth.uid() = user_id);

-- ── Prompt Library (if not exists from prior migrations) ──
-- Safe to re-run: uses IF NOT EXISTS.
create table if not exists public.prompt_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  tags jsonb not null default '[]'::jsonb,
  usage_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Only create RLS if table was just created (policies may already exist)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'prompt_library' and policyname = 'Users read own prompts'
  ) then
    alter table public.prompt_library enable row level security;
    create policy "Users read own prompts" on public.prompt_library
      for select using (auth.uid() = user_id);
    create policy "Users insert own prompts" on public.prompt_library
      for insert with check (auth.uid() = user_id);
    create policy "Users update own prompts" on public.prompt_library
      for update using (auth.uid() = user_id);
    create policy "Users delete own prompts" on public.prompt_library
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ── Add strategy 'best-practice' to prompt_optimizations if constraint needs updating ──
-- The check constraint may not include 'best-practice' from the original migration.
-- Safe to run: drops and recreates the constraint.
do $$
begin
  -- Drop old constraint if it exists
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'prompt_optimizations'
      and constraint_type = 'CHECK'
      and constraint_name = 'prompt_optimizations_strategy_check'
  ) then
    alter table public.prompt_optimizations drop constraint prompt_optimizations_strategy_check;
  end if;

  -- Add updated constraint with 'best-practice'
  alter table public.prompt_optimizations
    add constraint prompt_optimizations_strategy_check
    check (strategy in ('clarity', 'specificity', 'chain-of-thought', 'few-shot', 'role-based', 'best-practice'));
exception
  when others then null; -- safe to ignore if constraint already correct
end $$;
