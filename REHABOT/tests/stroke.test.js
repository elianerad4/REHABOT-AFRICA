import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDosage,
  formatEatDate,
  isScheduledToday,
  isProgrammeInRange,
  checkSafety,
  computeAdherence,
  computeWeeklyAdherence,
  buildExerciseListLines
} from '../../supabase/functions/_shared/stroke.js'

// ---------------------------------------------------------------------------
// formatDosage
// ---------------------------------------------------------------------------
test('formatDosage renders sets x reps, duration, and fallbacks', () => {
  assert.equal(formatDosage({ sets: 3, repetitions: 8 }), '3 × 8')
  assert.equal(formatDosage({ duration_seconds: 30 }), '30 seconds')
  assert.equal(formatDosage({ sets: 2 }), '2 sets')
  assert.equal(formatDosage({ repetitions: 10 }), '10 reps')
  assert.equal(formatDosage({}), '—')
})

// ---------------------------------------------------------------------------
// formatEatDate
// ---------------------------------------------------------------------------
test('formatEatDate renders a friendly date', () => {
  assert.equal(formatEatDate('2026-08-21'), '21 Aug 2026')
  assert.equal(formatEatDate('2026-01-05'), '5 Jan 2026')
})

// ---------------------------------------------------------------------------
// isScheduledToday
// ---------------------------------------------------------------------------
test('isScheduledToday: daily exercises are scheduled every day', () => {
  assert.equal(isScheduledToday({ frequency: 'daily' }, 0), true)
  assert.equal(isScheduledToday({ frequency: 'daily' }, 6), true)
})

test('isScheduledToday: weekly exercises respect days_of_week', () => {
  const pe = { frequency: 'weekly', days_of_week: [1, 3, 5] }
  assert.equal(isScheduledToday(pe, 1), true)
  assert.equal(isScheduledToday(pe, 3), true)
  assert.equal(isScheduledToday(pe, 5), true)
  assert.equal(isScheduledToday(pe, 0), false)
  assert.equal(isScheduledToday(pe, 2), false)
})

test('isScheduledToday: inactive exercises are never scheduled', () => {
  assert.equal(isScheduledToday({ frequency: 'daily', is_active: false }, 1), false)
})

// ---------------------------------------------------------------------------
// isProgrammeInRange
// ---------------------------------------------------------------------------
test('isProgrammeInRange respects start and end dates', () => {
  const programme = { start_date: '2026-08-01', end_date: '2026-08-31' }
  assert.equal(isProgrammeInRange(programme, '2026-08-01'), true)
  assert.equal(isProgrammeInRange(programme, '2026-08-15'), true)
  assert.equal(isProgrammeInRange(programme, '2026-08-31'), true)
  assert.equal(isProgrammeInRange(programme, '2026-07-31'), false)
  assert.equal(isProgrammeInRange(programme, '2026-09-01'), false)
})

test('isProgrammeInRange treats missing dates as open-ended', () => {
  assert.equal(isProgrammeInRange({}, '2026-08-15'), true)
  assert.equal(isProgrammeInRange({ start_date: '2026-08-01' }, '2026-08-15'), true)
  assert.equal(isProgrammeInRange({ end_date: '2026-08-31' }, '2026-08-15'), true)
})

// ---------------------------------------------------------------------------
// checkSafety
// ---------------------------------------------------------------------------
test('checkSafety: emergent symptoms return urgent with care-seeking reply', () => {
  const result = checkSafety('I have chest pain', 'en')
  assert.equal(result.severity, 'urgent')
  assert.match(result.reply, /emergency/i)
  assert.match(result.details, /chest pain/)
})

test('checkSafety: concerning but non-emergent responses are flagged for review', () => {
  const result = checkSafety('I felt dizzy this morning and then fell', 'en')
  assert.equal(result.severity, 'review')
  assert.match(result.reply, /flagged for your physiotherapist/)
})

test('checkSafety: normal messages are not flagged', () => {
  assert.equal(checkSafety('done', 'en'), null)
  assert.equal(checkSafety('5', 'en'), null)
  assert.equal(checkSafety('I am feeling fine', 'en'), null)
})

test('checkSafety: never presents itself as a diagnosis', () => {
  const result = checkSafety('I have chest pain', 'en')
  assert.ok(!/complication|diagnos/i.test(result.reply))
})

test('checkSafety: Swahili replies are provided', () => {
  const result = checkSafety('I have chest pain', 'sw')
  assert.equal(result.severity, 'urgent')
  assert.match(result.reply, /dharura/)
})

// ---------------------------------------------------------------------------
// computeAdherence
// ---------------------------------------------------------------------------
test('computeAdherence: daily adherence percentage', () => {
  const logs = [
    { status: 'completed' },
    { status: 'completed' },
    { status: 'pending' },
    { status: 'completed' }
  ]
  assert.equal(computeAdherence(logs), 75)
})

test('computeAdherence: empty logs return 0', () => {
  assert.equal(computeAdherence([]), 0)
})

// ---------------------------------------------------------------------------
// computeWeeklyAdherence
// ---------------------------------------------------------------------------
test('computeWeeklyAdherence: completed / expected', () => {
  assert.equal(computeWeeklyAdherence(11, 14), 79)
  assert.equal(computeWeeklyAdherence(0, 14), 0)
  assert.equal(computeWeeklyAdherence(14, 14), 100)
  assert.equal(computeWeeklyAdherence(5, 0), 0)
})

// ---------------------------------------------------------------------------
// buildExerciseListLines
// ---------------------------------------------------------------------------
test('buildExerciseListLines builds a numbered programme message', () => {
  const items = [
    { exercises: { name_en: 'Sit-to-stand' }, sets: 3, repetitions: 8 },
    { exercises: { name_en: 'Weight shifting' }, duration_seconds: 30 },
    { exercises: { name_en: 'Supported marching' }, sets: 2, repetitions: 10 }
  ]
  const list = buildExerciseListLines(items)
  assert.match(list, /1\. Sit-to-stand — 3 × 8/)
  assert.match(list, /2\. Weight shifting — 30 seconds/)
  assert.match(list, /3\. Supported marching — 2 × 10/)
})

// ---------------------------------------------------------------------------
// End-to-end scheduling decision (mimics send-daily-reminders logic)
// ---------------------------------------------------------------------------
test('daily programme selection: weekly programme only fires on selected days', () => {
  const todayDow = 2 // Wednesday
  const programmeExercises = [
    { id: 'a', frequency: 'weekly', days_of_week: [1, 3], is_active: true },
    { id: 'b', frequency: 'daily', is_active: true },
    { id: 'c', frequency: 'weekly', days_of_week: [0, 6], is_active: true }
  ]
  const todays = programmeExercises.filter((pe) => isScheduledToday(pe, todayDow))
  assert.deepEqual(todays.map((pe) => pe.id), ['b'])
})

test('expired programme is not delivered', () => {
  const programme = { start_date: '2026-08-01', end_date: '2026-08-10' }
  assert.equal(isProgrammeInRange(programme, '2026-08-21'), false)
})

test('inactive exercise is not delivered', () => {
  const pe = { frequency: 'daily', is_active: false }
  assert.equal(isScheduledToday(pe, 3), false)
})
