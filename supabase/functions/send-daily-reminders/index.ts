import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendSms, TextifyError } from '../_shared/textify.ts'
import { getSmsTemplates } from '../_shared/sms-templates.ts'

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
  exerciseText: string,
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
    const eatHour = (nowUTC.getUTCHours() + 3) % 24
    const eatMinute = nowUTC.getUTCMinutes()
    const currentMinutesOfDay = eatHour * 60 + eatMinute

    console.log(`Current EAT time: ${eatHour}:${String(eatMinute).padStart(2, '0')}`)

    // Date in EAT (UTC+3) — used for the once-per-day guard and logs
    const today = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch all active patients
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

    // Filter patients whose reminder time has already passed today.
    // The once-per-day guard below (adherence_logs) ensures each patient is
    // notified exactly once per day, so any run at or after the reminder
    // time delivers — regardless of cron cadence. Failed sends are retried
    // on the next run because the guard is only inserted on success.
    const patientsToNotify = (patients ?? []).filter((patient: any) => {
      if (!patient.reminder_time) {
        // Default to 8am if no reminder time set
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

      // Once-per-day guard: skip if this patient already received a reminder today
      const { data: existingLog, error: guardError } = await supabase
        .from('adherence_logs')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('log_date', today)
        .maybeSingle()

      // If the guard check itself fails, fail safe: skip this run rather than
      // risk sending a duplicate reminder. A later cron run will retry.
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

      // Send via an approved WhatsApp template (required for outbound
      // business-initiated messages outside the 24h window).
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

      // Free-form fallback body used when the template is not yet approved.
      const fallbackBody = lang === 'sw'
        ? `${getGreeting(eatHour)}, hii ni kumbusho kutoka ${clinicName}. Mazoezi yako leo: ${exerciseText}`
        : `Hello ${patient.full_name}, this is your reminder from ${clinicName}. Your exercises today: ${exerciseText}`

      // Both reminder templates have an IMAGE header, so Meta requires a
      // matching header component (public image link) before the body params.
      const components: any[] = []
      const headerImageUrl = Deno.env.get('META_TEMPLATE_HEADER_IMAGE_URL')
      if (headerImageUrl) {
        components.push({
          type: 'header',
          parameters: [{ type: 'image', image: { link: headerImageUrl } }]
        })
      }
      components.push({ type: 'body', parameters })

      // Primary channel: WhatsApp (template, then free-form text).
      // Continuity Engine: if WhatsApp cannot be reached at all, fall back to
      // Textify SMS so the reminder still reaches the patient.
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

      // SMS fallback only when WhatsApp completely failed.
      if (!reached) {
        const smsOk = await smsFallback(supabase, patient, clinicName, exerciseText, today)
        if (smsOk) {
          reached = true
          smsFallbacks++
        }
      }

      // Could not reach the patient on any channel — retry next cron run.
      if (!reached) {
        console.log(`Could not reach patient ${patient.id} on any channel — will retry`)
        continue
      }

      if (wamid) {
        console.log(`Reminder sent to patient ${patient.id}`)

        // Existing WhatsApp chat log.
        await supabase.from('message_logs').insert({
          patient_id: patient.id,
          direction: 'outbound',
          message_type: 'reminder',
          content: `${clinicName}: ${exerciseText}`
        })

        // Continuity Engine unified log (WhatsApp channel).
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

      // Insert adherence log — ignore if already exists for today
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

    console.log(`Total messages sent: ${sent}`)
    console.log(`SMS fallbacks: ${smsFallbacks}; SMS follow-ups: ${smsFollowups}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        sms_fallbacks: smsFallbacks,
        sms_followups: smsFollowups,
        current_eat_time: `${eatHour}:${String(eatMinute).padStart(2, '0')}`,
        total_active_patients: patients?.length ?? 0,
        patients_notified: sent
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
