import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendSms, scheduleSms, getMessage, listMessages, TextifyError } from '../_shared/textify.ts'
import { getSmsTemplates } from '../_shared/sms-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

const ALLOWED_MESSAGE_TYPES = new Set([
  'exercise_reminder',
  'appointment_reminder',
  'follow_up',
  'missed_follow_up',
  'pain_score_request',
  'system'
])

function json(body: Record<string, any>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function buildContent(messageType: string, language: string, opts: { name: string; clinic: string; dateTime?: string }): string {
  const t = getSmsTemplates(language)
  switch (messageType) {
    case 'exercise_reminder':
      return t.exerciseReminder({ name: opts.name, clinic: opts.clinic })
    case 'appointment_reminder':
      return t.appointmentReminder({ name: opts.name, clinic: opts.clinic, dateTime: opts.dateTime ?? '' })
    case 'follow_up':
      return t.followUp({ name: opts.name, clinic: opts.clinic })
    case 'missed_follow_up':
      return t.missedFollowUp({ name: opts.name, clinic: opts.clinic })
    case 'pain_score_request':
      return t.painScoreRequest({ name: opts.name })
    default:
      return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    // User-scoped client so RLS governs every patient read (a physio can only
    // reach their own / clinic patients). Service-role client for writes the
    // browser must not be able to make directly (communication_logs).
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Invalid or expired session' }, 401)

    const url = new URL(req.url)
    const path = url.pathname.replace(/^\/+|\/+$/g, '')

    // ---- GET /messages (admin-only account listing / debug) ----------------
    if (req.method === 'GET' && path.includes('/messages')) {
      const { data: profile } = await serviceClient
        .from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (!profile?.is_admin) return json({ error: 'Admin only' }, 403)

      const id = path.split('/messages/')[1]
      if (id) return json(await getMessage(id))
      return json(await listMessages({ limit: Number(url.searchParams.get('limit') ?? 50) }))
    }

    // ---- POST /send-sms (or /schedule-sms) --------------------------------
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const body = await req.json()
    const { patient_id, message_type, content, scheduled_at, date_time } = body ?? {}

    if (!patient_id) return json({ error: 'Missing patient_id' }, 400)
    if (!message_type || !ALLOWED_MESSAGE_TYPES.has(message_type)) {
      return json({ error: 'Unsupported message_type' }, 400)
    }

    // RLS-scoped fetch: returns null for any patient this user can't access.
    const { data: patient } = await userClient
      .from('patients')
      .select('id, full_name, phone_number, language, clinic_id, physio_id, clinics(name)')
      .eq('id', patient_id)
      .maybeSingle()

    if (!patient) return json({ error: 'Patient not found' }, 404)

    const clinic = patient.clinics?.name ?? 'Rehabot Africa'
    const resolvedContent = content?.trim()
      ? content.trim()
      : buildContent(message_type, patient.language, { name: patient.full_name, clinic, dateTime: date_time })

    if (!resolvedContent) return json({ error: 'Could not build SMS content' }, 400)

    const idempotencyKey = `sms:${patient_id}:${message_type}:${new Date().toISOString().slice(0, 10)}`

    let result
    try {
      if (scheduled_at) {
        result = await scheduleSms({ to: patient.phone_number, content: resolvedContent, scheduledAt: scheduled_at, idempotencyKey })
      } else {
        result = await sendSms({ to: patient.phone_number, content: resolvedContent, idempotencyKey })
      }
    } catch (err) {
      if (err instanceof TextifyError) {
        await serviceClient.from('communication_logs').insert({
          patient_id,
          physio_id: patient.physio_id,
          clinic_id: patient.clinic_id,
          direction: 'outbound',
          channel: 'sms',
          message_type,
          message_content: resolvedContent,
          provider: 'textify',
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: err.code
        })
        return json({ error: err.code, detail: err.message }, 502)
      }
      throw err
    }

    const logRow = {
      patient_id,
      physio_id: patient.physio_id,
      clinic_id: patient.clinic_id,
      direction: 'outbound',
      channel: 'sms',
      message_type,
      message_content: resolvedContent,
      provider: 'textify',
      provider_message_id: result.providerMessageId,
      status: result.status,
      scheduled_at: scheduled_at ?? null,
      sent_at: scheduled_at ? null : new Date().toISOString(),
      idempotency_key: idempotencyKey
    }

    const { error: logError } = await serviceClient.from('communication_logs').insert(logRow)
    if (logError) console.error('Failed to log SMS:', logError.message)

    return json({ success: true, provider_message_id: result.providerMessageId, status: result.status })
  } catch (err) {
    console.error('textify-sms error:', err.message)
    return json({ error: err.message }, 500)
  }
})
