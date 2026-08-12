create extension if not exists pgcrypto;

create table if not exists app_config (
  id integer primary key,
  site_name text not null,
  background_image text not null default ''
);

create table if not exists counselors (
  id text primary key,
  iglesia text not null default '',
  nombre text not null,
  telefono text not null default '',
  edad integer null,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  nombre text not null,
  fecha date not null,
  descripcion text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  counselor_id text not null references counselors(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  timestamp timestamptz not null default now(),
  unique (counselor_id, event_id)
);

alter table app_config enable row level security;
alter table counselors enable row level security;
alter table events enable row level security;
alter table checkins enable row level security;

revoke all on table app_config from anon, authenticated;
revoke all on table counselors from anon, authenticated;
revoke all on table events from anon, authenticated;
revoke all on table checkins from anon, authenticated;

drop policy if exists app_config_deny_all on app_config;
drop policy if exists counselors_deny_all on counselors;
drop policy if exists events_deny_all on events;
drop policy if exists checkins_deny_all on checkins;

create policy app_config_deny_all on app_config
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy counselors_deny_all on counselors
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy events_deny_all on events
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy checkins_deny_all on checkins
  for all
  to anon, authenticated
  using (false)
  with check (false);

insert into app_config (id, site_name, background_image)
values (1, 'Portal de Check-In', '')
on conflict (id) do nothing;
