import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

      try {
        await sendWhatsAppTemplate(
          patient.phone_number,
          templateName,
          lang,
          components
        )
      } catch (err) {
        console.error(`Template send failed for patient ${patient.id}: ${err.message} — trying free-form fallback`)
        try {
          await sendWhatsAppText(patient.phone_number, fallbackBody)
        } catch (fallbackErr) {
          console.error(`Free-form fallback failed for patient ${patient.id}: ${fallbackErr.message}`)
          continue
        }
      }

      console.log(`Reminder sent to patient ${patient.id}`)

      await supabase.from('message_logs').insert({
        patient_id: patient.id,
        direction: 'outbound',
        message_type: 'reminder',
        content: `${clinicName}: ${exerciseText}`
      })

      // Exercise videos are intentionally NOT auto-sent here. The reminder
      // template carries a "Watch Video" quick-reply button; handle-inbound
      // sends the patient's videos on demand when they tap it, so patients
      // aren't flooded with every assigned video on every daily reminder.

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

    console.log(`Total messages sent: ${sent}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent,
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
