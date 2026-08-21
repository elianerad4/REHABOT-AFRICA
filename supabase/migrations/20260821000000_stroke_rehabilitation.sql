-- Stroke Rehabilitation Module
-- Adds condition-aware exercise library, rehabilitation programmes,
-- programme exercises, exercise completion logs and clinician safety flags.
--
-- This migration is additive and safe:
--   * extends the existing `exercises` table (no duplicate exercise source of truth)
--   * adds optional clinical-profile columns to `patients`
--   * preserves all existing data, uses nullable/defaulted columns only
--   * applies RLS on all new tables using the existing clinic/admin model

begin;

-- ===========================================================================
-- 1. Conditions
-- ===========================================================================
create table if not exists public.conditions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists conditions_name_key on public.conditions (lower(name));

alter table public.conditions enable row level security;

drop policy if exists "conditions_select" on public.conditions;
create policy "conditions_select" on public.conditions
  for select using (true);

drop policy if exists "conditions_admin_insert" on public.conditions;
create policy "conditions_admin_insert" on public.conditions
  for insert with check (public.is_admin());

drop policy if exists "conditions_admin_update" on public.conditions;
create policy "conditions_admin_update" on public.conditions
  for update using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- 2. Extend existing exercises table into the condition-aware library
-- ===========================================================================
alter table public.exercises
  add column if not exists condition_id      uuid references public.conditions(id) on delete set null,
  add column if not exists is_active         boolean not null default true,
  add column if not exists category          text,
  add column if not exists goal              text,
  add column if not exists body_region       text,
  add column if not exists position          text,
  add column if not exists equipment         text,
  add column if not exists difficulty        text,
  add column if not exists instructions      text,
  add column if not exists default_sets      integer,
  add column if not exists default_repetitions integer,
  add column if not exists default_duration_seconds integer,
  add column if not exists precautions       text,
  add column if not exists contraindications text,
  add column if not exists progression       text,
  add column if not exists regression        text,
  add column if not exists laterality        text,
  add column if not exists created_by        uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at        timestamptz not null default now();

alter table public.exercises enable row level security;

create index if not exists exercises_condition_idx on public.exercises (condition_id);
create index if not exists exercises_active_idx on public.exercises (is_active);
create index if not exists exercises_category_idx on public.exercises (category);

drop policy if exists "exercises_select_authenticated" on public.exercises;
create policy "exercises_select_authenticated" on public.exercises
  for select using (auth.role() = 'authenticated');

drop policy if exists "exercises_admin_insert" on public.exercises;
create policy "exercises_admin_insert" on public.exercises
  for insert with check (public.is_admin() or auth.uid() = created_by);

drop policy if exists "exercises_admin_update" on public.exercises;
create policy "exercises_admin_update" on public.exercises
  for update using (public.is_admin() or auth.uid() = created_by)
  with check (public.is_admin() or auth.uid() = created_by);

-- ===========================================================================
-- 3. Patient clinical profile
-- ===========================================================================
alter table public.patients
  add column if not exists condition_id     uuid references public.conditions(id) on delete set null,
  add column if not exists affected_side    text,
  add column if not exists stroke_type      text,
  add column if not exists rehab_phase      text,
  add column if not exists mobility_level   text,
  add column if not exists assistance_level text;

-- ===========================================================================
-- 4. Helper for clinic-scoped access (must exist before the policies below)
-- ===========================================================================
create or replace function public.can_manage_patient(target_patient uuid)
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
        or (select pr2.is_admin from public.profiles pr2 where pr2.id = auth.uid())
      )
  )
$$;

grant execute on function public.can_manage_patient(uuid) to authenticated;
grant execute on function public.can_manage_patient(uuid) to anon;

-- ===========================================================================
-- 5. Rehabilitation programmes
-- ===========================================================================
create table if not exists public.rehabilitation_programmes (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients(id) on delete cascade,
  physio_id       uuid references public.profiles(id) on delete set null,
  clinic_id       uuid references public.clinics(id) on delete set null,
  condition_id    uuid references public.conditions(id) on delete set null,
  name            text not null,
  goal            text,
  start_date      date,
  end_date        date,
  status          text not null default 'draft',
  clinician_notes text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint rehabilitation_programmes_status_check
    check (status in ('draft', 'active', 'paused', 'completed', 'archived'))
);

create index if not exists rehabilitation_programmes_patient_idx
  on public.rehabilitation_programmes (patient_id);
create index if not exists rehabilitation_programmes_status_idx
  on public.rehabilitation_programmes (status);

alter table public.rehabilitation_programmes enable row level security;

drop policy if exists "programmes_select" on public.rehabilitation_programmes;
create policy "programmes_select" on public.rehabilitation_programmes
  for select using (public.can_manage_patient(patient_id));

