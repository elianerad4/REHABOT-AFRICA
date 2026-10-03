import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeTanzanianPhone,
  isValidTanzanianPhone,
  normalizeAndValidatePhone,
  normalizeToE164,
  digitsOnly
} from '../../supabase/functions/_shared/phone.ts'

import {
  truncate,
  shortName,
  parsePainScore,
  getSmsTemplates,
  SMS_SEGMENT_LENGTH
} from '../../supabase/functions/_shared/sms-templates.ts'

import {
  STATUS_ORDER,
  isForwardStatus,
  extractStatusEvent,
  validateStatusPayload,
  validateSmsContent,
  shouldFallbackSms
} from '../../supabase/functions/_shared/sms-core.ts'

// ---------------------------------------------------------------------------
// Phone normalisation
// ---------------------------------------------------------------------------
test('normalizes the three accepted Tanzanian phone formats', () => {
  assert.equal(normalizeTanzanianPhone('0712345678'), '0712345678')
  assert.equal(normalizeTanzanianPhone('+255712345678'), '0712345678')
  assert.equal(normalizeTanzanianPhone('255712345678'), '0712345678')
  assert.equal(normalizeTanzanianPhone('00255712345678'), '0712345678')
})

test('accepts 06X and 07X prefixes', () => {
  assert.equal(isValidTanzanianPhone('0688123456'), true)
  assert.equal(isValidTanzanianPhone('0788123456'), true)
})

test('rejects invalid phone numbers', () => {
  assert.throws(() => normalizeAndValidatePhone('12345'), /Invalid Tanzanian phone number/)
  assert.throws(() => normalizeAndValidatePhone('+99912345678'), /Invalid Tanzanian phone number/)
  assert.throws(() => normalizeAndValidatePhone('0712345'), /Invalid Tanzanian phone number/)
  assert.throws(() => normalizeAndValidatePhone(''), /Invalid Tanzanian phone number/)
  assert.throws(() => normalizeAndValidatePhone('0812345678'), /Invalid Tanzanian phone number/) // 08X is not mobile
})

test('normalizes inbound sender to E.164 format stored on patients', () => {
  assert.equal(normalizeToE164('0712345678'), '+255712345678')
  assert.equal(normalizeToE164('+255712345678'), '+255712345678')
  assert.equal(normalizeToE164('255712345678'), '+255712345678')
})

test('digitsOnly strips formatting', () => {
  assert.equal(digitsOnly('+255 712 345 678'), '255712345678')
})

// ---------------------------------------------------------------------------
// SMS content + templates
// ---------------------------------------------------------------------------
test('truncate keeps a message within a single SMS segment', () => {
  const long = 'x'.repeat(500)
  const out = truncate(long, SMS_SEGMENT_LENGTH)
  assert.ok(out.length <= SMS_SEGMENT_LENGTH)
  assert.ok(out.endsWith('…'))
})

test('truncate leaves short messages unchanged', () => {
  assert.equal(truncate('hello', SMS_SEGMENT_LENGTH), 'hello')
})

test('shortName returns the first name', () => {
  assert.equal(shortName('Asha Mwangi'), 'Asha')
  assert.equal(shortName('   '), 'there')
})

test('all English/Swahili templates fit in one segment', () => {
  for (const lang of ['en', 'sw']) {
    const t = getSmsTemplates(lang)
    const name = 'Asha Mwangi'
    const clinic = 'Kilimani Physio Clinic'
    const samples = [
      t.exerciseReminder({ name, clinic }),
      t.appointmentReminder({ name, clinic, dateTime: 'tomorrow at 10:00 AM' }),
      t.followUp({ name, clinic }),
      t.missedFollowUp({ name, clinic }),
      t.painScoreRequest({ name }),
      t.painScoreThankYou({ score: 7 })
    ]
    for (const s of samples) {
      assert.ok(s.length <= SMS_SEGMENT_LENGTH, `${lang} template too long (${s.length})`)
      assert.ok(s.length > 0)
    }
  }
})

