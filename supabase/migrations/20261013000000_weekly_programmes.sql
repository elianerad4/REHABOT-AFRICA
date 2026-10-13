-- Weekly Physiotherapy Programmes
-- =============================================================================
-- Adds patient-specific weekly treatment programmes with per-day exercise
-- planning and date-specific sessions, wired into the existing reminder /
-- adherence / pain-score workflow.
--
-- This is additive: no existing table, column, policy or constraint is dropped.
-- It reuses the existing patients / exercises / clinics / profiles tables and
-- the existing RLS helpers (can_access_patient, is_admin) so a physiotherapist
-- can only ever read/write programmes for patients they actually manage.
--
-- Design:
--   * programmes             — one programme per patient (header + settings)
--   * programme_days         — 7 rows per programme (Mon–Sun template)
--   * programme_day_exercises — ordered exercises + dosage per day
--   * programme_sessions     — one row per actual calendar date (snapshot)
--
-- A programme_session carries a JSON snapshot of the prescription at the time
-- the session was generated, so later edits to the weekly template never
-- silently rewrite historical or already-delivered sessions.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Programmes (treatment-programme header)
-- ---------------------------------------------------------------------------
create table if not exists public.programmes (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid not null references public.patients(id) on delete cascade,
  physio_id             uuid references public.profiles(id) on delete set null,
  clinic_id             uuid references public.clinics(id) on delete set null,
  name                  text not null,
  indication            text,
  start_date            date,
  end_date              date,
  reminder_time         time,
  language              text not null default 'en'
                        constraint programmes_language_check check (language in ('en', 'sw')),
  timezone              text not null default 'Africa/Dar_es_Salaam',
  status                text not null default 'draft'
                        constraint programmes_status_check
                        check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  clinical_instructions text,
  precautions           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint programmes_dates_check check (end_date >= start_date)
);

create index if not exists programmes_patient_idx on public.programmes (patient_id);
create index if not exists programmes_status_idx on public.programmes (status);

alter table public.programmes enable row level security;

drop policy if exists "programmes_select" on public.programmes;
create policy "programmes_select" on public.programmes
  for select using (public.can_access_patient(patient_id));

drop policy if exists "programmes_insert" on public.programmes;
create policy "programmes_insert" on public.programmes
  for insert with check (public.can_access_patient(patient_id));

drop policy if exists "programmes_update" on public.programmes;
create policy "programmes_update" on public.programmes
  for update using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists "programmes_delete" on public.programmes;
create policy "programmes_delete" on public.programmes
  for delete using (public.can_access_patient(patient_id));

-- ---------------------------------------------------------------------------
-- 2. Programme days (Mon–Sun template). weekday uses JS getDay() / Postgres
--    extract(dow) convention: 0 = Sunday ... 6 = Saturday.
-- ---------------------------------------------------------------------------
create table if not exists public.programme_days (
  id                   uuid primary key default gen_random_uuid(),
  programme_id         uuid not null references public.programmes(id) on delete cascade,
  weekday              smallint not null check (weekday between 0 and 6),
  is_rest_day          boolean not null default false,
  reminder_enabled     boolean not null default true,
  general_instructions text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint programme_days_programme_weekday_key unique (programme_id, weekday)
);

create index if not exists programme_days_programme_idx on public.programme_days (programme_id);

alter table public.programme_days enable row level security;

drop policy if exists "programme_days_select" on public.programme_days;
create policy "programme_days_select" on public.programme_days
  for select using (
    exists (select 1 from public.programmes p where p.id = programme_id and public.can_access_patient(p.patient_id))
  );

drop policy if exists "programme_days_insert" on public.programme_days;
create policy "programme_days_insert" on public.programme_days
  for insert with check (
    exists (select 1 from public.programmes p where p.id = programme_id and public.can_access_patient(p.patient_id))
  );

