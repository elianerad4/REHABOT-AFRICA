import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  WEEKDAY_NAMES_EN,
  reminderTimeToMinutes,
  isReminderDue,
  eatToday,
  eatHourMinute,
  sessionDates,
  weekdayOf,
  firstSessionWeekday,
  formatExerciseList,
  formatProgrammeMessage,
  programmeReminderKey,
  exercisesWithVideos,
  validateProgrammeShape
} from '../../supabase/functions/_shared/programme.ts'

// ---------------------------------------------------------------------------
// Reminder-time parsing
// ---------------------------------------------------------------------------
test('parses HH:MM and HH:MM:SS reminder times', () => {
  assert.equal(reminderTimeToMinutes('08:00'), 480)
  assert.equal(reminderTimeToMinutes('08:00:00'), 480)
  assert.equal(reminderTimeToMinutes('00:00'), 0)
  assert.equal(reminderTimeToMinutes('23:59'), 1439)
})

test('rejects invalid reminder times', () => {
  assert.equal(reminderTimeToMinutes(null), null)
  assert.equal(reminderTimeToMinutes(''), null)
  assert.equal(reminderTimeToMinutes('25:00'), null)
  assert.equal(reminderTimeToMinutes('8am'), null)
})

test('isReminderDue only fires at or after the reminder time', () => {
  assert.equal(isReminderDue('08:00', 480), true)
  assert.equal(isReminderDue('08:00', 479), false)
  assert.equal(isReminderDue(null, 480), false)
})

// ---------------------------------------------------------------------------
// EAT date helpers
// ---------------------------------------------------------------------------
test('eatToday and eatHourMinute compute East Africa time (UTC+3)', () => {
  // 2026-10-13T22:30:00Z == 2026-10-14 01:30 EAT
  const iso = '2026-10-13T22:30:00.000Z'
  assert.equal(eatToday(new Date(iso)), '2026-10-14')
  const { hour, minute, minutesOfDay } = eatHourMinute(new Date(iso))
  assert.equal(hour, 1)
  assert.equal(minute, 30)
  assert.equal(minutesOfDay, 90)
})

// ---------------------------------------------------------------------------
// Dated session generation (mid-week start + weekday mapping)
// ---------------------------------------------------------------------------
test('generates every date from start to end inclusive', () => {
  assert.deepEqual(sessionDates('2026-10-14', '2026-10-16'), ['2026-10-14', '2026-10-15', '2026-10-16'])
  assert.deepEqual(sessionDates('2026-10-14', '2026-10-14'), ['2026-10-14'])
  assert.deepEqual(sessionDates('2026-10-16', '2026-10-14'), [])
})

test('weekdayOf maps to the JS/Postgres dow convention (0=Sunday)', () => {
  // 2026-10-14 is a Wednesday (dow 3)
  assert.equal(weekdayOf('2026-10-14'), 3)
  // 2026-10-11 is a Sunday (dow 0)
  assert.equal(weekdayOf('2026-10-11'), 0)
  // 2026-10-12 is a Monday (dow 1)
  assert.equal(weekdayOf('2026-10-12'), 1)
})

test('a programme beginning mid-week starts on that weekday (not Monday)', () => {
  // Wednesday 2026-10-14 -> dow 3
  assert.equal(firstSessionWeekday('2026-10-14'), 3)
  // Monday 2026-10-12 -> dow 1
  assert.equal(firstSessionWeekday('2026-10-12'), 1)
})

test('each calendar date maps to its own weekday configuration', () => {
  // A 7-day run across a week boundary must hit every weekday exactly once.
  const dates = sessionDates('2026-10-12', '2026-10-18') // Mon..Sun
  const weekdays = dates.map(weekdayOf)
  assert.deepEqual(weekdays, [1, 2, 3, 4, 5, 6, 0])
})

// ---------------------------------------------------------------------------
// Message formatting
// ---------------------------------------------------------------------------
test('formats the per-day exercise list with dosage in English', () => {
  const snapshot = {
    exercises: [
      { name_en: 'Sit-to-stand', sets: 3, reps: 8 },
      { name_en: 'Plank', hold_seconds: 30 }
    ]
  }
  const text = formatExerciseList(snapshot, 'en')
  assert.ok(text.includes('Sit-to-stand — 3 sets x 8 reps'))
  assert.ok(text.includes('Plank — hold 30s'))
})

