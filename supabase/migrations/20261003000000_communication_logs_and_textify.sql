-- Rehabot Continuity Engine: Textify Africa integration.
--
-- Adds a single unified communication/notification log so the app can track
-- every patient-facing touchpoint across BOTH channels (WhatsApp and SMS)
-- without scattering SMS-specific columns through unrelated tables.
--
--   * communication_logs  — one row per communication event (outbound or
--     inbound), provider-agnostic. WhatsApp events can be written here too so
--     the clinical timeline is one query, while the existing `message_logs`
--     table stays as the raw chat history (unchanged).
--   * pain_logs.score is widened from 1-10 to 0-10 so the SMS pain-score
--     pathway can accept "0 = no pain" (the brief requires 0-10). The
--     WhatsApp flow still only writes 1-10, so no existing behaviour changes.
--
-- This is additive: no existing table, column, policy or constraint is dropped
-- unless explicitly widened above.

begin;

-- ---------------------------------------------------------------------------
-- 1) Unified communication log
-- ---------------------------------------------------------------------------
create table if not exists public.communication_logs (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid not null references public.patients(id) on delete cascade,
  physio_id          uuid references public.profiles(id) on delete set null,
  clinic_id          uuid references public.clinics(id) on delete set null,
  direction          text not null default 'outbound'
                     constraint communication_logs_direction_check
                     check (direction in ('outbound', 'inbound')),
  channel            text not null
                     constraint communication_logs_channel_check
                     check (channel in ('whatsapp', 'sms')),
  message_type       text not null,
  message_content    text,
  provider           text,
  provider_message_id text,
  status             text not null default 'pending',
  scheduled_at       timestamptz,
  sent_at            timestamptz,
  delivered_at       timestamptz,
  failed_at          timestamptz,
  failure_reason     text,
  response           text,
  response_at        timestamptz,
  idempotency_key    text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint communication_logs_message_type_check
    check (message_type = ANY (ARRAY[
      'appointment_reminder'::text,
      'exercise_reminder'::text,
      'pain_score_request'::text,
      'follow_up'::text,
      'missed_follow_up'::text,
      'otp'::text,
      'system'::text,
      'patient_response'::text
    ]))
);

comment on table public.communication_logs is
  'Unified log of every patient-facing communication event (WhatsApp and SMS). '
  'This is the source of truth for the Rehabot Continuity Engine: each row tracks '
  'channel, provider, provider message id, lifecycle status and timestamps, plus '
  'any patient response. message_logs remains the raw chat history.';

create index if not exists communication_logs_patient_idx
  on public.communication_logs (patient_id, created_at desc);
create index if not exists communication_logs_clinic_idx
  on public.communication_logs (clinic_id);
create index if not exists communication_logs_status_idx
  on public.communication_logs (status);
create index if not exists communication_logs_channel_idx
  on public.communication_logs (channel);
create index if not exists communication_logs_provider_message_id_idx
  on public.communication_logs (provider_message_id);
create index if not exists communication_logs_message_type_idx
  on public.communication_logs (message_type);

-- ---------------------------------------------------------------------------
-- 2) Clinic/physio access helper (SECURITY DEFINER, avoids RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.can_access_patient(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = target_patient
      and (
        p.physio_id = auth.uid()
        or p.clinic_id in (select pr.clinic_id from public.profiles pr where pr.id = auth.uid())
        or public.is_admin()
      )
  )
$$;

grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.can_access_patient(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3) RLS: physios see communication for patients they manage; admins see all.
--    Inserts/updates also flow through Edge Functions with service_role, but
--    the write policies are provided for completeness so the rules hold no
--    matter which role performs the write.
-- ---------------------------------------------------------------------------
alter table public.communication_logs enable row level security;

drop policy if exists "communication_logs_select" on public.communication_logs;
create policy "communication_logs_select" on public.communication_logs
  for select
  using (public.can_access_patient(patient_id));

drop policy if exists "communication_logs_insert" on public.communication_logs;
create policy "communication_logs_insert" on public.communication_logs
  for insert
  with check (public.can_access_patient(patient_id));

drop policy if exists "communication_logs_update" on public.communication_logs;
create policy "communication_logs_update" on public.communication_logs
  for update
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

-- No delete policy: communication history is append-only.

-- ---------------------------------------------------------------------------
-- 4) updated_at trigger (reuses the existing touch_updated_at helper)
-- ---------------------------------------------------------------------------
drop trigger if exists communication_logs_touch_updated_at on public.communication_logs;
create trigger communication_logs_touch_updated_at
  before update on public.communication_logs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Widen pain_logs.score to 0-10 so the SMS pathway can record "0 = no pain".
--    The constraint name may differ across environments, so find and drop any
--    check constraint on the score column before re-adding the 0-10 range.
-- ---------------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.conrelid = 'public.pain_logs'::regclass
      and con.contype = 'c'
      and att.attname = 'score'
  loop
    execute format('alter table public.pain_logs drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.pain_logs
  add constraint pain_logs_score_check
  check (score >= 0 and score <= 10);

-- ---------------------------------------------------------------------------
-- 6) Grants
-- ---------------------------------------------------------------------------
grant select, insert, update on public.communication_logs to authenticated;

commit;
