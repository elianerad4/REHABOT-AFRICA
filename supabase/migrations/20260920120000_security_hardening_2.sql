-- Security hardening round 2 (2026-09-20): close the remaining gaps reported
-- by the Supabase security advisors after the first hardening pass.

-- ---------------------------------------------------------------------------
-- 1) Freeze clinic_id against self-service writes.
--
-- The first pass locked is_admin/subscription_status/trial_ends_at but left
-- clinic_id writable by the profile's owner. Because clinic_select_own /
-- clinic_update_own authorize on `id in (select clinic_id from profiles where
-- id = auth.uid())`, any authenticated physio could PATCH their own profile to
-- another clinic's UUID and then read or rename that clinic.
--
-- Signup is unaffected: the auth.users trigger (handle_new_user) runs as the
-- definer with no PostgREST JWT context, so auth.role() is null there and this
-- branch is skipped. The app also never writes clinic_id directly (Settings
-- only updates full_name/clinic_name/phone_number/language).
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
      new.clinic_id := null;
    else
      new.is_admin := old.is_admin;
      new.subscription_status := old.subscription_status;
      new.trial_ends_at := old.trial_ends_at;
      new.clinic_id := old.clinic_id;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Stop exposing the internal SECURITY DEFINER functions over PostgREST RPC.
--
-- They were executable by anon/authenticated via /rest/v1/rpc/<fn> through the
-- default PUBLIC grant. Trigger functions never need EXECUTE (the system runs
-- them), so revoke outright. is_admin() IS called from RLS policies, and
-- Postgres checks EXECUTE against the querying role, so keep it for
-- authenticated (every DB-reading page sits behind auth; no public page calls
-- it) while removing it from anon.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_profile_privilege_columns() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