drop policy if exists "programmes_insert" on public.rehabilitation_programmes;
create policy "programmes_insert" on public.rehabilitation_programmes
  for insert with check (public.can_manage_patient(patient_id));

drop policy if exists "programmes_update" on public.rehabilitation_programmes;
create policy "programmes_update" on public.rehabilitation_programmes
  for update using (public.can_manage_patient(patient_id))
  with check (public.can_manage_patient(patient_id));

drop policy if exists "programmes_delete" on public.rehabilitation_programmes;
create policy "programmes_delete" on public.rehabilitation_programmes
  for delete using (public.can_manage_patient(patient_id));

-- ===========================================================================
-- 5. Programme exercises
-- ===========================================================================
create table if not exists public.programme_exercises (
  id                uuid primary key default gen_random_uuid(),
  programme_id      uuid not null references public.rehabilitation_programmes(id) on delete cascade,
  exercise_id       uuid references public.exercises(id) on delete set null,
  sets              integer,
  repetitions       integer,
  duration_seconds  integer,
  frequency         text not null default 'daily',
  days_of_week      smallint[] not null default '{0,1,2,3,4,5,6}',
  laterality        text,
  instructions      text,
  clinician_notes   text,
  order_index       integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  constraint programme_exercises_frequency_check
    check (frequency in ('daily', 'weekly'))
);

create index if not exists programme_exercises_programme_idx
  on public.programme_exercises (programme_id);

alter table public.programme_exercises enable row level security;

drop policy if exists "programme_exercises_select" on public.programme_exercises;
create policy "programme_exercises_select" on public.programme_exercises
  for select using (
    programme_id in (select id from public.rehabilitation_programmes where public.can_manage_patient(patient_id))
  );

drop policy if exists "programme_exercises_insert" on public.programme_exercises;
create policy "programme_exercises_insert" on public.programme_exercises
  for insert with check (
    programme_id in (select id from public.rehabilitation_programmes where public.can_manage_patient(patient_id))
  );

drop policy if exists "programme_exercises_update" on public.programme_exercises;
create policy "programme_exercises_update" on public.programme_exercises
  for update using (
    programme_id in (select id from public.rehabilitation_programmes where public.can_manage_patient(patient_id))
  ) with check (
    programme_id in (select id from public.rehabilitation_programmes where public.can_manage_patient(patient_id))
  );

drop policy if exists "programme_exercises_delete" on public.programme_exercises;
create policy "programme_exercises_delete" on public.programme_exercises
  for delete using (
    programme_id in (select id from public.rehabilitation_programmes where public.can_manage_patient(patient_id))
  );

-- ===========================================================================
-- 6. Exercise completion logs (adherence / feedback)
-- ===========================================================================
create table if not exists public.exercise_completion_logs (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references public.patients(id) on delete cascade,
  programme_id           uuid references public.rehabilitation_programmes(id) on delete cascade,
  programme_exercise_id  uuid references public.programme_exercises(id) on delete cascade,
  log_date               date not null,
  status                 text not null default 'pending',
  completed_at           timestamptz,
  patient_response       text,
  difficulty_rating      integer check (difficulty_rating between 1 and 5),
  pain_score             integer check (pain_score between 1 and 10),
  notes                  text,
  created_at             timestamptz not null default now(),
  constraint exercise_completion_logs_status_check
    check (status in ('pending', 'completed', 'skipped', 'partial'))
);

create index if not exists exercise_completion_logs_patient_date_idx
  on public.exercise_completion_logs (patient_id, log_date);

alter table public.exercise_completion_logs enable row level security;

drop policy if exists "completion_logs_select" on public.exercise_completion_logs;
create policy "completion_logs_select" on public.exercise_completion_logs
  for select using (public.can_manage_patient(patient_id));

drop policy if exists "completion_logs_insert" on public.exercise_completion_logs;
create policy "completion_logs_insert" on public.exercise_completion_logs
  for insert with check (public.can_manage_patient(patient_id));

drop policy if exists "completion_logs_update" on public.exercise_completion_logs;
create policy "completion_logs_update" on public.exercise_completion_logs
  for update using (public.can_manage_patient(patient_id))
  with check (public.can_manage_patient(patient_id));

drop policy if exists "completion_logs_delete" on public.exercise_completion_logs;
create policy "completion_logs_delete" on public.exercise_completion_logs
  for delete using (public.can_manage_patient(patient_id));

-- ===========================================================================
-- 7. Clinician safety flags
-- ===========================================================================
create table if not exists public.clinician_flags (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  programme_id uuid references public.rehabilitation_programmes(id) on delete set null,
  flag_type    text not null,
  severity     text not null default 'review',
  details      text,
  status       text not null default 'open',
  source       text not null default 'system',
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint clinician_flags_severity_check check (severity in ('review', 'urgent')),
  constraint clinician_flags_status_check check (status in ('open', 'reviewed', 'resolved'))
);

