import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { normalizeToE164 } from '../_shared/phone.ts'
import { parsePainScore, getSmsTemplates } from '../_shared/sms-templates.ts'
import { sendSms, TextifyError } from '../_shared/textify.ts'

// Inbound SMS webhook (Textify -> Rehabot). Handles patient replies:
//   * a number 0-10  -> pain score (stored in the existing pain_logs table)
//   * anything else  -> logged as a patient_response on the pending follow-up
//
// The exact inbound payload Textify delivers is normalised defensively here
// (from / text / body / content, and id / message_id for correlation). If the
// portal's actual field names differ, only `extractInbound` needs updating.

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('TEXTIFY_WEBHOOK_SECRET')?.trim()
  if (!secret) {
    console.error('TEXTIFY_WEBHOOK_SECRET is not set — inbound SMS webhook is NOT being verified.')
    return true
  }
  if (Deno.env.get('TEXTIFY_WEBHOOK_ENFORCE') === 'true') {
    const provided =
      req.headers.get('x-textify-secret') ??
      req.headers.get('x-webhook-secret') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    return provided === secret
  }
  return true
}

interface InboundSms {
  from: string
  text: string
  providerMessageId: string | null
}

function extractInbound(payload: any): InboundSms | null {
  const p = payload ?? {}
  const from = p.from ?? p.sender ?? p.receiver?.from ?? p.msisdn ?? p.phone_number
  const text = p.text ?? p.content ?? p.body ?? p.message ?? p.sms
  const providerMessageId = p.id ?? p.message_id ?? p.reference ?? null

  if (!from || !text) return null
  return {
    from: String(from),
    text: String(text).trim(),
    providerMessageId: providerMessageId ? String(providerMessageId) : null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  const okResponse = new Response('OK', { status: 200 })

  try {
    const payload = await req.json()
    const inbound = extractInbound(payload)
    if (!inbound) {
      console.error('sms-inbound: unrecognised payload', JSON.stringify(payload))
      return okResponse
    }

    let e164: string
    try {
      e164 = normalizeToE164(inbound.from)
    } catch {
      console.error(`sms-inbound: ignoring invalid sender "${inbound.from}"`)
      return okResponse
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: patientRows } = await supabase
      .from('patients')
      .select('id, full_name, language, clinic_id, physio_id')
      .eq('phone_number', e164)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    const patient = patientRows?.[0]
    if (!patient) {
      console.error(`sms-inbound: no active patient for ${e164}`)
      return okResponse
    }

    // Idempotency: prefer the provider's inbound message id; otherwise derive
    // a stable key so Textify retries don't produce duplicate pain logs.
    const score = parsePainScore(inbound.text)
    const idempotencyKey = inbound.providerMessageId
      ? `inbound:${inbound.providerMessageId}`
      : `inbound:${e164}:${score !== null ? score : 'text'}:${new Date().toISOString().slice(0, 13)}`

    const { error: insertError } = await supabase.from('communication_logs').insert({
      patient_id: patient.id,
      physio_id: patient.physio_id,
      clinic_id: patient.clinic_id,
      direction: 'inbound',
      channel: 'sms',
      message_type: 'patient_response',
      message_content: inbound.text,
      provider: 'textify',
      provider_message_id: inbound.providerMessageId,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      response: inbound.text,
      response_at: new Date().toISOString(),
      idempotency_key: idempotencyKey
    })

    // Unique idempotency_key already exists -> we already processed this event.
    if (insertError && insertError.code === '23505') {
      return okResponse
    }
    if (insertError) console.error('sms-inbound: log insert failed:', insertError.message)

    // Correlate to the pending outbound request (most recent unanswered SMS).
    const { data: pendingReq } = await supabase
      .from('communication_logs')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('channel', 'sms')
      .in('message_type', ['pain_score_request', 'follow_up', 'exercise_reminder', 'missed_follow_up'])
      .is('response', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingReq) {
      await supabase
        .from('communication_logs')
        .update({ response: inbound.text, response_at: new Date().toISOString() })
        .eq('id', pendingReq.id)
    }

    // Record the pain score in the EXISTING pain_logs system (0-10 allowed).
    if (score !== null) {
      const { error: painError } = await supabase.from('pain_logs').insert({
        patient_id: patient.id,
        score,
        raw_reply: inbound.text
      })
      if (painError) console.error('sms-inbound: pain_logs insert failed:', painError.message)

      // Acknowledge the patient (best-effort; never fatal to the webhook).
      try {
        const t = getSmsTemplates(patient.language)
        await sendSms({
          to: patient.phone_number,
          content: t.painScoreThankYou({ score }),
          idempotencyKey: `sms-ack:${patient.id}:${new Date().toISOString().slice(0, 13)}`
        })
      } catch (err) {
        const reason = err instanceof TextifyError ? err.code : err.message
        console.error(`sms-inbound: ack failed for patient ${patient.id}: ${reason}`)
      }
    }

    return okResponse
  } catch (err) {
    console.error('sms-inbound error:', err.message)
    return okResponse
  }
})
