-- Add a "Diabetic Foot" category to the exercise library so diabetic foot
-- exercises can be added and their demonstration videos attached.
--
-- This only adds an organizational category (empty, no exercises attached).
-- It reuses the exact same shape as the categories seeded in
-- `20260920130000_exercise_categories.sql` — the library UI and the admin
-- "Exercise Categories" tab are fully data-driven, so no code change is
-- required for the section to appear. Exercises are added afterwards through
-- the Exercise Library ("New Exercise" -> tick "Diabetic Foot"), which is
-- where their video URLs get attached.

-- Place "Diabetic Foot" immediately after "Ankle & Foot" (display_order 6),
-- nudging the categories that follow down by one so the browse order stays
-- stable and deterministic.
update public.exercise_categories
set display_order = display_order + 1
where display_order >= 7;

insert into public.exercise_categories (name, slug, description, body_region, icon, display_order)
values (
  'Diabetic Foot',
  'diabetic-foot',
  'Exercises used within physiotherapy rehabilitation programs for patients with diabetic foot presentations, including foot mobility, circulation, and protective foot care.',
  'Foot',
  'footprints',
  7
)
on conflict (slug) do nothing;