create index if not exists clinician_flags_patient_status_idx
  on public.clinician_flags (patient_id, status);

alter table public.clinician_flags enable row level security;

drop policy if exists "clinician_flags_select" on public.clinician_flags;
create policy "clinician_flags_select" on public.clinician_flags
  for select using (public.can_manage_patient(patient_id));

drop policy if exists "clinician_flags_insert" on public.clinician_flags;
create policy "clinician_flags_insert" on public.clinician_flags
  for insert with check (public.can_manage_patient(patient_id));

drop policy if exists "clinician_flags_update" on public.clinician_flags;
create policy "clinician_flags_update" on public.clinician_flags
  for update using (public.can_manage_patient(patient_id))
  with check (public.can_manage_patient(patient_id));

drop policy if exists "clinician_flags_delete" on public.clinician_flags;
create policy "clinician_flags_delete" on public.clinician_flags
  for delete using (public.can_manage_patient(patient_id));

-- ===========================================================================
-- 8. Seed conditions
-- ===========================================================================
insert into public.conditions (name, description, is_active) values
  ('Stroke', 'Stroke rehabilitation: motor control, balance, transfers, gait, upper and lower limb function.', true),
  ('Low back pain', 'Spinal and core stability focused rehabilitation.', false),
  ('Knee osteoarthritis', 'Lower limb strengthening and gait re-education.', false),
  ('Cerebral palsy', 'Paediatric movement and functional training.', false),
  ('Spinal cord injury', 'Post-injury mobility and functional rehabilitation.', false),
  ('Post-operative rehabilitation', 'Protocol-based recovery after surgery.', false),
  ('Sports injuries', 'Sport-specific conditioning and return to play.', false),
  ('Other', 'General physiotherapy rehabilitation.', false)
on conflict (lower(name)) do nothing;

-- ===========================================================================
-- 10. Seed initial stroke exercise library (demo content for development)
-- ===========================================================================
-- NOTE: These records are development/demo content. The treating physiotherapist
-- must select exercises based on clinical assessment. No video URLs are set yet.
do $$
declare
  v_stroke uuid;
