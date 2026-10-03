# Competition Demo Script (~3 minutes)

Fictional patient: **Asha M.** — Low back pain.

Programme: Pelvic tilts · Bridging · Knee-to-chest.

## 1. Assign the programme (30s)

- Open Rehabot → Add Patient → create "Asha M.", WhatsApp number (test number),
  language English, reminder time, diagnosis "Low back pain".
- Open her page → Exercises tab → Back Pain → assign Pelvic tilts, Bridging,
  Knee-to-chest with sets/reps.

## 2. Reminder fires (30s)

- Explain the hourly cron (`send-daily-reminders`).
- Show the WhatsApp reminder going out (template with the three exercises).

## 3. Fallback (40s)

- Show what happens when WhatsApp delivery fails: the **same** reminder is sent
  via **Textify SMS** (Continuity Engine), logged under channel = `sms`.

## 4. No-response nudge (20s)

- Explain `FALLBACK_AFTER_MINUTES`: after 2h with no reply, one SMS nudge is sent.

## 5. Patient replies with pain score (30s)

- Asha replies by SMS with `4`.
- Rehabot validates `4` (0–10), stores it in `pain_logs`, thanks her, and marks the
  pending request as responded.

## 6. Dashboard updates (30s)

- Dashboard → Continuity Engine shows: WhatsApp reminder (delivered), SMS fallback,
  patient response, pain score 4/10 — one unified timeline.
- Reports show the pain trend and adherence.

## Narrative for the judge

"Physiotherapy doesn't end when the patient leaves the clinic. Rehabot keeps the
conversation going on WhatsApp, and Textify SMS makes sure a patient is never
dropped — whether WhatsApp fails or the patient simply hasn't responded. Every
touchpoint lands in one continuity timeline the physio can act on."
