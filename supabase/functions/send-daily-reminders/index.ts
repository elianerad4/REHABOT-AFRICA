import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isScheduledToday, formatEatDate, formatDosage, buildExerciseListLines } from '../_shared/stroke.js'

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

async function sendWhatsAppText(to: string, message: string) {
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
        text: { preview_url: false, body: message }
      })
    }
  )
  const result = await response.json()
  console.log('Meta API response:', JSON.stringify(result))
  if (!response.ok || result.error) {
    throw new Error(
      `Meta text error: ${result.error?.message ?? `HTTP ${response.status}`}`
    )
  }
  return result
}

function sanitizeVideoUrl(link: string): string {
  return link
    .replace(/ /g, '%20')
    .replace(/&/g, '%26')
    .replace(/\+/g, '%2B')
    .replace(/,/g, '%2C')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/'/g, '%27')
    .replace(/#/g, '%23')
}

async function sendWhatsAppVideo(to: string, videoUrl: string, caption: string) {
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
          video: {
            link: sanitizeVideoUrl(videoUrl),
            caption: caption
          }
        })
      }
    )
    const result = await response.json()
    console.log('Video send response:', JSON.stringify(result))
    if (!response.ok || result.error) {
      console.error(`Video send failed (${caption}): ${result.error?.message ?? `HTTP ${response.status}`}`)
      return null
    }
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

