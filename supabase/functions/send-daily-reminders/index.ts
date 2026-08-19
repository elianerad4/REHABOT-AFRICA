import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function sendWhatsApp(to: string, message: string) {
  const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID')!
  const accessToken = Deno.env.get('META_ACCESS_TOKEN')!
  const formattedTo = to.replace('+', '')

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
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

    // Filter patients whose reminder_time falls in the current 5-minute window.
    // The cron runs every 5 minutes, so each patient is picked up once, at the
    // first run at/after their exact reminder time (minutes included).
    const today = new Date().toISOString().split('T')[0]
    const patientsToNotify = (patients ?? []).filter((patient: any) => {
      if (!patient.reminder_time) {
        // Default to 8am if no reminder time set
        return eatHour === 8 && eatMinute < 5
      }
      const [h, m] = patient.reminder_time.split(':').map((n: string) => parseInt(n))
      const reminderMinutesOfDay = (h || 0) * 60 + (m || 0)
      const matches = reminderMinutesOfDay > currentMinutesOfDay - 5
        && reminderMinutesOfDay <= currentMinutesOfDay
      console.log(
        `Patient ${patient.full_name}: reminder=${patient.reminder_time}, now=${eatHour}:${String(eatMinute).padStart(2, '0')}, matches=${matches}`
      )
      return matches
    })

    console.log(`Patients to notify this hour: ${patientsToNotify.length}`)

    let sent = 0

    for (const patient of patientsToNotify) {
      const lang = patient.language

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
        .join('\n')

      const hasExercises = exerciseList.length > 0
      const clinicName = patient.clinics?.name ?? 'Rehabot Africa'

      const message = lang === 'sw'
        ? `Habari ${patient.full_name}! 💪\n\n${hasExercises
            ? `Mazoezi yako ya leo (${clinicName}):\n${exerciseList}\n\n`
            : `Hii ni ujumbe kutoka ${clinicName}.\n\n`}Jibu NDIYO ukimaliza mazoezi yako.`
        : `Good morning ${patient.full_name}! 💪\n\n${hasExercises
            ? `Your exercises for today (${clinicName}):\n${exerciseList}\n\n`
            : `This is a message from ${clinicName}.\n\n`}Reply YES when you finish your exercises.`

      console.log(`Sending to ${patient.full_name} at ${patient.phone_number}`)

      const result = await sendWhatsApp(patient.phone_number, message)
      console.log(`Send result for ${patient.full_name}:`, JSON.stringify(result))

      await supabase.from('message_logs').insert({
        patient_id: patient.id,
        direction: 'outbound',
        message_type: 'reminder',
        content: message
      })

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
