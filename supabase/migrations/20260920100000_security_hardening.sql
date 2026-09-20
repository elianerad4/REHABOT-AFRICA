-- Security hardening: close the two CRITICAL cross-tenant RLS gaps found in
-- the 2026-09-20 audit, plus three lower-severity DB hygiene fixes.

-- ---------------------------------------------------------------------------
-- 1) Prevent self-service privilege escalation on profiles.
--
-- profiles_insert / profiles_update only ever checked row ownership
-- (auth.uid() = id) with no restriction on WHICH columns could change, and
-- `is_admin`, `subscription_status`, `trial_ends_at` all carry ordinary
-- INSERT/UPDATE grants for the `authenticated` role (Supabase's default).
-- That let any signed-in physio PATCH their own profile row to
-- {"is_admin": true} (or INSERT it that way at signup) and instantly gain
-- every is_admin()-gated policy across the schema, plus a free subscription.
--
-- This trigger freezes those three columns whenever the request comes in as
-- the ordinary PostgREST end-user roles (anon/authenticated) — the only
-- roles an external attacker can ever authenticate as. service_role calls
-- (Edge Functions), the auth.users trigger, pg_cron, and direct Studio/SQL
-- access all run with no PostgREST JWT context (auth.role() is null there)
-- and pass through untouched, so legitimate admin promotion via the
-- dashboard SQL editor still works.
create or replace function public.enforce_profile_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() = 'authenticated' or auth.role() = 'anon' then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.subscription_status := 'trial';
      new.trial_ends_at := now() + interval '14 days';
    else
      new.is_admin := old.is_admin;
      new.subscription_status := old.subscription_status;
      new.trial_ends_at := old.trial_ends_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_privilege_columns on public.profiles;
create trigger trg_enforce_profile_privilege_columns
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_privilege_columns();

-- ---------------------------------------------------------------------------
-- 2) Drop the redundant, overly-broad exercises SELECT policy.
--
-- Postgres OR-combines multiple permissive policies for the same command.
-- `exercises_select_authenticated` (auth.role() = 'authenticated', no other
-- condition) silently overrode the intended `physio_exercises` policy
-- (own rows or is_global), letting any physio read every other clinic's
-- custom exercise library. `physio_exercises` already covers the
-- legitimate case, so this policy is simply removed.
drop policy if exists exercises_select_authenticated on public.exercises;

-- ---------------------------------------------------------------------------
-- 3) Prevent cross-patient / cross-clinic phone-number collisions.
--
-- handle-inbound resolves the sender by phone_number + status='active' with
-- no uniqueness guarantee, so two active patients (even in different
-- clinics) sharing a number would have inbound replies, pain scores, and
-- video sends misattributed. Enforce uniqueness among active patients only,
-- so a discharged/paused patient's old number can be reused.
create unique index if not exists patients_phone_number_active_unique
  on public.patients (phone_number)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- 4) Pin search_path on touch_updated_at (flagged by `supabase db advisors`).
-- Not SECURITY DEFINER, so this was low-risk, but costs nothing to fix.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Constrain the exercise-videos bucket to what it's actually used for.
-- WhatsApp's Cloud API already rejects videos over 16MB (enforced in the
-- Edge Functions before sending) — mirror that at the bucket level too, and
-- restrict uploads to the one MIME type the product sends.
update storage.buckets
set file_size_limit = 16777216,
    allowed_mime_types = array['video/mp4']
where id = 'exercise-videos';
