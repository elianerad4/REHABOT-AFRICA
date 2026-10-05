-- Fix: non-admin physiotherapists could see the reminder-time / status
-- controls but their changes were silently rejected, because the base
-- `patients` schema (created manually, before migrations were tracked) granted
-- physios SELECT/INSERT only — UPDATE was effectively admin-only.
--
-- This adds an explicit, idempotent UPDATE policy so any physiotherapist can
-- edit their OWN patients (reminder time, status, etc.), matching the INSERT
-- and SELECT behaviour they already have. Admins are unaffected (they already
-- update via is_admin()-gated access).

drop policy if exists "physio_own_patients_update" on public.patients;

create policy "physio_own_patients_update" on public.patients
  for update
  using (physio_id = auth.uid())
  with check (physio_id = auth.uid());