drop policy if exists "programme_days_update" on public.programme_days;
create policy "programme_days_update" on public.programme_days
  for update using (
    exists (select 1 from public.programmes p where p.id = programme_id and public.can_access_patient(p.patient_id))
  ) with check (
    exists (select 1 from public.programmes p where p.id = programme_id and public.can_access_patient(p.patient_id))
  );

drop policy if exists "programme_days_delete" on public.programme_days;
create policy "programme_days_delete" on public.programme_days
  for delete using (
    exists (select 1 from public.programmes p where p.id = programme_id and public.can_access_patient(p.patient_id))
  );

-- ---------------------------------------------------------------------------
-- 3. Programme day exercises (ordered, with per-exercise dosage).
-- ---------------------------------------------------------------------------
create table if not exists public.programme_day_exercises (
  id                uuid primary key default gen_random_uuid(),
  programme_day_id  uuid not null references public.programme_days(id) on delete cascade,
  exercise_id       uuid references public.exercises(id) on delete set null,
  order_index       integer not null default 0,
  sets              integer check (sets is null or sets >= 0),
  reps              integer check (reps is null or reps >= 0),
  hold_seconds      integer check (hold_seconds is null or hold_seconds >= 0),
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  rest_seconds      integer check (rest_seconds is null or rest_seconds >= 0),
  instructions      text,
  video_url         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists programme_day_exercises_day_idx on public.programme_day_exercises (programme_day_id);

alter table public.programme_day_exercises enable row level security;

drop policy if exists "programme_day_exercises_select" on public.programme_day_exercises;
create policy "programme_day_exercises_select" on public.programme_day_exercises
  for select using (
    exists (
      select 1 from public.programme_days d
      join public.programmes p on p.id = d.programme_id
      where d.id = programme_day_id and public.can_access_patient(p.patient_id)
    )
  );

drop policy if exists "programme_day_exercises_insert" on public.programme_day_exercises;
create policy "programme_day_exercises_insert" on public.programme_day_exercises
  for insert with check (
    exists (
      select 1 from public.programme_days d
      join public.programmes p on p.id = d.programme_id
      where d.id = programme_day_id and public.can_access_patient(p.patient_id)
    )
  );

drop policy if exists "programme_day_exercises_update" on public.programme_day_exercises;
create policy "programme_day_exercises_update" on public.programme_day_exercises
  for update using (
    exists (
      select 1 from public.programme_days d
      join public.programmes p on p.id = d.programme_id
      where d.id = programme_day_id and public.can_access_patient(p.patient_id)
    )
  ) with check (
    exists (
      select 1 from public.programme_days d
      join public.programmes p on p.id = d.programme_id
      where d.id = programme_day_id and public.can_access_patient(p.patient_id)
    )
  );

drop policy if exists "programme_day_exercises_delete" on public.programme_day_exercises;
create policy "programme_day_exercises_delete" on public.programme_day_exercises
  for delete using (
    exists (
      select 1 from public.programme_days d
      join public.programmes p on p.id = d.programme_id
      where d.id = programme_day_id and public.can_access_patient(p.patient_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Programme sessions (one per calendar date). Snapshot preserves the
--    prescription as it stood when the session was generated.
-- ---------------------------------------------------------------------------
create table if not exists public.programme_sessions (
  id                           uuid primary key default gen_random_uuid(),
  programme_id                 uuid not null references public.programmes(id) on delete cascade,
  patient_id                   uuid not null references public.patients(id) on delete cascade,
  session_date                 date not null,
  weekday                      smallint not null check (weekday between 0 and 6),
  is_rest_day                  boolean not null default false,
  reminder_enabled             boolean not null default true,
  reminder_time                time,
  status                       text not null default 'scheduled'
                               constraint programme_sessions_status_check
                               check (status in ('scheduled', 'completed', 'skipped', 'cancelled')),
  reminder_status              text not null default 'pending'
                               constraint programme_sessions_reminder_status_check
                               check (reminder_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  reminder_sent_at             timestamptz,
  reminder_provider_message_id text,
  reminder_attempts            integer not null default 0,
  reminder_sending_at          timestamptz,
  reminder_failure_reason      text,
  completed_at                 timestamptz,
  snapshot                     jsonb not null default '{}'::jsonb,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint programme_sessions_programme_date_key unique (programme_id, session_date)
);

create index if not exists programme_sessions_programme_idx on public.programme_sessions (programme_id);
create index if not exists programme_sessions_patient_date_idx on public.programme_sessions (patient_id, session_date);
create index if not exists programme_sessions_date_idx on public.programme_sessions (session_date);

alter table public.programme_sessions enable row level security;

drop policy if exists "programme_sessions_select" on public.programme_sessions;
create policy "programme_sessions_select" on public.programme_sessions
  for select using (public.can_access_patient(patient_id));

drop policy if exists "programme_sessions_insert" on public.programme_sessions;
create policy "programme_sessions_insert" on public.programme_sessions
  for insert with check (public.can_access_patient(patient_id));

drop policy if exists "programme_sessions_update" on public.programme_sessions;
create policy "programme_sessions_update" on public.programme_sessions
  for update using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists "programme_sessions_delete" on public.programme_sessions;
create policy "programme_sessions_delete" on public.programme_sessions
  for delete using (public.can_access_patient(patient_id));

-- ---------------------------------------------------------------------------
-- 5. Optional session linkage on the existing adherence / pain tables so a
--    completion or pain score can be tied to the precise dated session.
-- ---------------------------------------------------------------------------
alter table public.pain_logs
  add column if not exists session_id uuid references public.programme_sessions(id) on delete set null;

alter table public.adherence_logs
  add column if not exists session_id uuid references public.programme_sessions(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 6. Updated-at triggers (reuse the existing touch_updated_at helper)
-- ---------------------------------------------------------------------------
drop trigger if exists programmes_touch_updated_at on public.programmes;
create trigger programmes_touch_updated_at before update on public.programmes
  for each row execute function public.touch_updated_at();

drop trigger if exists programme_days_touch_updated_at on public.programme_days;
create trigger programme_days_touch_updated_at before update on public.programme_days
  for each row execute function public.touch_updated_at();

drop trigger if exists programme_day_exercises_touch_updated_at on public.programme_day_exercises;
create trigger programme_day_exercises_touch_updated_at before update on public.programme_day_exercises
  for each row execute function public.touch_updated_at();

drop trigger if exists programme_sessions_touch_updated_at on public.programme_sessions;
create trigger programme_sessions_touch_updated_at before update on public.programme_sessions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Validation RPC — returns {"errors": [...], "warnings": [...]}.
--    Reused by the frontend "Validate" action and by publish_programme.
-- ---------------------------------------------------------------------------
create or replace function public.validate_programme(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog record;
  v_errors   jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_day      record;
  v_ex       record;
  v_ex_count int;
  v_distinct_count int;
  v_has_dosage boolean;
begin
  select * into v_prog from public.programmes where id = p_id;
  if v_prog.id is null then
    return jsonb_build_object(
      'errors', jsonb_build_array(jsonb_build_object('code', 'not_found', 'message', 'Programme not found')),
      'warnings', '[]'::jsonb
    );
  end if;

  if not public.can_access_patient(v_prog.patient_id) then
    return jsonb_build_object(
      'errors', jsonb_build_array(jsonb_build_object('code', 'unauthorized', 'message', 'You are not authorized to manage this patient')),
      'warnings', '[]'::jsonb
    );
  end if;

  if v_prog.name is null or btrim(v_prog.name) = '' then
    v_errors := v_errors || jsonb_build_object('code', 'missing_name', 'message', 'Programme name is required');
  end if;

  if v_prog.start_date is null or v_prog.end_date is null then
    v_errors := v_errors || jsonb_build_object('code', 'missing_dates', 'message', 'Start and end dates are required');
  elsif v_prog.end_date < v_prog.start_date then
    v_errors := v_errors || jsonb_build_object('code', 'invalid_dates', 'message', 'End date must be on or after the start date');
  end if;

  if v_prog.reminder_time is null then
    v_errors := v_errors || jsonb_build_object('code', 'missing_reminder_time', 'message', 'Daily reminder time is required');
  end if;

  for v_day in
    select * from public.programme_days where programme_id = p_id order by weekday
  loop
    select count(*) into v_ex_count from public.programme_day_exercises where programme_day_id = v_day.id;

    if v_day.is_rest_day then
      if v_ex_count > 0 then
        v_errors := v_errors || jsonb_build_object('code', 'rest_day_has_exercises', 'message', 'Rest day contains prescribed exercises', 'weekday', v_day.weekday);
      end if;
      if v_day.reminder_enabled then
        v_errors := v_errors || jsonb_build_object('code', 'rest_day_reminder', 'message', 'Rest day is configured to send reminders', 'weekday', v_day.weekday);
      end if;
    else
      if v_ex_count = 0 then
        v_errors := v_errors || jsonb_build_object('code', 'empty_exercise_day', 'message', 'Exercise day has no prescribed exercises', 'weekday', v_day.weekday);
      else
        select count(*) into v_distinct_count
        from (select distinct exercise_id from public.programme_day_exercises where programme_day_id = v_day.id) t;
        if v_distinct_count < v_ex_count then
          v_warnings := v_warnings || jsonb_build_object('code', 'repeated_exercise', 'message', 'An exercise is intentionally repeated on this day', 'weekday', v_day.weekday);
        end if;

        for v_ex in
          select pde.*, e.video_url as lib_video_url, e.name_en
          from public.programme_day_exercises pde
          left join public.exercises e on e.id = pde.exercise_id
          where pde.programme_day_id = v_day.id
          order by pde.order_index, pde.created_at
        loop
          v_has_dosage := coalesce(v_ex.sets is not null or v_ex.reps is not null
                                   or v_ex.hold_seconds is not null or v_ex.duration_seconds is not null, false);
          if not v_has_dosage then
            v_errors := v_errors || jsonb_build_object(
              'code', 'missing_dosage', 'message', 'Exercise is missing dosage parameters',
              'weekday', v_day.weekday, 'exercise_id', v_ex.exercise_id, 'exercise_name', coalesce(v_ex.name_en, '')
            );
          end if;

          if coalesce(v_ex.video_url, v_ex.lib_video_url) is null then
            v_warnings := v_warnings || jsonb_build_object(
              'code', 'missing_video', 'message', 'Exercise has no demonstration video',
              'weekday', v_day.weekday, 'exercise_id', v_ex.exercise_id, 'exercise_name', coalesce(v_ex.name_en, '')
            );
          end if;
        end loop;
      end if;
    end if;
  end loop;

  return jsonb_build_object('errors', v_errors, 'warnings', v_warnings);
end;
$$;

revoke execute on function public.validate_programme(uuid) from public, anon;
grant execute on function public.validate_programme(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Publish RPC — validates, then atomically generates the dated sessions and
--    activates the programme. A partially published programme cannot be left
--    behind: the whole body runs in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.publish_programme(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog      record;
  v_validation jsonb;
  v_errors    jsonb;
  v_today     date;
  v_has_sessions boolean;
  v_start     date;
  v_d         date;
  v_weekday   smallint;
  v_day       record;
  v_snapshot  jsonb;
  v_created   int := 0;
begin
  select * into v_prog from public.programmes where id = p_id;
  if v_prog.id is null then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'not_found', 'message', 'Programme not found')));
  end if;

  if not public.can_access_patient(v_prog.patient_id) then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'unauthorized', 'message', 'You are not authorized to manage this patient')));
  end if;

  v_validation := public.validate_programme(p_id);
  v_errors := v_validation -> 'errors';
  if jsonb_array_length(v_errors) > 0 then
    return jsonb_build_object('ok', false, 'errors', v_errors);
  end if;

  v_today := (now() at time zone v_prog.timezone)::date;
  select exists (select 1 from public.programme_sessions where programme_id = p_id) into v_has_sessions;

  if v_has_sessions then
    -- Re-publish of an active/edited programme: apply the new prescription only
    -- to eligible future sessions. Today's session and every historical or
    -- completed session are preserved untouched. Only not-yet-sent future
    -- sessions are dropped and regenerated, so no duplicate or conflicting
    -- reminders can be produced.
    delete from public.programme_sessions
    where programme_id = p_id
      and session_date > v_today
      and status = 'scheduled'
      and reminder_status in ('pending', 'failed');

    v_start := greatest(v_prog.start_date, v_today + 1);
  else
    -- First publish: generate from the programme start date (so a programme
    -- beginning mid-week uses that weekday's configuration first).
    v_start := v_prog.start_date;
  end if;

  v_d := v_start;
  while v_d <= v_prog.end_date loop
    v_weekday := extract(dow from v_d)::smallint;

    select * into v_day from public.programme_days where programme_id = p_id and weekday = v_weekday;

    if v_day.id is not null then
      v_snapshot := jsonb_build_object(
        'is_rest_day', v_day.is_rest_day,
        'reminder_enabled', v_day.reminder_enabled,
        'general_instructions', v_day.general_instructions,
        'exercises', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'exercise_id', pde.exercise_id,
              'name_en', e.name_en,
              'name_sw', e.name_sw,
              'video_url', coalesce(pde.video_url, e.video_url),
              'sets', pde.sets,
              'reps', pde.reps,
              'hold_seconds', pde.hold_seconds,
              'duration_seconds', pde.duration_seconds,
              'rest_seconds', pde.rest_seconds,
              'instructions', pde.instructions,
              'order_index', pde.order_index
            ) order by pde.order_index, pde.created_at
          )
          from public.programme_day_exercises pde
          left join public.exercises e on e.id = pde.exercise_id
          where pde.programme_day_id = v_day.id
        ), '[]'::jsonb)
      );

      insert into public.programme_sessions (
        programme_id, patient_id, session_date, weekday, is_rest_day,
        reminder_enabled, reminder_time, status, reminder_status, snapshot
      ) values (
        p_id, v_prog.patient_id, v_d, v_weekday, v_day.is_rest_day,
        v_day.reminder_enabled, v_prog.reminder_time, 'scheduled',
        case when v_day.is_rest_day then 'skipped' else 'pending' end,
        v_snapshot
      )
      on conflict (programme_id, session_date) do nothing;

      v_created := v_created + 1;
    end if;

    v_d := v_d + 1;
  end loop;

  update public.programmes set status = 'active', updated_at = now() where id = p_id;

  return jsonb_build_object('ok', true, 'programme_id', p_id, 'sessions_created', v_created);
end;
$$;

revoke execute on function public.publish_programme(uuid) from public, anon;
grant execute on function public.publish_programme(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. Status transition helper — physios can pause/complete/archive their own
--    programmes (not create/delete sessions directly).
-- ---------------------------------------------------------------------------
create or replace function public.set_programme_status(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog record;
begin
  select * into v_prog from public.programmes where id = p_id;
  if v_prog.id is null then
    return jsonb_build_object('ok', false, 'error', 'Programme not found');
  end if;
  if not public.can_access_patient(v_prog.patient_id) then
    return jsonb_build_object('ok', false, 'error', 'You are not authorized to manage this patient');
  end if;
  if p_status not in ('draft', 'active', 'paused', 'completed', 'archived') then
    return jsonb_build_object('ok', false, 'error', 'Invalid status');
  end if;

  update public.programmes set status = p_status, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'programme_id', p_id, 'status', p_status);
end;
$$;

revoke execute on function public.set_programme_status(uuid, text) from public, anon;
grant execute on function public.set_programme_status(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.programmes,
  public.programme_days,
  public.programme_day_exercises,
  public.programme_sessions
to authenticated;

commit;
