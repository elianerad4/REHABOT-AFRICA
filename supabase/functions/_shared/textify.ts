// Textify Africa API client (server-side only — never import in React).
// The API key lives in Deno.env and is never exposed to the browser.
import { normalizeAndValidatePhone } from './phone.ts'
import { validateSmsContent } from './sms-core.ts'

export const DEFAULT_TEXTIFY_BASE_URL = 'https://portal.textify.africa/v1'

export class TextifyError extends Error {
  code:
    | 'missing_api_key'
    | 'invalid_phone'
    | 'invalid_request'
    | 'insufficient_balance'
    | 'provider_error'
    | 'network_error'
    | 'rate_limited'

  constructor(code: TextifyError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'TextifyError'
  }
}

function getApiKey(): string {
  const key = Deno.env.get('TEXTIFY_API_KEY')?.trim()
  if (!key) {
    throw new TextifyError('missing_api_key', 'TEXTIFY_API_KEY is not configured')
  }
  return key
}

function getBaseUrl(): string {
  return (Deno.env.get('TEXTIFY_BASE_URL') || DEFAULT_TEXTIFY_BASE_URL).replace(/\/$/, '')
}

function getSenderName(): string {
  return (Deno.env.get('TEXTIFY_DEFAULT_SENDER') || 'REHABOT').trim()
}

export interface SendSmsOptions {
  to: string
  content: string
  senderName?: string
  scheduledAt?: string // ISO datetime; when set, is_scheduled=true
  idempotencyKey?: string
}

export interface SendSmsResult {
  providerMessageId: string | null
  status: string
  scheduled: boolean
  raw: Record<string, any>
}

// Parses a Textify error response into a safe, typed error. Raw provider
// messages are logged (never surfaced to patients) and a stable code is
// returned so callers can react programmatically.
function classifyProviderError(status: number, body: Record<string, any>): TextifyError {
  const message: string = body?.message ?? body?.error ?? body?.detail ?? `HTTP ${status}`

  if (status === 429) return new TextifyError('rate_limited', 'Textify rate limit reached')
  if (status === 402 || /balance|insufficient|credit/i.test(String(message))) {
    return new TextifyError('insufficient_balance', 'Textify account has insufficient balance')
  }
  return new TextifyError('provider_error', `Textify error: ${message}`)
}

export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  const key = getApiKey()
  const content = (opts.content ?? '').trim()
  const contentError = validateSmsContent(content)
  if (contentError) throw new TextifyError('invalid_request', contentError)

  const receiver = normalizeAndValidatePhone(opts.to)
  const isScheduled = Boolean(opts.scheduledAt)
  if (isScheduled && isNaN(Date.parse(opts.scheduledAt!))) {
    throw new TextifyError('invalid_request', 'scheduledAt must be a valid ISO datetime')
  }

  const payload: Record<string, any> = {
    sender_name: opts.senderName || getSenderName(),
    is_scheduled: isScheduled,
    messages: [{ receiver, content }]
  }
  if (isScheduled) payload.scheduled_date = opts.scheduledAt

  let response: Response
  try {
    response = await fetch(`${getBaseUrl()}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.error('Textify network failure:', err.message)
    throw new TextifyError('network_error', 'Unable to reach Textify')
  }

  let body: any = {}
  try {
    body = await response.json()
  } catch {
    body = {}
  }

  if (!response.ok) {
    console.error(`Textify send failed (${response.status}):`, JSON.stringify(body))
    throw classifyProviderError(response.status, body)
  }

  // Textify may return a single id or a per-message array; normalise to the
  // first available id so callers can correlate status webhooks.
  const first = Array.isArray(body?.data) ? body.data[0] : body?.data ?? body
  const providerMessageId =
    first?.id ?? first?.message_id ?? first?.provider_message_id ?? body?.id ?? null

  console.log(`Textify send ok (scheduled=${isScheduled}) id=${providerMessageId}`)

  return {
    providerMessageId: providerMessageId ? String(providerMessageId) : null,
    status: isScheduled ? 'scheduled' : 'sent',
    scheduled: isScheduled,
    raw: body
  }
}

export function scheduleSms(opts: Omit<SendSmsOptions, 'scheduledAt'> & { scheduledAt: string }) {
  return sendSms({ ...opts, scheduledAt: opts.scheduledAt })
}

export async function getMessage(messageId: string): Promise<Record<string, any>> {
  const key = getApiKey()
  const response = await fetch(`${getBaseUrl()}/messages/${encodeURIComponent(messageId)}`, {
    headers: { Authorization: `Bearer ${key}` }
  })
  const body = await response.json()
  if (!response.ok) throw classifyProviderError(response.status, body)
  return body
}

export async function listMessages(params: { limit?: number; offset?: number } = {}): Promise<Record<string, any>> {
  const key = getApiKey()
  const url = new URL(`${getBaseUrl()}/messages`)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  if (params.offset) url.searchParams.set('offset', String(params.offset))
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${key}` } })
  const body = await response.json()
  if (!response.ok) throw classifyProviderError(response.status, body)
  return body
}
