import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendSms, TextifyError } from '../_shared/textify.ts'
import { getSmsTemplates } from '../_shared/sms-templates.ts'
import {
  eatToday,
  eatHourMinute,
  isReminderDue,
  formatProgrammeMessage,
  exercisesWithVideos
} from '../_shared/programme.ts'

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  language: string,
  components: any[]
) {
  const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID')!
  const accessToken = Deno.env.get('META_ACCESS_TOKEN')!
  const formattedTo = to.replace('+', '')

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components
        }
      })
    }
  )
  const result = await response.json()
  console.log('Meta API response:', JSON.stringify(result))
  if (!response.ok || result.error) {
    throw new Error(
      `Meta template error (${templateName}): ${result.error?.message ?? `HTTP ${response.status}`}`
    )
  }
  return result
}

// Free-form text fallback. Only deliverable inside WhatsApp's 24-hour customer
// service window (i.e. the patient messaged us in the last 24h), which is
// exactly the gap while the reminder templates are still pending approval.
async function sendWhatsAppText(to: string, body: string) {
  const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID')!
  const accessToken = Deno.env.get('META_ACCESS_TOKEN')!
  const formattedTo = to.replace('+', '')

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: { preview_url: false, body }
      })
    }
  )
  const result = await response.json()
  console.log('Free-form text response:', JSON.stringify(result))
  if (!response.ok || result.error) {
    throw new Error(
      `Meta free-form error: ${result.error?.message ?? `HTTP ${response.status}`}`
    )
  }
  return result
}

// Normalizes a video URL for WhatsApp (same logic as handle-inbound).
function sanitizeVideoUrl(link: string): string {
  try {
    const url = new URL(link)
    url.pathname = url.pathname
      .split('/')
      .map((segment) => {
        let decoded = segment
        try { decoded = decodeURIComponent(segment) } catch { /* leave as-is */ }
        return encodeURIComponent(decoded)
      })
      .join('/')
    return url.toString()
  } catch {
    return link
  }
}

const MAX_VIDEO_BYTES = 16 * 1024 * 1024

async function getVideoSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const len = res.headers.get('content-length')
    return len ? parseInt(len, 10) : null
  } catch {
    return null
  }
}

async function sendWhatsAppVideo(to: string, link: string, caption?: string) {
  try {
    const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID')!
    const accessToken = Deno.env.get('META_ACCESS_TOKEN')!
    const formattedTo = to.replace('+', '')

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'video',
          video: { link: sanitizeVideoUrl(link), caption }
        })
      }
    )
    const result = await response.json()
    if (!response.ok || result.error) {
      console.error(`Video send failed (${caption}): ${result.error?.message ?? `HTTP ${response.status}`}`)
      return null
    }
    console.log(`Video sent (${caption}), id:`, result.messages?.[0]?.id)
    return result
  } catch (err) {
    console.error(`Video send error (${caption}): ${err.message}`)
    return null
  }
}

function getGreeting(eatHour: number): string {
  if (eatHour >= 5 && eatHour <= 11) return 'Habari za asubuhi'
  if (eatHour >= 12 && eatHour <= 16) return 'Habari za mchana'
  if (eatHour >= 17 && eatHour <= 20) return 'Habari za jioni'
  return 'Usiku mwema'
}

// Configurable fallback threshold. Default 120 minutes: a patient who has not
// responded 2 hours after their WhatsApp reminder receives an SMS nudge. This
// is a "no response" signal, NOT a claim that WhatsApp failed to deliver.
function getFallbackAfterMinutes(): number {
  const raw = Deno.env.get('FALLBACK_AFTER_MINUTES')
  const n = parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 120
}

// Best-effort insertion into communication_logs (never throws into the loop).
async function logCommunication(supabase: any, row: Record<string, any>) {
  const { error } = await supabase.from('communication_logs').insert(row)
  if (error) console.error('communication_logs insert failed:', error.message)
}