async function sendProgrammeTemplate(to: string, params: Record<string, string>, lang = 'en') {
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
          name: lang === 'sw' ? 'stroke_programme_daily_swahili' : 'stroke_programme_daily',
          language: { code: lang },
          components: [{
            type: 'body',
            parameters: Object.entries(params).map(([parameter_name, text]) => ({
              type: 'text',
              parameter_name,
              text
            }))
          }]
        }
      })
    }
  )
  const result = await response.json()
  console.log('Meta API response:', JSON.stringify(result))
  if (!response.ok || result.error) {
    throw new Error(
      `Meta template error (stroke_programme_daily): ${result.error?.message ?? `HTTP ${response.status}`}`
    )
  }
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
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

    // Fetch all active rehabilitation programmes with their exercises.
    const { data: programmes } = await supabase
      .from('rehabilitation_programmes')
      .select(`
        id, patient_id, name, start_date, end_date,
        programme_exercises (
          id, sets, repetitions, duration_seconds, frequency, days_of_week,
          laterality, instructions, is_active,
          exercises ( name_en, name_sw, video_url )
        )
      `)
      .eq('status', 'active')

    const programmeByPatient = new Map<string, any>()
    for (const p of programmes ?? []) {
      programmeByPatient.set(p.patient_id, p)
    }

    const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay()

    // Filter patients whose reminder time has already passed today.
    // The once-per-day guards below (adherence_logs / exercise_completion_logs)
    // ensure each patient is notified exactly once per day, so any run at or
    // after the reminder time delivers — regardless of cron cadence. Failed
    // sends are retried on the next run because the guards are only inserted
    // on success.
    const patientsToNotify = (patients ?? []).filter((patient: any) => {
      if (!patient.reminder_time) {
        // Default to 8am if no reminder time set
        const defaultReminder = 8 * 60
        const matches = defaultReminder <= currentMinutesOfDay
        console.log(
          `Patient ${patient.full_name}: reminder=default-08:00, now=${eatHour}:${String(eatMinute).padStart(2, '0')}, matches=${matches}`
        )
        return matches
      }
      const [h, m] = patient.reminder_time.split(':').map((n: string) => parseInt(n))
      const reminderMinutesOfDay = (h || 0) * 60 + (m || 0)
      const matches = reminderMinutesOfDay <= currentMinutesOfDay
      console.log(
        `Patient ${patient.full_name}: reminder=${patient.reminder_time}, now=${eatHour}:${String(eatMinute).padStart(2, '0')}, matches=${matches}`
      )
      return matches
    })

    console.log(`Patients to notify this hour: ${patientsToNotify.length}`)

    let sent = 0

    for (const patient of patientsToNotify) {
      const lang = patient.language

      // ------------------------------------------------------------------
      // Active rehabilitation programme path
      // ------------------------------------------------------------------
      const programme = programmeByPatient.get(patient.id)
      if (programme) {
        const inDateRange = (!programme.start_date || today >= programme.start_date) &&
          (!programme.end_date || today <= programme.end_date)
        if (!inDateRange) {
          console.log(`Programme for ${patient.full_name} not in date range — skipping`)
          continue
        }

        const todaysExercises = (programme.programme_exercises ?? []).filter((pe: any) => isScheduledToday(pe, todayDow))
        if (todaysExercises.length === 0) {
          console.log(`No exercises scheduled for ${patient.full_name} today — skipping`)
          continue
        }

        const { data: existingCompletion } = await supabase
          .from('exercise_completion_logs')
          .select('id')
          .eq('patient_id', patient.id)
          .eq('log_date', today)
          .limit(1)

        if (existingCompletion && existingCompletion.length > 0) {
          console.log(`Programme already sent to ${patient.full_name} today — skipping`)
          continue
        }

        const exerciseList = buildExerciseListLines(todaysExercises, lang)

        console.log(`Sending daily programme to ${patient.full_name} at ${patient.phone_number}`)

        try {
          await sendProgrammeTemplate(patient.phone_number, {
            customer_name: patient.full_name.split(' ')[0],
            programme_date: formatEatDate(today),
            exercise_list: exerciseList
          }, lang)
        } catch (err) {
          console.error(`Failed to send programme to ${patient.full_name}: ${err.message}`)
          continue
        }

        console.log(`Programme sent to ${patient.full_name}`)

        await supabase.from('message_logs').insert({
          patient_id: patient.id,
          direction: 'outbound',
          message_type: 'programme_reminder',
          content: `Today's programme:${exerciseList}`
        })

        // Send exercise videos for today's exercises that have video URLs
        const todaysVideos = todaysExercises.filter((pe: any) => pe.exercises?.video_url)

        if (todaysVideos.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000))

          for (const pe of todaysVideos) {
            const name = lang === 'sw'
              ? (pe.exercises.name_sw ?? pe.exercises.name_en)
              : pe.exercises.name_en
            const caption = `${name} - ${formatDosage(pe)}`

            console.log(`Sending video for ${name} to ${patient.full_name}`)

            await sendWhatsAppVideo(
              patient.phone_number,
              pe.exercises.video_url,
              caption
            )

            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        await supabase.from('exercise_completion_logs').insert(
          todaysExercises.map((pe: any) => ({
            patient_id: patient.id,
            programme_id: programme.id,
            programme_exercise_id: pe.id,
            log_date: today,
            status: 'pending'
          }))
        )

        sent++
        continue
      }

      // Once-per-day guard: skip if this patient already received a reminder today
      const { data: existingLog } = await supabase
        .from('adherence_logs')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('log_date', today)
        .maybeSingle()

      if (existingLog) {
        console.log(`Already reminded ${patient.full_name} today — skipping`)
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

      console.log(`Sending to ${patient.full_name} at ${patient.phone_number}`)

      // Send via an approved WhatsApp template (required for outbound
      // business-initiated messages outside the 24h window).
      const templateName = lang === 'sw' ? 'daily_reminder_swahili' : 'englishreminder'

      const reminderTime = (patient.reminder_time ?? '').substring(0, 5) || '08:00'

      const parameters = lang === 'sw'
        ? [getGreeting(eatHour), clinicName, exerciseText]
          .map((text) => ({ type: 'text', text }))
        : [
            { type: 'text', parameter_name: 'customer_name', text: patient.full_name },
            { type: 'text', parameter_name: 'reminder_time', text: reminderTime },
            { type: 'text', parameter_name: 'exercise_list', text: exerciseText }
          ]

      try {
        await sendWhatsAppTemplate(
          patient.phone_number,
          templateName,
          lang,
          [{
            type: 'body',
            parameters
          }]
        )
      } catch (err) {
        console.error(`Failed to send reminder to ${patient.full_name}: ${err.message}`)
        continue
      }

      console.log(`Reminder sent to ${patient.full_name}`)

      await supabase.from('message_logs').insert({
        patient_id: patient.id,
        direction: 'outbound',
        message_type: 'reminder',
        content: `${clinicName}: ${exerciseText}`
      })

      // Send exercise videos for exercises that have video URLs
      const exercisesWithVideos = patient.patient_exercises.filter(
        (pe: any) => pe.exercises?.video_url
      )

      if (exercisesWithVideos.length > 0) {
        // Wait 2 seconds after text message before sending videos
        await new Promise(resolve => setTimeout(resolve, 2000))

        for (const pe of exercisesWithVideos) {
          const exerciseName = lang === 'sw'
            ? pe.exercises.name_sw
            : pe.exercises.name_en

          const caption = lang === 'sw'
            ? `${exerciseName} - Mara ${pe.sets} x ${pe.reps}`
            : `${exerciseName} - ${pe.sets} sets x ${pe.reps} reps`

          console.log(`Sending video for ${exerciseName} to ${patient.full_name}`)

          await sendWhatsAppVideo(
            patient.phone_number,
            pe.exercises.video_url,
            caption
          )

          // Wait 1 second between each video to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
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
        console.log(`Adherence log already exists for ${patient.full_name} today — skipping`)
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
