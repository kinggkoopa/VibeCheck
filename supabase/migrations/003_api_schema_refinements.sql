-- MetaVibeCoder v1 — API schema refinements
-- Adds: model_preferences, key_hint column, validated_at tracking

-- ══════════════════════════════════════════════════════════════════
-- COLUMN: key_hint — last 4 chars of the raw key for UI display
-- ══════════════════════════════════════════════════════════════════
alter table public.user_llm_keys
  add column if not exists key_hint text not null default '';

alter table public.user_llm_keys
  add column if not exists validated_at timestamptz;

-- Update store_user_key to also persist key_hint and validated_at
create or replace function store_user_key(
  p_provider      text,
  p_api_key       text,
  p_display_label text default '',
  p_model_default text default null,
  p_validated     boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
  enc_key text := get_encryption_key();
  hint text := right(p_api_key, 4);
begin
  insert into public.user_llm_keys
    (user_id, provider, display_label, encrypted_key, model_default, key_hint, validated_at)
  values (
    auth.uid(),
    p_provider,
    p_display_label,
    extensions.pgp_sym_encrypt(p_api_key, enc_key),
    p_model_default,
    hint,
    case when p_validated then now() else null end
  )
  on conflict (user_id, provider) do update set
    encrypted_key = extensions.pgp_sym_encrypt(p_api_key, enc_key),
    display_label = excluded.display_label,
    model_default = coalesce(excluded.model_default, public.user_llm_keys.model_default),
    key_hint      = hint,
    validated_at  = case when p_validated then now() else null end,
    is_active     = true,
    updated_at    = now()
  returning id into new_id;

  return new_id;
end;
$$;

-- Update list_user_keys to include new columns
-- Must drop first: return columns changed from prior migration
drop function if exists list_user_keys();
create or replace function list_user_keys()
returns table (
  id            uuid,
  provider      text,
  display_label text,
  model_default text,
  is_active     boolean,
  key_hint      text,
  validated_at  timestamptz,
  created_at    timestamptz
)
language sql
security definer
stable
as $$
  select id, provider, display_label, model_default, is_active,
         key_hint, validated_at, created_at
  from public.user_llm_keys
  where user_id = auth.uid()
  order by created_at;
$$;


-- ══════════════════════════════════════════════════════════════════
-- TABLE: model_preferences — per-user model selection per feature
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.model_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  feature    text not null check (feature in (
    'optimize', 'critique', 'agents', 'memory'
  )),
  provider   text not null check (provider in (
    'anthropic', 'openrouter', 'groq', 'openai', 'ollama'
  )),
  model_id   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature)
);

alter table public.model_preferences enable row level security;

create policy "Users manage own model preferences"
  on public.model_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
