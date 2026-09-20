-- Condition-based exercise library restructuring.
--
-- Adds a category taxonomy on top of the existing `exercises` table without
-- touching its primary key or any existing row. `patient_exercises` keeps
-- referencing `exercises(id)` exactly as before — no data migration of
-- assignments is needed or performed.
--
-- Architecture decision: exercise_categories + exercise_category_map
-- (many-to-many), not a single exercises.category_id column. The brief asks
-- for future support of one exercise belonging to multiple categories (e.g.
-- an exercise useful for both "Back Pain" and "General Mobility"); a join
-- table supports that from day one with no later migration, at negligible
-- extra cost over a single FK.
--
-- Existing rows: the 25 exercises already in the table are NOT assigned to
-- any category here — none of their names correspond confidently to the new
-- taxonomy (they're mostly general/stroke-era mobility exercises), and
-- guessing would be an invented clinical categorization. They will show up
-- as "Uncategorized" in the UI (computed as "no rows in
-- exercise_category_map", not a stored category) until a physio/admin
-- assigns them deliberately.

-- ---------------------------------------------------------------------------
-- 1) Category taxonomy (organizational only — see column comment on
--    exercise_category_map for the clinical-safety note).
create table if not exists public.exercise_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  body_region text,
  icon text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.exercise_categories is
  'Organizational taxonomy for browsing the exercise library (e.g. "Back Pain"). '
  'Purely for retrieval/organization — assigning an exercise to a category never '
  'implies a diagnosis or an automatic prescription. The physiotherapist remains '
  'responsible for assessment, exercise selection, dosage, and progression.';

alter table public.exercise_categories enable row level security;

-- Global, shared taxonomy — every signed-in user can browse categories,
-- same trust level as is_global exercises. Only admins manage the list
-- (matches the brief's "Admin -> Exercise Categories" placement).
create policy exercise_categories_select on public.exercise_categories
  for select
  using (auth.role() = 'authenticated');

create policy exercise_categories_admin_write on public.exercise_categories
  for insert
  with check (is_admin());

create policy exercise_categories_admin_update on public.exercise_categories
  for update
  using (is_admin())
  with check (is_admin());

-- No delete policy: categories are deactivated (is_active = false), never
-- hard-deleted, so an exercise that references one historically never
-- points at a vanished row.

-- ---------------------------------------------------------------------------
-- 2) Many-to-many exercise <-> category mapping.
create table if not exists public.exercise_category_map (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  category_id uuid not null references public.exercise_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, category_id)
);

alter table public.exercise_category_map enable row level security;

-- Readable by anyone who can read the underlying exercise (own or global —
-- mirrors the `physio_exercises` policy on `exercises` itself).
create policy exercise_category_map_select on public.exercise_category_map
  for select
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.physio_id = auth.uid() or e.is_global = true)
    )
  );

-- Writable by whoever can already edit the underlying exercise: its owner,
-- its creator, or an admin — the same set of people the existing
-- `exercises_admin_update` / `physio_own_exercises_write` policies trust.
create policy exercise_category_map_write on public.exercise_category_map
  for all
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (is_admin() or e.created_by = auth.uid() or e.physio_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (is_admin() or e.created_by = auth.uid() or e.physio_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Extend `exercises` with clinical/library fields the brief asks for.
-- Reusing the existing table rather than creating a parallel one — it
-- already has name_en/name_sw, description_en/sw, video_url,
-- duration_minutes, is_global, is_active, physio_id, created_by. Only what's
-- actually missing is added, all nullable so every existing row stays valid.
alter table public.exercises
  add column if not exists instructions text,
  add column if not exists difficulty text,
  add column if not exists equipment text,
  add column if not exists precautions text,
  add column if not exists contraindications text,
  add column if not exists clinical_notes text,
  add column if not exists thumbnail_url text,
  -- Template/default dosage for the library card — NOT a prescription.
  -- patient_exercises already holds the actual per-patient sets/reps/
  -- frequency_per_week, and stays completely independent of these.
  add column if not exists default_sets integer,
  add column if not exists default_reps integer,
  add column if not exists default_frequency_per_week integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'exercises_difficulty_check'
  ) then
    alter table public.exercises
      add constraint exercises_difficulty_check
      check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Seed the full category list from the brief (organizational labels
-- only — no exercises are attached here). Back Pain is the only category
-- meant to receive real exercises right now; the rest start at zero and
-- are ready for exercises whenever they're added, with no schema change.
insert into public.exercise_categories (name, slug, description, body_region, icon, display_order)
values
  ('Back Pain', 'back-pain', 'Exercises used within physiotherapy rehabilitation programs for patients with back-related musculoskeletal presentations.', 'Spine', 'bone', 1),
  ('Neck Pain', 'neck-pain', 'Exercises used within physiotherapy rehabilitation programs for patients with neck-related musculoskeletal presentations.', 'Cervical spine', 'person-standing', 2),
  ('Shoulder Pain', 'shoulder-pain', 'Exercises used within physiotherapy rehabilitation programs for patients with shoulder-related musculoskeletal presentations.', 'Shoulder', 'dumbbell', 3),
  ('Knee Pain', 'knee-pain', 'Exercises used within physiotherapy rehabilitation programs for patients with knee-related musculoskeletal presentations.', 'Knee', 'footprints', 4),
  ('Hip Pain', 'hip-pain', 'Exercises used within physiotherapy rehabilitation programs for patients with hip-related musculoskeletal presentations.', 'Hip', 'activity', 5),
  ('Ankle & Foot', 'ankle-foot', 'Exercises used within physiotherapy rehabilitation programs for patients with ankle- or foot-related musculoskeletal presentations.', 'Ankle & foot', 'footprints', 6),
  ('Stroke Rehabilitation', 'stroke-rehabilitation', 'Exercises used within physiotherapy rehabilitation programs for stroke recovery.', 'Neurological', 'brain', 7),
  ('Neurological Rehabilitation', 'neurological-rehabilitation', 'Exercises used within physiotherapy rehabilitation programs for other neurological presentations.', 'Neurological', 'brain', 8),
  ('Post-operative Rehabilitation', 'post-operative-rehabilitation', 'Exercises used within physiotherapy rehabilitation programs following surgery.', 'Varies', 'stethoscope', 9),
  ('Sports Rehabilitation', 'sports-rehabilitation', 'Exercises used within physiotherapy rehabilitation programs for sports-related injuries.', 'Varies', 'zap', 10),
  ('General Mobility', 'general-mobility', 'General mobility, strength, and conditioning exercises not specific to a single condition.', 'Whole body', 'person-standing', 11),
  ('Other', 'other', 'Exercises that do not fit an existing category yet.', null, 'more-horizontal', 12)
on conflict (slug) do nothing;
