-- Fix: message_logs.message_type check constraint predates the stroke
-- rehabilitation module and silently rejected every insert for the newer
-- message types the code actually writes (video_request, exercise_video,
-- difficulty_prompt, difficulty_rating, safety_flag). Because handle-inbound
-- inserts these with a bare `await ... .insert(...)` and never checks the
-- returned error, every one of these inserts has been failing silently —
-- there is no record in message_logs of any video ever being requested or
-- sent, even when the WhatsApp send itself succeeded or failed.
--
-- This widens the allowed set to match what the application code writes.
begin;

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
    'exercise_video'::text,
    'difficulty_prompt'::text,
    'difficulty_rating'::text,
    'safety_flag'::text,
    'programme_reminder'::text
  ]));

commit;
