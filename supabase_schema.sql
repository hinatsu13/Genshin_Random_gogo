-- Run this once in your Supabase project's SQL Editor (Project -> SQL Editor -> New query).
-- Creates the two tables the app expects: players and player_characters.
-- RLS is enabled but wide open, matching this project's "small trusted friend group,
-- no auth" design (see CLAUDE.md).

create table if not exists public.players (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.player_characters (
    id uuid primary key default gen_random_uuid(),
    player_id uuid not null references public.players (id) on delete cascade,
    character_id text not null,
    created_at timestamptz not null default now(),
    unique (player_id, character_id)
);

create index if not exists player_characters_player_id_idx
    on public.player_characters (player_id);

alter table public.players enable row level security;
alter table public.player_characters enable row level security;

drop policy if exists "Allow all on players" on public.players;
create policy "Allow all on players" on public.players
    for all using (true) with check (true);

drop policy if exists "Allow all on player_characters" on public.player_characters;
create policy "Allow all on player_characters" on public.player_characters
    for all using (true) with check (true);

-- RLS policies alone aren't enough: Postgres also requires the anon/authenticated
-- roles to have table-level grants, or you'll hit "permission denied for table players"
-- even with a permissive policy above.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant select, insert, update, delete on public.player_characters to anon, authenticated;
