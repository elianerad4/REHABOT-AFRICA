// Shared helpers for weekly programmes (frontend).
// Weekday convention matches JS Date#getDay() and Postgres extract(dow):
// 0 = Sunday, 1 = Monday, ... 6 = Saturday.

export const WEEKDAY_LABELS = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
}

export const WEEKDAY_SHORT = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat'
}

// Display order: Monday-first, Sunday-last.
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function emptyDay(weekday) {
  return {
    weekday,
    is_rest_day: false,
    reminder_enabled: true,
    general_instructions: '',
    exercises: []
  }
}

// A full 7-day array indexed by weekday (arr[weekday] === day).
export function emptyDays() {
  const arr = []
  for (let w = 0; w < 7; w++) arr.push(emptyDay(w))
  return arr
}

export function describeDosage(ex) {
  const parts = []
  if (ex.sets != null && ex.reps != null) parts.push(`${ex.sets} sets × ${ex.reps} reps`)
  else if (ex.sets != null) parts.push(`${ex.sets} sets`)
  else if (ex.reps != null) parts.push(`${ex.reps} reps`)

  if (ex.hold_seconds != null && ex.hold_seconds > 0) parts.push(`hold ${ex.hold_seconds}s`)
  if (ex.duration_seconds != null && ex.duration_seconds > 0) parts.push(`${ex.duration_seconds}s`)
  if (ex.rest_seconds != null && ex.rest_seconds > 0) parts.push(`rest ${ex.rest_seconds}s`)

  return parts.join(', ')
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Yields every calendar date (ISO "YYYY-MM-DD") from start to end inclusive.
export function sessionDates(startDate, endDate) {
  const out = []
  if (!startDate || !endDate) return out
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().split('T')[0])
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

export function weekdayOf(dateIso) {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay()
}

// ---------------------------------------------------------------------------
// Validation. Mirrors the server-side validate_programme RPC and the shared
// _shared/programme.ts so the rules stay consistent across client/server.
// ---------------------------------------------------------------------------
export function validateProgramme(programme, days) {
  const errors = []
  const warnings = []

  if (!programme.patient_id) {
    errors.push({ code: 'missing_patient', message: 'A patient is required' })
  }
  if (!programme.name || !programme.name.trim()) {
    errors.push({ code: 'missing_name', message: 'Programme name is required' })
  }
  if (!programme.start_date || !programme.end_date) {
    errors.push({ code: 'missing_dates', message: 'Start and end dates are required' })
  } else if (programme.end_date < programme.start_date) {
    errors.push({ code: 'invalid_dates', message: 'End date must be on or after the start date' })
  }
  if (!programme.reminder_time) {
    errors.push({ code: 'missing_reminder_time', message: 'Daily reminder time is required' })
  }

  for (const day of days) {
    const exercises = day.exercises ?? []
    if (day.is_rest_day) {
      if (exercises.length > 0) {
        errors.push({ code: 'rest_day_has_exercises', message: 'Rest day contains prescribed exercises', weekday: day.weekday })
      }
      if (day.reminder_enabled) {
        errors.push({ code: 'rest_day_reminder', message: 'Rest day is configured to send reminders', weekday: day.weekday })
      }
    } else {
      if (exercises.length === 0) {
        errors.push({ code: 'empty_exercise_day', message: 'Exercise day has no prescribed exercises', weekday: day.weekday })
      } else {
        const ids = exercises.map((e) => e.exercise_id).filter(Boolean)
        if (new Set(ids).size < exercises.length) {
          warnings.push({ code: 'repeated_exercise', message: 'An exercise is repeated on this day', weekday: day.weekday })
        }
        for (const ex of exercises) {
          const hasDosage =
            ex.sets != null || ex.reps != null || ex.hold_seconds != null || ex.duration_seconds != null
          if (!hasDosage) {
            errors.push({ code: 'missing_dosage', message: 'Exercise is missing dosage parameters', weekday: day.weekday, exercise_id: ex.exercise_id })
          }
          if (!ex.video_url) {
            warnings.push({ code: 'missing_video', message: 'Exercise has no demonstration video', weekday: day.weekday, exercise_id: ex.exercise_id })
          }
        }
      }
    }
  }

  return { errors, warnings }
}

export const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived'
}

export const STATUS_VARIANTS = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  completed: 'info',
  archived: 'neutral'
}
