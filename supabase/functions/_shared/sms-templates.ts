// Reusable SMS message templates for the Rehabot Continuity Engine.
// Pure string functions (no Deno/network) so they can be unit-tested and
// reused across the send-daily-reminders cron, the textify-sms service and
// the SMS pain-score pathway.

// SMS is billed in 160-character units. Templates are kept short and any
// dynamic content is truncated so a reminder stays within a single segment
// where possible.
export const SMS_SEGMENT_LENGTH = 160

export function truncate(text: string, max: number): string {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

// Keep the receiver-facing name short (first name) to save characters.
export function shortName(fullName: string): string {
  return (fullName ?? '').trim().split(/\s+/)[0] || 'there'
}

export interface SmsTemplates {
  exerciseReminder: (opts: { name: string; clinic: string }) => string
  appointmentReminder: (opts: { name: string; clinic: string; dateTime: string }) => string
  followUp: (opts: { name: string; clinic: string }) => string
  missedFollowUp: (opts: { name: string; clinic: string }) => string
  painScoreRequest: (opts: { name: string }) => string
  painScoreThankYou: (opts: { score: number }) => string
}

const en: SmsTemplates = {
  exerciseReminder: ({ name, clinic }) =>
    truncate(
      `Hello ${shortName(name)}. Your physiotherapy exercises are due today. Please complete your programme from ${clinic} and report your pain afterwards.`,
      SMS_SEGMENT_LENGTH
    ),
  appointmentReminder: ({ name, clinic, dateTime }) =>
    truncate(
      `Hello ${shortName(name)}. Reminder: your physiotherapy appointment is ${dateTime}. Contact ${clinic} if you need to reschedule.`,
      SMS_SEGMENT_LENGTH
    ),
  followUp: ({ name, clinic }) =>
    truncate(
      `Hello ${shortName(name)}. Quick check-in from ${clinic}: how did your exercises go? Reply with a number from 0-10 for your pain.`,
      SMS_SEGMENT_LENGTH
    ),
  missedFollowUp: ({ name, clinic }) =>
    truncate(
      `Hello ${shortName(name)}. We missed you earlier. Please complete your exercises and reply with your pain score (0-10). ${clinic}`,
      SMS_SEGMENT_LENGTH
    ),
  painScoreRequest: ({ name }) =>
    truncate(
      `Hello ${shortName(name)}. How was your pain after today's exercises? Reply with a number from 0-10.`,
      SMS_SEGMENT_LENGTH
    ),
  painScoreThankYou: ({ score }) =>
    truncate(`Thank you! We recorded your pain score: ${score}/10. Your physio will review this.`, SMS_SEGMENT_LENGTH)
}

const sw: SmsTemplates = {
  exerciseReminder: ({ name, clinic }) =>
    truncate(
      `Habari ${shortName(name)}. Mazoezi yako ya leo yanapaswa kufanywa. Tafadhali kamilisha mpango wako kutoka ${clinic} kisha uripoti maumivu yako.`,
      SMS_SEGMENT_LENGTH
    ),
  appointmentReminder: ({ name, clinic, dateTime }) =>
    truncate(
      `Habari ${shortName(name)}. Kumbusho: miadi yako ya tiba ya viungo ni ${dateTime}. Wasiliana na ${clinic} kama unahitaji kubadilisha.`,
      SMS_SEGMENT_LENGTH
    ),
  followUp: ({ name, clinic }) =>
    truncate(
      `Habari ${shortName(name)}. Ukaguzi mfupi kutoka ${clinic}: mazoezi yako yalikwendaje? Jibu kwa namba 0-10 kwa maumivu yako.`,
      SMS_SEGMENT_LENGTH
    ),
  missedFollowUp: ({ name, clinic }) =>
    truncate(
      `Habari ${shortName(name)}. Tulikukosa mapema. Tafadhali fanya mazoezi yako kisha ujibu kwa namba ya maumivu (0-10). ${clinic}`,
      SMS_SEGMENT_LENGTH
    ),
  painScoreRequest: ({ name }) =>
    truncate(
      `Habari ${shortName(name)}. Maumivu yako yalikwendaje baada ya mazoezi ya leo? Jibu kwa namba 0-10.`,
      SMS_SEGMENT_LENGTH
    ),
  painScoreThankYou: ({ score }) =>
    truncate(`Asante! Tumesajili maumivu yako: ${score}/10. Daktari wako ataona hii.`, SMS_SEGMENT_LENGTH)
}

export function getSmsTemplates(language: string): SmsTemplates {
  return language === 'sw' ? sw : en
}

// Pain-score parsing shared by the WhatsApp and SMS inbound paths.
// Accepts an integer 0-10 (the SMS pathway) and also tolerates 1-10 for
// consistency with the existing WhatsApp flow.
export function parsePainScore(raw: string): number | null {
  const trimmed = (raw ?? '').trim()
  if (!/^\d{1,2}$/.test(trimmed)) return null
  const score = parseInt(trimmed, 10)
  if (score >= 0 && score <= 10) return score
  return null
}