// SMS fallback with deduplication. Only a SUCCESSFUL send carries the
// idempotency_key, so a failed attempt leaves no trace that would suppress a
// retry on the next cron run. Returns true if the patient was reached by SMS.
async function smsFallback(
  supabase: any,
  patient: any,
  clinicName: string,
  _exerciseText: string,
  today: string
): Promise<boolean> {
  if (!Deno.env.get('TEXTIFY_API_KEY')?.trim()) {
    console.warn('TEXTIFY_API_KEY not set — skipping SMS fallback')
    return false
  }
  const t = getSmsTemplates(patient.language)
  const content = t.exerciseReminder({ name: patient.full_name, clinic: clinicName })
  const idempotencyKey = `sms:exercise_reminder:${patient.id}:${today}`

  const { data: existing } = await supabase
    .from('communication_logs')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing) return true

  try {
    const result = await sendSms({ to: patient.phone_number, content, idempotencyKey })
    await logCommunication(supabase, {
      patient_id: patient.id,
      physio_id: patient.physio_id ?? null,
      clinic_id: patient.clinic_id ?? null,
      direction: 'outbound',
      channel: 'sms',
      message_type: 'exercise_reminder',
      message_content: content,
      provider: 'textify',
      provider_message_id: result.providerMessageId,
      status: result.status,
      sent_at: new Date().toISOString(),
      idempotency_key: idempotencyKey
    })
    return true
  } catch (err) {
    const code = err instanceof TextifyError ? err.code : 'provider_error'
    console.error(`SMS fallback failed for patient ${patient.id}: ${code}`)
    await logCommunication(supabase, {
      patient_id: patient.id,
      physio_id: patient.physio_id ?? null,
      clinic_id: patient.clinic_id ?? null,
      direction: 'outbound',
      channel: 'sms',
      message_type: 'exercise_reminder',
      message_content: content,
      provider: 'textify',
      status: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: code
    })
    return false
  }
}

