-- Add clinics table for multi-clinic / multi-physio management
-- Applied manually via Supabase SQL editor on 2026-08-19.

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists clinic_id uuid references public.clinics(id) on delete set null;
alter table public.patients add column if not exists clinic_id uuid references public.clinics(id) on delete set null;

create unique index if not exists clinics_name_key on public.clinics (lower(name));

-- Backfill: create one clinic per distinct existing clinic_name, then link physios and patients.
with distinct_clinics as (
  select distinct trim(clinic_name) as name
  from public.profiles
  where clinic_name is not null and trim(clinic_name) <> ''
)
insert into public.clinics (name)
select name from distinct_clinics;

update public.profiles p
set clinic_id = c.id
from public.clinics c
where p.clinic_id is null
  and p.clinic_name is not null
  and trim(p.clinic_name) = c.name;

update public.patients pt
set clinic_id = pr.clinic_id
from public.profiles pr
where pt.clinic_id is null
  and pt.physio_id = pr.id
  and pr.clinic_id is not null;

-- RLS: physios can read/update their own clinic; admins can read all.
alter table public.clinics enable row level security;

drop policy if exists "clinic_select_own" on public.clinics;
create policy "clinic_select_own" on public.clinics
  for select
  using (
    id in (select clinic_id from public.profiles where id = auth.uid())
    or (select is_admin from public.profiles where id = auth.uid())
  );

drop policy if exists "clinic_insert" on public.clinics;
create policy "clinic_insert" on public.clinics
  for insert
  with check (
    auth.uid() is not null
  );

drop policy if exists "clinic_update_own" on public.clinics;
create policy "clinic_update_own" on public.clinics
  for update
  using (
    id in (select clinic_id from public.profiles where id = auth.uid())
  )
  with check (
    id in (select clinic_id from public.profiles where id = auth.uid())
  );

-- Create/link the physio's clinic automatically on account confirmation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_clinic_name text;
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    v_clinic_name := nullif(trim(coalesce(new.raw_user_meta_data->>'clinic_name','')), '');

    if v_clinic_name is not null then
      insert into public.clinics (name)
      values (v_clinic_name)
      on conflict do nothing
      returning id into v_clinic_id;

      if v_clinic_id is null then
        select id into v_clinic_id
        from public.clinics
        where name = v_clinic_name
        limit 1;
      end if;
    end if;

    insert into public.profiles (id, full_name, clinic_name, clinic_id)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      v_clinic_name,
      v_clinic_id
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

-- Admin access helper (SECURITY DEFINER to avoid RLS recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

-- Admin policies so the admin panel can see all physios/patients/messages.
drop policy if exists "admin_profiles_select" on public.profiles;
create policy "admin_profiles_select" on public.profiles
  for select
  using (public.is_admin());

drop policy if exists "admin_profiles_update" on public.profiles;
create policy "admin_profiles_update" on public.profiles
  for update
  using (public.is_admin());

drop policy if exists "admin_patients_select" on public.patients;
create policy "admin_patients_select" on public.patients
  for select
  using (public.is_admin());

drop policy if exists "admin_message_logs_select" on public.message_logs;
create policy "admin_message_logs_select" on public.message_logs
  for select
  using (public.is_admin());

-- Clinic select also uses the helper for admins (avoid recursion).
drop policy if exists "clinic_select_own" on public.clinics;
create policy "clinic_select_own" on public.clinics
  for select
  using (
    id in (select clinic_id from public.profiles where id = auth.uid())
    or public.is_admin()
  );