test('validateSmsContent rejects empty/blank messages', () => {
  assert.equal(validateSmsContent(''), 'SMS content is empty')
  assert.equal(validateSmsContent('   '), 'SMS content is empty')
  assert.equal(validateSmsContent(null), 'SMS content is empty')
  assert.equal(validateSmsContent('hello'), null)
})

// ---------------------------------------------------------------------------
// Pain score parsing (0-10 for SMS)
// ---------------------------------------------------------------------------
test('parses pain scores 0 through 10', () => {
  assert.equal(parsePainScore('0'), 0)
  assert.equal(parsePainScore('4'), 4)
  assert.equal(parsePainScore('10'), 10)
  assert.equal(parsePainScore(' 7 '), 7)
})

test('rejects invalid pain scores', () => {
  assert.equal(parsePainScore('11'), null)
  assert.equal(parsePainScore('-1'), null)
  assert.equal(parsePainScore('4.5'), null)
  assert.equal(parsePainScore('abc'), null)
  assert.equal(parsePainScore(''), null)
  assert.equal(parsePainScore('100'), null)
})

// ---------------------------------------------------------------------------
// Status progression / webhook validation
// ---------------------------------------------------------------------------
test('status only moves forward', () => {
  assert.equal(isForwardStatus(null, 'sent'), true)
  assert.equal(isForwardStatus('sent', 'delivered'), true)
  assert.equal(isForwardStatus('delivered', 'failed'), true)
  assert.equal(isForwardStatus('delivered', 'sent'), false)
  assert.equal(isForwardStatus('sent', 'sent'), false)
  assert.equal(isForwardStatus('processing', 'undelivered'), true)
})

test('extractStatusEvent handles the common payload shapes', () => {
  assert.deepEqual(extractStatusEvent({ id: 'abc', status: 'delivered' }), {
    providerMessageId: 'abc', status: 'delivered', failureReason: null
  })
  assert.deepEqual(extractStatusEvent({ message_id: 'xyz', status: 'failed', error: 'no route' }), {
    providerMessageId: 'xyz', status: 'failed', failureReason: 'no route'
  })
  assert.equal(extractStatusEvent({ status: 'delivered' }), null)
  assert.equal(extractStatusEvent({ id: 'abc' }), null)
  assert.equal(extractStatusEvent({ id: 'abc', status: 'bogus' }), null)
  assert.equal(extractStatusEvent(null), null)
})

test('validateStatusPayload rejects non-status payloads', () => {
  assert.equal(validateStatusPayload({ id: 'abc', status: 'delivered' }), null)
  assert.ok(validateStatusPayload({ foo: 'bar' }))
  assert.ok(validateStatusPayload(null))
})

// ---------------------------------------------------------------------------
// Fallback decision
// ---------------------------------------------------------------------------
test('falls back immediately when WhatsApp fails', () => {
  const r = shouldFallbackSms({ whatsappSent: false, whatsappFailed: true, patientResponded: false, elapsedMinutes: 0, fallbackAfterMinutes: 120 })
  assert.deepEqual(r, { fallback: true, reason: 'whatsapp_send_failed' })
})

test('does not fall back when the patient already responded', () => {
  const r = shouldFallbackSms({ whatsappSent: true, whatsappFailed: false, patientResponded: true, elapsedMinutes: 200, fallbackAfterMinutes: 120 })
  assert.deepEqual(r, { fallback: false, reason: 'patient_already_responded' })
})

test('falls back on no response after the threshold', () => {
  const r = shouldFallbackSms({ whatsappSent: true, whatsappFailed: false, patientResponded: false, elapsedMinutes: 120, fallbackAfterMinutes: 120 })
  assert.deepEqual(r, { fallback: true, reason: 'no_response_timeout' })
})

test('does not fall back before the threshold', () => {
  const r = shouldFallbackSms({ whatsappSent: true, whatsappFailed: false, patientResponded: false, elapsedMinutes: 119, fallbackAfterMinutes: 120 })
  assert.deepEqual(r, { fallback: false, reason: 'within_threshold' })
})
