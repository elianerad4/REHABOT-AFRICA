-- Remove the stroke rehabilitation module.
--
-- rehabilitation_programmes / programme_exercises / exercise_completion_logs
-- / clinician_flags were never adopted in production (0 rows in all four as
-- of this migration). The app is reverting to the simpler patient_exercises
-- assignment model with plain English/Swahili WhatsApp reminders only.
--
-- Real data lost by this migration (confirmed before running):
--   - 8 seeded rows in `conditions`
--   - clinical metadata (condition/category/goal/etc.) on 10 of 25 exercises
--     — all 10 are unused demo rows with no video_url, never assigned to a
--     real patient
--   - condition_id/affected_side/stroke_type set on 3 real patients

begin;

drop table if exists public.programme_exercises cascade;
drop table if exists public.exercise_completion_logs cascade;
drop table if exists public.rehabilitation_programmes cascade;
drop table if exists public.clinician_flags cascade;
drop table if exists public.conditions cascade;

drop function if exists public.can_manage_patient(uuid);

alter table public.exercises
  drop column if exists condition_id,
  drop column if exists category,
  drop column if exists goal,
  drop column if exists body_region,
  drop column if exists position,
  drop column if exists equipment,
  drop column if exists difficulty,
  drop column if exists instructions,
  drop column if exists default_sets,
  drop column if exists default_repetitions,
  drop column if exists default_duration_seconds,
  drop column if exists precautions,
  drop column if exists contraindications,
  drop column if exists progression,
  drop column if exists regression,
  drop column if exists laterality;

alter table public.patients
  drop column if exists condition_id,
  drop column if exists affected_side,
  drop column if exists stroke_type,
  drop column if exists rehab_phase,
  drop column if exists mobility_level,
  drop column if exists assistance_level;

-- Narrow message_logs back down: video_request/exercise_video are still used
-- by the plain patient_exercises video flow; difficulty_prompt/
-- difficulty_rating/safety_flag/programme_reminder were stroke-module only.
alter table public.message_logs drop constraint if exists message_logs_message_type_check;
alter table public.message_logs add constraint message_logs_message_type_check
  check (message_type = ANY (ARRAY[
    'reminder'::text,
    'pain_check'::text,
    'ai_response'::text,
    'exercise_link'::text,
    'report'::text,
    'other'::text,
    'video_request'::text,
    'exercise_video'::text
  ]));

commit;
