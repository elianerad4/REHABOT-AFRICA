// Pure domain logic for the Continuity Engine: status progression, webhook
// payload validation and fallback decisions. No Deno/network dependencies.

// Textify message lifecycle, ordered from earliest to most terminal.
// Matches Textify's statuses: scheduled, sending, processing, processing_status,
// sent, delivered, undelivered, failed.
export const STATUS_ORDER: Record<string, number> = {
  scheduled: 0,
  sending: 1,
  processing: 2,
  processing_status: 3,
  sent: 4,
  delivered: 5,
  undelivered: 6,
  failed: 7
}

export const TERMINAL_STATUSES = new Set(['delivered', 'undelivered', 'failed'])

// A status may only move forward through the lifecycle (prevents a stale or
// replayed webhook from downgrading a message that was already delivered).
export function isForwardStatus(current: string | null | undefined, incoming: string): boolean {
  if (!current) return true
  const curRank = STATUS_ORDER[current]
  const newRank = STATUS_ORDER[incoming]
  if (curRank === undefined || newRank === undefined) return false
  return newRank > curRank
}

export interface WebhookStatusEvent {
  providerMessageId: string
  status: string
  failureReason?: string | null
}

// Extract a status event from a Textify webhook payload. Textify's payload
// shape is expected to contain a message id and status; we accept the two most
// common shapes and normalise to { providerMessageId, status }.
export function extractStatusEvent(payload: unknown): WebhookStatusEvent | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, any>

  const id = p.id ?? p.message_id ?? p.provider_message_id ?? p.reference
  const status = p.status ?? p.state

  if (!id || !status || typeof id !== 'string' || typeof status !== 'string') return null
  if (!(status in STATUS_ORDER)) return null

  const failureReason =
    p.error ?? p.failure_reason ?? p.reason ?? p.detail ?? null

  return {
    providerMessageId: id,
    status,
    failureReason: typeof failureReason === 'string' ? failureReason : null
  }
}

// Validate that a payload looks like a legitimate Textify status webhook
// rather than an arbitrary POST. Returns a human-readable rejection reason.
export function validateStatusPayload(payload: unknown): string | null {
  const event = extractStatusEvent(payload)
  if (!event) return 'payload is missing a valid message id and status'
  return null
}

// Validate SMS content. Returns a rejection reason or null if valid.
export function validateSmsContent(content: string): string | null {
  const trimmed = (content ?? '').trim()
  if (!trimmed) return 'SMS content is empty'
  return null
}

// Decide whether an SMS fallback should fire.
//  - whatsappDelivered / patientResponded must be true only when we can
//    actually verify them; "no response" alone never implies non-delivery.
//  - fallbackAfterMinutes is the elapsed-time threshold (configurable).
export function shouldFallbackSms(opts: {
  whatsappSent: boolean
  whatsappFailed: boolean
  patientResponded: boolean
  elapsedMinutes: number
  fallbackAfterMinutes: number
}): { fallback: boolean; reason: string } {
  const { whatsappSent, whatsappFailed, patientResponded, elapsedMinutes, fallbackAfterMinutes } = opts

  if (whatsappFailed) {
    return { fallback: true, reason: 'whatsapp_send_failed' }
  }
  if (patientResponded) {
    return { fallback: false, reason: 'patient_already_responded' }
  }
  if (!whatsappSent) {
    return { fallback: false, reason: 'whatsapp_not_sent' }
  }
  if (elapsedMinutes >= fallbackAfterMinutes) {
    return { fallback: true, reason: 'no_response_timeout' }
  }
  return { fallback: false, reason: 'within_threshold' }
}
