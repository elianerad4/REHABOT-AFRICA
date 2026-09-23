-- Restrict exercise-library management to admins only.
--
-- Physios may still browse the shared library and assign its exercises to
-- patients (SELECT policies are unchanged), but creating, editing, or
-- deactivating exercises — and assigning/removing their categories — is now
-- an admin-only operation. The app UI already hides these controls from
-- non-admins (ExerciseLibrary + the PatientDetail "New Exercise" flow); this
-- migration closes the gap at the database level so a physio can't bypass the
-- UI and write directly through PostgREST.

-- ---------------------------------------------------------------------------
-- 1) exercises: only admins may INSERT or UPDATE.
-- The stroke-era policies also trusted `auth.uid() = created_by`, which let
-- any authenticated physio insert rows (and PatientDetail relied on it). Drop
-- the legacy write policies — including the physio-owner policy from the base
-- schema — and replace them with admin-only ones.
drop policy if exists "exercises_admin_insert" on public.exercises;
drop policy if exists "exercises_admin_update" on public.exercises;
drop policy if exists "physio_own_exercises_write" on public.exercises;

create policy "exercises_admin_insert" on public.exercises
  for insert
  with check (public.is_admin());

create policy "exercises_admin_update" on public.exercises
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2) exercise_category_map: category assignment becomes admin-only too.
-- Physios still read the mapping (exercise_category_map_select is untouched).
drop policy if exists "exercise_category_map_write" on public.exercise_category_map;

create policy "exercise_category_map_write" on public.exercise_category_map
  for all
  using (public.is_admin())
  with check (public.is_admin());
