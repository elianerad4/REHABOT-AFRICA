// Pure domain logic for weekly physiotherapy programmes.
// Kept free of Deno/network dependencies so it can be unit-tested in isolation
// and reused across send-daily-reminders and the programme tests.

// Weekday convention matches JS Date#getDay() and Postgres extract(dow):
// 0 = Sunday, 1 = Monday, ... 6 = Saturday.
export const WEEKDAY_NAMES_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const

export const WEEKDAY_NAMES_SW = [
  'Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'
] as const

export interface SessionExercise {
  exercise_id: string | null
  name_en?: string | null
  name_sw?: string | null
  video_url?: string | null
  sets?: number | null
  reps?: number | null
  hold_seconds?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  instructions?: string | null
  order_index?: number | null
}

export interface SessionSnapshot {
  is_rest_day?: boolean
  reminder_enabled?: boolean
  general_instructions?: string | null
  exercises?: SessionExercise[]
}

// "HH:MM:SS" or "HH:MM" -> minutes since midnight. Returns null when unparseable.
export function reminderTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function isReminderDue(reminderTime: string | null | undefined, currentMinutesOfDay: number): boolean {
  const mins = reminderTimeToMinutes(reminderTime)
  if (mins === null) return false
  return mins <= currentMinutesOfDay
}

// EAT (Africa/Dar_es_Salaam) is UTC+3 with no DST — the project's canonical
// timezone. Returns the local date as "YYYY-MM-DD".
export function eatToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export function eatHourMinute(now: Date = new Date()): { hour: number; minute: number; minutesOfDay: number } {
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const hour = eat.getUTCHours()
  const minute = eat.getUTCMinutes()
  return { hour, minute, minutesOfDay: hour * 60 + minute }
}

// Yields every calendar date (as "YYYY-MM-DD") from startDate to endDate,
// inclusive. Dates are compared as strings; inputs are expected in ISO format.
export function sessionDates(startDate: string, endDate: string): string[] {
  const out: string[] = []
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

// Weekday (0-6) for an ISO date string, using the JS getDay() convention.
export function weekdayOf(dateIso: string): number {
  const d = new Date(`${dateIso}T00:00:00Z`)
  return d.getUTCDay()
}

function describeDosage(ex: SessionExercise): string {
  const parts: string[] = []
  if (ex.sets != null && ex.reps != null) parts.push(`${ex.sets} sets x ${ex.reps} reps`)
  else if (ex.sets != null) parts.push(`${ex.sets} sets`)
  else if (ex.reps != null) parts.push(`${ex.reps} reps`)

  if (ex.hold_seconds != null && ex.hold_seconds > 0) parts.push(`hold ${ex.hold_seconds}s`)
  if (ex.duration_seconds != null && ex.duration_seconds > 0) parts.push(`${ex.duration_seconds}s`)
  if (ex.rest_seconds != null && ex.rest_seconds > 0) parts.push(`rest ${ex.rest_seconds}s`)

  return parts.join(', ')
}

function exerciseName(ex: SessionExercise, lang: string): string {
  if (lang === 'sw') return ex.name_sw || ex.name_en || 'mazoezi'
  return ex.name_en || ex.name_sw || 'exercise'
}

// Builds the compact per-day exercise list embedded in the WhatsApp template.
export function formatExerciseList(snapshot: SessionSnapshot, lang: string): string {
  const exercises = snapshot?.exercises ?? []
  return exercises
    .map((ex) => {
      const dosage = describeDosage(ex)
      const name = exerciseName(ex, lang)
      return dosage ? `${name} — ${dosage}` : name
    })
    .join('\n')
}

// Longer, human-friendly text used as the free-form fallback body.
export function formatProgrammeMessage(opts: {
  lang: string
  patientName: string
  clinicName: string
  greeting: string
  reminderTime?: string | null
  snapshot: SessionSnapshot
}): { exerciseText: string; fallbackBody: string } {
  const { lang, patientName, clinicName, greeting, reminderTime, snapshot } = opts
  const exerciseText = formatExerciseList(snapshot, lang) || (lang === 'sw' ? 'Hakuna mazoezi leo.' : 'No exercises today.')
  const fallbackBody = lang === 'sw'
    ? `${greeting}, hii ni kumbusho kutoka ${clinicName}. Mazoezi yako leo:\n${exerciseText}`
    : `Hello ${patientName}, this is your reminder from ${clinicName}. Your exercises today:\n${exerciseText}`
  return { exerciseText, fallbackBody }
}

// Deterministic idempotency key for a programme-session reminder.
export function programmeReminderKey(sessionId: string): string {
  return `programme_reminder:${sessionId}`
}

// Exercises in a snapshot that have a usable video URL.
export function exercisesWithVideos(snapshot: SessionSnapshot): SessionExercise[] {
  return (snapshot?.exercises ?? []).filter((ex) => typeof ex.video_url === 'string' && ex.video_url.trim() !== '')
}

// ---------------------------------------------------------------------------
// Validation (mirrors the server-side validate_programme RPC so the rules can
// be unit-tested without a database). `programme` is a plain object shaped like
// the programmes row; `days` is an array of { weekday, is_rest_day,
// reminder_enabled, exercises: [{ exercise_id, sets, reps, hold_seconds,
// duration_seconds, video_url, name_en }] }.
// ---------------------------------------------------------------------------
export interface ValidationMessage {
  code: string
  message: string
  weekday?: number
  exercise_id?: string | null
}

export interface ValidationResult {
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
}

export function validateProgrammeShape(programme: {
  name?: string | null
  start_date?: string | null
  end_date?: string | null
  reminder_time?: string | null
}, days: Array<{
  weekday: number
  is_rest_day: boolean
  reminder_enabled: boolean
  exercises: Array<{
    exercise_id?: string | null
    name_en?: string | null
    sets?: number | null
    reps?: number | null
    hold_seconds?: number | null
    duration_seconds?: number | null
    video_url?: string | null
  }>
}>): ValidationResult {
  const errors: ValidationMessage[] = []
  const warnings: ValidationMessage[] = []

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
          warnings.push({ code: 'repeated_exercise', message: 'An exercise is intentionally repeated on this day', weekday: day.weekday })
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

// Given a start date and the week's seven day-configs (indexed 0..6), compute
// the first dated session's weekday — used to assert mid-week start behaviour.
export function firstSessionWeekday(startDate: string): number {
  return weekdayOf(startDate)
}