// Sends the demonstration video for each prescribed exercise in a session.
// Best-effort: videos are free-form messages only deliverable inside the 24h
// customer-service window, so failures are logged (never fatal to the
// reminder). The patient can always request videos on demand via the existing
// inbound "video" keyword flow.
async function sendSessionVideos(
  supabase: any,
  session: any,
  patient: any,
  snapshot: any,
  lang: string
): Promise<void> {
  const videos = exercisesWithVideos(snapshot)
  for (const ex of videos) {
    const name = lang === 'sw' ? (ex.name_sw ?? ex.name_en) : ex.name_en
    const caption = name ?? 'Exercise demonstration'

    const size = await getVideoSize(ex.video_url!)
    if (size !== null && size > MAX_VIDEO_BYTES) {
      console.error(`Video too large for WhatsApp (${(size / 1048576).toFixed(1)}MB > 16MB): ${name} — ${ex.video_url}`)
      await supabase.from('message_logs').insert({
        patient_id: session.patient_id, direction: 'outbound',
        message_type: 'exercise_video', status: 'failed',
        content: `${name}: video exceeds WhatsApp's 16MB limit (${(size / 1048576).toFixed(1)}MB) — ${ex.video_url}`
      })
      continue
    }

    const sendResult = await sendWhatsAppVideo(patient.phone_number, ex.video_url!, caption)
    await supabase.from('message_logs').insert({
      patient_id: session.patient_id, direction: 'outbound',
      message_type: 'exercise_video', status: sendResult ? 'sent' : 'failed',
      twilio_sid: sendResult?.messages?.[0]?.id ?? null,
      content: ex.video_url
    })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  // This function is public (verify_jwt=false in config.toml, required since
  // Supabase's scheduler doesn't send a user JWT) and, unauthenticated, sends
  // real WhatsApp messages to every active patient across every clinic. Gate
  // it with a shared secret only the scheduled job knows, so it can't be
  // triggered by anyone who finds the URL.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get current time in EAT (UTC+3)
    const nowUTC = new Date()
    const eat = eatHourMinute(nowUTC)
    const eatHour = eat.hour
    const eatMinute = eat.minute
    const currentMinutesOfDay = eat.minutesOfDay

    console.log(`Current EAT time: ${eatHour}:${String(eatMinute).padStart(2, '0')}`)

    // Date in EAT (UTC+3) — used for the once-per-day guard and logs
    const today = eatToday(nowUTC)

    // ---------------------------------------------------------------------
    // Phase 1 — Weekly programme sessions (per-day prescriptions).
    // Each active programme's session for today sends only the exercises
    // prescribed for that specific day. Idempotent via an atomic claim on the
    // session's reminder_status.
    // ---------------------------------------------------------------------
    let programmeSent = 0

    const { data: activeProgrammes } = await supabase
      .from('programmes')
      .select('id, patient_id, name, language, timezone, reminder_time')
      .eq('status', 'active')

    const activeProgrammeById = new Map((activeProgrammes ?? []).map((p: any) => [p.id, p]))
    const activeProgrammePatientIds = new Set((activeProgrammes ?? []).map((p: any) => p.patient_id))

    // Reclaim any session stuck in 'sending' from a crashed worker (> 30 min),
    // so a later run can retry it safely.
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    await supabase
      .from('programme_sessions')
      .update({ reminder_status: 'failed', reminder_failure_reason: 'stale_sending_reclaimed' })
      .eq('session_date', today)
      .eq('reminder_status', 'sending')
      .lt('reminder_sending_at', staleCutoff)

    const { data: dueSessions } = await supabase
      .from('programme_sessions')
      .select('id, programme_id, patient_id, reminder_time, reminder_attempts, snapshot, patients(full_name, phone_number, physio_id, clinic_id, clinics(name))')
      .eq('session_date', today)
      .eq('is_rest_day', false)
      .eq('reminder_enabled', true)
      .eq('status', 'scheduled')
      .in('reminder_status', ['pending', 'failed'])

    console.log(`Active programmes: ${activeProgrammes?.length ?? 0}; due sessions today: ${dueSessions?.length ?? 0}`)

    for (const session of dueSessions ?? []) {
      const prog = activeProgrammeById.get(session.programme_id)
      if (!prog) continue // programme is not active
      const patient = session.patients
      if (!patient) continue

      const reminderTime = session.reminder_time ?? prog.reminder_time
      if (!isReminderDue(reminderTime, currentMinutesOfDay)) continue

      const lang = prog.language || patient.language || 'en'

      // Atomic claim — only one worker transitions this session to 'sending'.
      const { data: claimed, error: claimError } = await supabase
        .from('programme_sessions')
        .update({
          reminder_status: 'sending',
          reminder_attempts: (session.reminder_attempts ?? 0) + 1,
          reminder_sending_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .in('reminder_status', ['pending', 'failed'])
        .select('id')

      if (claimError || !claimed || claimed.length === 0) continue // already claimed

      const snapshot = session.snapshot ?? {}
      const clinicName = patient.clinics?.name ?? 'Rehabot Africa'
      const { exerciseText, fallbackBody } = formatProgrammeMessage({
        lang,
        patientName: patient.full_name,
        clinicName,
        greeting: getGreeting(eatHour),
        snapshot
      })

      const templateName = lang === 'sw' ? 'daily_reminder_swahili' : 'englishreminder'
      const parameters = lang === 'sw'
        ? [
            { type: 'text', parameter_name: 'greeting', text: getGreeting(eatHour) },
            { type: 'text', parameter_name: 'clinic_name', text: clinicName },
            { type: 'text', parameter_name: 'exercise_list', text: exerciseText }
          ]
        : [
            { type: 'text', parameter_name: 'customer_name', text: patient.full_name },
            { type: 'text', parameter_name: 'reminder_time', text: (reminderTime ?? '').substring(0, 5) || '08:00' },
            { type: 'text', parameter_name: 'exercise_list', text: exerciseText }
          ]

      const components: any[] = []
      const headerImageUrl = Deno.env.get('META_TEMPLATE_HEADER_IMAGE_URL')
      if (headerImageUrl) {
        components.push({
          type: 'header',
          parameters: [{ type: 'image', image: { link: headerImageUrl } }]
        })
      }
      components.push({ type: 'body', parameters })

      let reached = false
      let wamid: string | null = null

      try {
        const templateResult = await sendWhatsAppTemplate(patient.phone_number, templateName, lang, components)
        wamid = templateResult?.messages?.[0]?.id ?? null
        reached = true
      } catch (err) {
        console.error(`Programme template send failed for session ${session.id}: ${err.message} — trying free-form fallback`)
        try {
          const textResult = await sendWhatsAppText(patient.phone_number, fallbackBody)
          wamid = textResult?.messages?.[0]?.id ?? null
          reached = true
        } catch (fallbackErr) {
          console.error(`Programme free-form fallback failed for session ${session.id}: ${fallbackErr.message}`)
        }
      }

      if (!reached) {
        const smsOk = await smsFallback(
          supabase,
          { id: session.patient_id, full_name: patient.full_name, phone_number: patient.phone_number, language: lang, physio_id: patient.physio_id, clinic_id: patient.clinic_id },
          clinicName,
          exerciseText,
          today
        )
        if (smsOk) {
          reached = true
        } else {
          await supabase
            .from('programme_sessions')
            .update({ reminder_status: 'failed', reminder_failure_reason: 'all_channels_failed' })
            .eq('id', session.id)
          await logCommunication(supabase, {
            patient_id: session.patient_id,
            physio_id: patient.physio_id ?? null,
            clinic_id: patient.clinic_id ?? null,
            direction: 'outbound',
            channel: 'whatsapp',
            message_type: 'exercise_reminder',
            message_content: exerciseText,
            provider: 'meta',
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_reason: 'all_channels_failed'
          })
          continue
        }
      }

      // Mark the session reminder as sent (source of truth for idempotency).
      await supabase
        .from('programme_sessions')
        .update({
          reminder_status: 'sent',
          reminder_sent_at: new Date().toISOString(),
          reminder_provider_message_id: wamid
        })
        .eq('id', session.id)

      if (wamid) {
        await supabase.from('message_logs').insert({
          patient_id: session.patient_id,
          direction: 'outbound',
          message_type: 'reminder',
          content: `${clinicName}: ${exerciseText}`
        })
        await logCommunication(supabase, {
          patient_id: session.patient_id,
          physio_id: patient.physio_id ?? null,
          clinic_id: patient.clinic_id ?? null,
          direction: 'outbound',
          channel: 'whatsapp',
          message_type: 'exercise_reminder',
          message_content: exerciseText,
          provider: 'meta',
          provider_message_id: wamid,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      }

      // Adherence log (once per patient/day) — also feeds existing reports.
      const { error: adherenceError } = await supabase
        .from('adherence_logs')
        .insert({
          patient_id: session.patient_id,
          log_date: today,
          reply_received: false,
          confirmed: false,
          session_id: session.id
        })
      if (adherenceError) {
        console.log(`Adherence log already exists for patient ${session.patient_id} today — skipping`)
      }

      // Demonstration videos (best-effort).
      await sendSessionVideos(supabase, session, patient, snapshot, lang)

      programmeSent++
    }

    // ---------------------------------------------------------------------
    // Phase 2 — Legacy daily reminders for active patients WITHOUT an active
    // weekly programme (their once-daily exercise list). Preserved unchanged,
    // minus patients who are now covered by an active programme.
    // ---------------------------------------------------------------------
    const { data: patients, error } = await supabase
      .from('patients')
      .select(`
        id, full_name, phone_number, language, diagnosis, reminder_time,
        physio_id, clinic_id,
        clinics ( name ),
        patient_exercises (
          sets, reps,
          exercises ( name_en, name_sw, video_url )
        )
      `)
      .eq('status', 'active')

    if (error) throw error

    console.log(`Total active patients: ${patients?.length ?? 0}`)

    const patientsToNotify = (patients ?? []).filter((patient: any) => {
      if (activeProgrammePatientIds.has(patient.id)) return false
      if (!patient.reminder_time) {
        const defaultReminder = 8 * 60
        return defaultReminder <= currentMinutesOfDay
      }
      const [h, m] = patient.reminder_time.split(':').map((n: string) => parseInt(n))
      const reminderMinutesOfDay = (h || 0) * 60 + (m || 0)
      return reminderMinutesOfDay <= currentMinutesOfDay
    })

    console.log(`Patients to notify this hour: ${patientsToNotify.length}`)

    let sent = 0
    let smsFallbacks = 0

    for (const patient of patientsToNotify) {
      const lang = patient.language

      const { data: existingLog, error: guardError } = await supabase
        .from('adherence_logs')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('log_date', today)
        .maybeSingle()

      if (guardError) {
        console.error(`Guard query failed for patient ${patient.id} — skipping this run to avoid a duplicate: ${guardError.message}`)
        continue
      }

      if (existingLog) {
        console.log(`Already reminded patient ${patient.id} today — skipping`)
        continue
      }

      const exerciseList = patient.patient_exercises
        .filter((pe: any) => pe.exercises)
        .map((pe: any) => {
          const name = lang === 'sw'
            ? pe.exercises.name_sw
            : pe.exercises.name_en
          return `• ${name} — ${pe.sets} sets x ${pe.reps} reps`
        })
        .join(' • ')

      const hasExercises = exerciseList.length > 0
      const clinicName = patient.clinics?.name ?? 'Rehabot Africa'
      const exerciseText = hasExercises ? exerciseList : 'No exercises assigned.'

      console.log(`Sending reminder to patient ${patient.id}`)

      const templateName = lang === 'sw' ? 'daily_reminder_swahili' : 'englishreminder'

      const reminderTime = (patient.reminder_time ?? '').substring(0, 5) || '08:00'

      const parameters = lang === 'sw'
        ? [
            { type: 'text', parameter_name: 'greeting', text: getGreeting(eatHour) },
            { type: 'text', parameter_name: 'clinic_name', text: clinicName },
            { type: 'text', parameter_name: 'exercise_list', text: exerciseText }
          ]
        : [
            { type: 'text', parameter_name: 'customer_name', text: patient.full_name },
            { type: 'text', parameter_name: 'reminder_time', text: reminderTime },
            { type: 'text', parameter_name: 'exercise_list', text: exerciseText }
          ]

      const fallbackBody = lang === 'sw'
        ? `${getGreeting(eatHour)}, hii ni kumbusho kutoka ${clinicName}. Mazoezi yako leo: ${exerciseText}`
        : `Hello ${patient.full_name}, this is your reminder from ${clinicName}. Your exercises today: ${exerciseText}`

      const components: any[] = []
      const headerImageUrl = Deno.env.get('META_TEMPLATE_HEADER_IMAGE_URL')
      if (headerImageUrl) {
        components.push({
          type: 'header',
          parameters: [{ type: 'image', image: { link: headerImageUrl } }]
        })
      }
      components.push({ type: 'body', parameters })

      let reached = false
      let wamid: string | null = null

      try {
        const templateResult = await sendWhatsAppTemplate(
          patient.phone_number,
          templateName,
          lang,
          components
        )
        wamid = templateResult?.messages?.[0]?.id ?? null
        reached = true
      } catch (err) {
        console.error(`Template send failed for patient ${patient.id}: ${err.message} — trying free-form fallback`)
        try {
          const textResult = await sendWhatsAppText(patient.phone_number, fallbackBody)
          wamid = textResult?.messages?.[0]?.id ?? null
          reached = true
        } catch (fallbackErr) {
          console.error(`Free-form fallback failed for patient ${patient.id}: ${fallbackErr.message}`)
        }
      }

      if (!reached) {
        const smsOk = await smsFallback(supabase, patient, clinicName, exerciseText, today)
        if (smsOk) {
          reached = true
          smsFallbacks++
        }
      }

      if (!reached) {
        console.log(`Could not reach patient ${patient.id} on any channel — will retry`)
        continue
      }

      if (wamid) {
        console.log(`Reminder sent to patient ${patient.id}`)

        await supabase.from('message_logs').insert({
          patient_id: patient.id,
          direction: 'outbound',
          message_type: 'reminder',
          content: `${clinicName}: ${exerciseText}`
        })

        await logCommunication(supabase, {
          patient_id: patient.id,
          physio_id: patient.physio_id ?? null,
          clinic_id: patient.clinic_id ?? null,
          direction: 'outbound',
          channel: 'whatsapp',
          message_type: 'exercise_reminder',
          message_content: exerciseText,
          provider: 'meta',
          provider_message_id: wamid,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      }

      const { error: adherenceError } = await supabase
        .from('adherence_logs')
        .insert({
          patient_id: patient.id,
          log_date: today,
          reply_received: false,
          confirmed: false
        })

      if (adherenceError) {
        console.log(`Adherence log already exists for patient ${patient.id} today — skipping`)
      }

      sent++
    }

    // ---------------------------------------------------------------------
    // Continuity Engine — time-based SMS nudge ("missed follow-up").
    // Patients whose reminder went out earlier today but who have not yet
    // replied receive one SMS nudge after FALLBACK_AFTER_MINUTES. Deduplicated
    // per patient/day via idempotency_key.
    // ---------------------------------------------------------------------
    let smsFollowups = 0
    try {
      if (!Deno.env.get('TEXTIFY_API_KEY')?.trim()) {
        console.warn('TEXTIFY_API_KEY not set — skipping missed-follow-up SMS phase')
      } else {
      const fallbackAfterMinutes = getFallbackAfterMinutes()
      const cutoffIso = new Date(Date.now() - fallbackAfterMinutes * 60 * 1000).toISOString()

      const { data: pendingRows } = await supabase
        .from('adherence_logs')
        .select('patient_id')
        .eq('log_date', today)
        .eq('confirmed', false)
        .eq('reply_received', false)
        .lt('created_at', cutoffIso)

      const pendingIds = [...new Set((pendingRows ?? []).map((r: any) => r.patient_id))]
      if (pendingIds.length > 0) {
        const { data: pendingPatients } = await supabase
          .from('patients')
          .select('id, full_name, phone_number, language, physio_id, clinic_id, clinics(name)')
          .eq('status', 'active')
          .in('id', pendingIds)

        for (const p of pendingPatients ?? []) {
          const idempotencyKey = `sms:missed_follow_up:${p.id}:${today}`
          const { data: existing } = await supabase
            .from('communication_logs')
            .select('id')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle()
          if (existing) continue

          const t = getSmsTemplates(p.language)
          const clinic = p.clinics?.name ?? 'Rehabot Africa'
          const content = t.missedFollowUp({ name: p.full_name, clinic })

          try {
            const result = await sendSms({ to: p.phone_number, content, idempotencyKey })
            await logCommunication(supabase, {
              patient_id: p.id,
              physio_id: p.physio_id ?? null,
              clinic_id: p.clinic_id ?? null,
              direction: 'outbound',
              channel: 'sms',
              message_type: 'missed_follow_up',
              message_content: content,
              provider: 'textify',
              provider_message_id: result.providerMessageId,
              status: result.status,
              sent_at: new Date().toISOString(),
              idempotency_key: idempotencyKey
            })
            smsFollowups++
          } catch (err) {
            const code = err instanceof TextifyError ? err.code : 'provider_error'
            console.error(`Missed follow-up SMS failed for patient ${p.id}: ${code}`)
            await logCommunication(supabase, {
              patient_id: p.id,
              physio_id: p.physio_id ?? null,
              clinic_id: p.clinic_id ?? null,
              direction: 'outbound',
              channel: 'sms',
              message_type: 'missed_follow_up',
              message_content: content,
              provider: 'textify',
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: code
            })
          }
        }
      }
      }
    } catch (err) {
      console.error('Missed follow-up phase error:', err.message)
    }

    console.log(`Total programme reminders sent: ${programmeSent}`)
    console.log(`Total legacy reminders sent: ${sent}`)
    console.log(`SMS fallbacks: ${smsFallbacks}; SMS follow-ups: ${smsFollowups}`)

    return new Response(
      JSON.stringify({
        success: true,
        programme_sent: programmeSent,
        sent,
        sms_fallbacks: smsFallbacks,
        sms_followups: smsFollowups,
        current_eat_time: `${eatHour}:${String(eatMinute).padStart(2, '0')}`,
        total_active_patients: patients?.length ?? 0,
        patients_notified: programmeSent + sent
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