test('falls back to Swahili names when language is sw', () => {
  const snapshot = { exercises: [{ name_en: 'Bridge', name_sw: 'Daraja', sets: 3, reps: 10 }] }
  const text = formatExerciseList(snapshot, 'sw')
  assert.ok(text.includes('Daraja'))
})

test('programme reminder key is deterministic per session', () => {
  assert.equal(programmeReminderKey('abc-123'), 'programme_reminder:abc-123')
})

test('exercisesWithVideos only returns exercises with a usable URL', () => {
  const snapshot = {
    exercises: [
      { name_en: 'A', video_url: 'https://x/v.mp4' },
      { name_en: 'B', video_url: '' },
      { name_en: 'C', video_url: null }
    ]
  }
  assert.equal(exercisesWithVideos(snapshot).length, 1)
})

test('formatProgrammeMessage builds both template text and fallback body', () => {
  const { exerciseText, fallbackBody } = formatProgrammeMessage({
    lang: 'en', patientName: 'Asha', clinicName: 'Kilimani Clinic',
    greeting: 'Hello', snapshot: { exercises: [{ name_en: 'Bridging', sets: 3, reps: 10 }] }
  })
  assert.ok(exerciseText.includes('Bridging'))
  assert.ok(fallbackBody.includes('Asha'))
  assert.ok(fallbackBody.includes('Bridging'))
})

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------
test('flags an exercise day with no exercises as a blocking error', () => {
  const r = validateProgrammeShape(
    { name: 'P', start_date: '2026-10-12', end_date: '2026-10-18', reminder_time: '08:00' },
    [{ weekday: 1, is_rest_day: false, reminder_enabled: true, exercises: [] }]
  )
  assert.ok(r.errors.some((e) => e.code === 'empty_exercise_day'))
})

test('flags a rest day containing exercises and a rest-day reminder', () => {
  const r = validateProgrammeShape(
    { name: 'P', start_date: '2026-10-12', end_date: '2026-10-18', reminder_time: '08:00' },
    [{ weekday: 4, is_rest_day: true, reminder_enabled: true, exercises: [{ exercise_id: 'x', sets: 3, reps: 10 }] }]
  )
  assert.ok(r.errors.some((e) => e.code === 'rest_day_has_exercises'))
  assert.ok(r.errors.some((e) => e.code === 'rest_day_reminder'))
})

test('flags missing dosage and treats a repeated exercise as a warning', () => {
  const ex = { exercise_id: 'same-id', sets: 3, reps: 10, video_url: 'https://x/v.mp4' }
  const r = validateProgrammeShape(
    { name: 'P', start_date: '2026-10-12', end_date: '2026-10-18', reminder_time: '08:00' },
    [
      { weekday: 1, is_rest_day: false, reminder_enabled: true, exercises: [ex, ex] },
      { weekday: 2, is_rest_day: false, reminder_enabled: true, exercises: [{ exercise_id: 'y' }] }
    ]
  )
  assert.ok(r.warnings.some((w) => w.code === 'repeated_exercise'))
  assert.ok(r.errors.some((e) => e.code === 'missing_dosage' && e.exercise_id === 'y'))
  // The repeated exercise (same id, valid dosage) must NOT be an error.
  assert.ok(!r.errors.some((e) => e.exercise_id === 'same-id'))
})

test('flags invalid dates and missing reminder time', () => {
  const r = validateProgrammeShape(
    { name: 'P', start_date: '2026-10-18', end_date: '2026-10-12', reminder_time: null },
    []
  )
  assert.ok(r.errors.some((e) => e.code === 'invalid_dates'))
  assert.ok(r.errors.some((e) => e.code === 'missing_reminder_time'))
})

test('missing video is a warning, not a blocking error', () => {
  const r = validateProgrammeShape(
    { name: 'P', start_date: '2026-10-12', end_date: '2026-10-18', reminder_time: '08:00' },
    [{ weekday: 1, is_rest_day: false, reminder_enabled: true, exercises: [{ exercise_id: 'x', sets: 3, reps: 10 }] }]
  )
  assert.ok(r.warnings.some((w) => w.code === 'missing_video'))
  assert.ok(!r.errors.some((e) => e.code === 'missing_video'))
})
