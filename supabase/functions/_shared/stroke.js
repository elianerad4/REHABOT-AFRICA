// Shared pure logic for the Stroke Rehabilitation Module.
// Kept free of Deno / Supabase dependencies so it can be unit-tested with Node.

export function formatDosage(pe) {
  if (pe.duration_seconds) return `${pe.duration_seconds} seconds`
  if (pe.sets && pe.repetitions) return `${pe.sets} × ${pe.repetitions}`
  if (pe.sets) return `${pe.sets} sets`
  if (pe.repetitions) return `${pe.repetitions} reps`
  return '—'
}

export function formatEatDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map((n) => parseInt(n))
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[(m || 1) - 1]} ${y}`
}

// Is a programme exercise scheduled on a given day of the week (0 = Sunday)?
export function isScheduledToday(pe, todayDow) {
  if (!pe || pe.is_active === false) return false
  if (pe.frequency === 'weekly' && Array.isArray(pe.days_of_week)) {
    return pe.days_of_week.includes(todayDow)
  }
  return true
}

// Is the programme within its date range for `today` (YYYY-MM-DD)?
export function isProgrammeInRange(programme, today) {
  const inRange = (!programme.start_date || today >= programme.start_date) &&
    (!programme.end_date || today <= programme.end_date)
  return inRange
}

export const EMERGENT_KEYWORDS = [
  'chest pain', 'cannot breathe', "can't breathe", 'cannot talk', "can't talk", 'slurred',
  'face droop', 'facial droop', 'fainted', 'unconscious', 'passed out', 'pass out',
  'severe headache', 'severe breathlessness', 'severe dizziness', 'seizure'
]

export const REVIEW_KEYWORDS = [
  'fell', 'fall', 'dizzy', 'new weakness', 'weaker', 'worse', 'numb', 'tingling',
  'difficulty speaking', 'blurred vision', 'vision change', 'headache', 'very tired'
]

// Conservative safety handling. Never diagnoses — only flags for clinician review
// or prompts urgent care when the reported symptom is potentially emergent.
export function checkSafety(message, lang) {
  const t = String(message || '').toLowerCase()
  const details = `Patient replied: "${message}"`

  for (const kw of EMERGENT_KEYWORDS) {
    if (t.includes(kw)) {
      return {
        severity: 'urgent',
        details: `${details} (matched: ${kw})`,
        reply: lang === 'sw'
          ? 'Asante kwa kutuambia. Tafadhali tafuta matibabu ya dharura mara moja kwa namba yako ya dharura ya eneo, na pia mjulishe mtaalamu wako wa tiba ya viungo haraka iwezekanavyo.'
          : 'Thank you for telling us. Please seek urgent medical attention now by calling your local emergency number, and also inform your physiotherapist as soon as possible.'
      }
    }
  }

  for (const kw of REVIEW_KEYWORDS) {
    if (t.includes(kw)) {
      return {
        severity: 'review',
        details: `${details} (matched: ${kw})`,
        reply: lang === 'sw'
          ? 'Asante kwa kutuambia. Jibu hili limewekwa alama kwa mtaalamu wako wa tiba ya viungo kupitia.'
          : 'Thank you for telling us. This response has been flagged for your physiotherapist to review.'
      }
    }
  }

  return null
}

// Daily adherence: completed / assigned × 100 for a set of completion logs.
export function computeAdherence(completionLogs) {
  const total = completionLogs.length
  if (total === 0) return 0
  const completed = completionLogs.filter((l) => l.status === 'completed').length
  return Math.round((completed / total) * 100)
}

// Weekly adherence: completed prescribed sessions / expected sessions × 100.
export function computeWeeklyAdherence(completedCount, expectedSessions) {
  if (!expectedSessions || expectedSessions <= 0) return 0
  return Math.round((completedCount / expectedSessions) * 100)
}

// Build the numbered exercise list lines used in the WhatsApp programme message.
export function buildExerciseListLines(items) {
  return items
    .map((pe, i) => `\n${i + 1}. ${pe.exercises?.name_en ?? 'Exercise'} — ${formatDosage(pe)}`)
    .join('')
}