begin
  select id into v_stroke from public.conditions where name = 'Stroke' limit 1;

  insert into public.exercises (
    name_en, name_sw, description_en, is_global, video_url,
    condition_id, category, goal, body_region, position, equipment, difficulty,
    instructions, default_sets, default_repetitions, default_duration_seconds,
    precautions, contraindications, progression, regression, laterality
  ) values
  (
    'Sit-to-stand', 'Kukaa-kusimama',
    'Practice moving from sitting to standing with support. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Transfers', 'Improve transfers', 'Lower limb', 'Sitting on firm chair', 'None', 'moderate',
    'Sit tall at the front of a firm chair. Lean forward, push through both feet and stand. Lower slowly back down.',
    3, 8, null,
    'Use a stable chair. Guard against falls; supervise if balance is poor.', 'Severe postural hypotension; acute orthopaedic restrictions.',
    'Reduce hand support; progress to softer chair.', 'Use higher chair or arm support.', 'bilateral'
  ),
  (
    'Supported weight shifting', 'Kubadilisha uzito kwa msaada',
    'Shift body weight side to side while seated. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Balance', 'Improve sitting balance', 'Trunk', 'Sitting', 'None', 'easy',
    'Sit with feet flat. Lean weight onto one side, hold, then the other, keeping trunk upright.',
    3, null, 30,
    'Keep the affected foot supported. Stop if dizzy.', 'Uncontrolled movements; acute spinal pain.',
    'Increase hold duration; reach across midline.', 'Reduce movement range; provide arm support.', 'bilateral'
  ),
  (
    'Seated reaching', 'Kufikia ukiwa umekaa',
    'Reach forward and to each side from a seated position. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Motor control', 'Improve selective movement', 'Upper limb', 'Sitting', 'Cone or cup', 'easy',
    'From a stable sitting position, reach for an object forward, then to each side, returning to midline each time.',
    3, 10, null,
    'Do not lean past control limits. Maintain foot contact.', 'Severe shoulder subluxation; acute pain on reaching.',
    'Reach further or lower objects.', 'Place objects closer; support the arm.', 'bilateral'
  ),
  (
    'Supported standing', 'Kusimama kwa msaada',
    'Stand with support to practise standing tolerance and weight-bearing. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Balance', 'Improve standing balance', 'Lower limb', 'Standing', 'Parallel bars or stable surface', 'moderate',
    'Stand with both feet flat, holding a stable support. Practise upright posture and small weight shifts.',
    3, null, 30,
    'Only practise with supervision if balance is poor.', 'Severe dizziness; uncontrolled sway; acute hypotension.',
    'Release one hand; widen stance work.', 'Shorten time; use more support.', 'bilateral'
  ),
  (
    'Marching in place', 'Kuandamana mahali',
    'March on the spot with support. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Gait and mobility', 'Improve walking practice', 'Lower limb', 'Standing', 'None', 'moderate',
    'Stand tall with light hand support. Lift alternate knees in a marching rhythm.',
    2, 10, null,
    'Hold support. Stop if balance is lost.', 'Severe hip/knee pain; uncontrolled trunk lean.',
    'Add arm swing; higher knee lifts.', 'Smaller steps; hold support rails.', 'bilateral'
  ),
  (
    'Step tapping', 'Kugonga hatua',
    'Tap the foot forward onto a low step or mark. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Gait and mobility', 'Improve step training', 'Lower limb', 'Standing', 'Low step or tape mark', 'easy',
    'Stand behind a low step. Tap the affected foot onto the step, then return it to the floor. Alternate if able.',
    3, 10, null,
    'Use a low step (2-4 inches). Support near a rail.', 'Acute ankle instability; severe foot drop without support.',
    'Increase step height; add speed.', 'Use a flat target instead of a step.', 'unilateral'
  ),
  (
    'Ankle dorsiflexion', 'Kunyinua kifundo cha mguu',
    'Lift the front of the foot toward the shin. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Lower limb', 'Improve ankle movement', 'Ankle', 'Sitting or lying', 'Theraband (optional)', 'easy',
    'Sit with the leg extended or foot supported. Pull the toes up toward the shin, hold briefly, then relax.',
    3, 12, null,
    'Move within pain-free range.', 'Acute ankle fracture; severe spasticity with movement provocation.',
    'Add resistance band; increase hold.', 'Smaller range; seated only.', 'unilateral'
  ),
  (
    'Grasp and release', 'Kushika na kuachilia',
    'Practise opening and closing the hand on objects. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Upper limb', 'Improve grasp and release', 'Hand', 'Sitting', 'Soft ball or blocks', 'easy',
    'Sit at a table. Pick up an object, hold, then release it into a container. Repeat.',
    3, 10, null,
    'Avoid straining the wrist into painful end range.', 'Acute hand oedema; severe contracture.',
    'Smaller objects; faster transfers.', 'Larger, lighter objects; assist the wrist.', 'unilateral'
  ),
  (
    'Supported shoulder movement', 'Kusogeza bega kwa msaada',
    'Assisted shoulder flexion and abduction. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Upper limb', 'Improve shoulder movement', 'Shoulder', 'Sitting or lying', 'None', 'easy',
    'With the arm supported, raise it forward and to the side within pain-free range.',
    3, 10, null,
    'Never lift beyond pain-free range. Avoid excessive pull on the shoulder capsule.', 'Shoulder subluxation with pain; frozen shoulder acute phase.',
    'Increase range as control improves.', 'Smaller range; more table support.', 'unilateral'
  ),
  (
    'Functional reaching', 'Kufikia kazi halisi',
    'Reach for everyday objects placed at different heights and distances. [DEMO CONTENT]',
    true, null,
    v_stroke, 'Upper limb', 'Task-specific movement', 'Upper limb', 'Standing or sitting', 'Everyday objects', 'moderate',
    'Reach for and handle everyday objects placed at varied heights and distances as directed by your physiotherapist.',
    3, 8, null,
    'Practise with clinician-selected objects and distances only.', 'New shoulder pain during reaching.',
    'Higher/lower targets; combined reaching and stepping.', 'Closer targets; seated task.', 'bilateral'
  )
  on conflict do nothing;
end;
$$;

-- ===========================================================================
-- 11. Updated-at triggers for new tables
-- ===========================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conditions_touch_updated_at on public.conditions;
create trigger conditions_touch_updated_at before update on public.conditions
  for each row execute function public.touch_updated_at();

drop trigger if exists exercises_touch_updated_at on public.exercises;
create trigger exercises_touch_updated_at before update on public.exercises
  for each row execute function public.touch_updated_at();

drop trigger if exists programmes_touch_updated_at on public.rehabilitation_programmes;
create trigger programmes_touch_updated_at before update on public.rehabilitation_programmes
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- 12. Grants
-- ===========================================================================
grant select, insert, update, delete on
  public.conditions,
  public.rehabilitation_programmes,
  public.programme_exercises,
  public.exercise_completion_logs,
  public.clinician_flags
to authenticated;

grant select on public.exercises to authenticated;
grant insert, update on public.exercises to authenticated;

commit;
