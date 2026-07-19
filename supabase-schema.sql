create table public.focus_user_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.focus_user_snapshots enable row level security;

create policy "Users can read their FOCUS data"
on public.focus_user_snapshots for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their FOCUS data"
on public.focus_user_snapshots for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their FOCUS data"
on public.focus_user_snapshots for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
