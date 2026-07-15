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

    console.log('Fetching active patients...')

    const { data: patients, error } = await supabase
      .from('patients')
      .select(`
        id, full_name, phone_number, language, diagnosis,
        patient_exercises (
          sets, reps,
          exercises ( name_en, name_sw, video_url )
        )
      `)
      .eq('status', 'active')

    console.log('Patients found:', JSON.stringify(patients))
    if (error) throw error

    let sent = 0

    for (const patient of patients ?? []) {
      const lang = patient.language

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

      const message = lang === 'sw'
        ? `Habari ${patient.full_name}! ??\n\n${hasExercises ? `Mazoezi yako ya leo:\n${exerciseList}\n\n` : ''}Jibu NDIYO ukimaliza mazoezi yako.`
        : `Good morning ${patient.full_name}! ??\n\n${hasExercises ? `Your exercises for today:\n${exerciseList}\n\n` : ''}Reply YES when you finish your exercises.`

      console.log('Sending to:', patient.phone_number)
      await sendWhatsApp(patient.phone_number, message)

      await supabase.from('message_logs').insert({
        patient_id: patient.id,
        direction: 'outbound',
        message_type: 'reminder',
        content: message
      })

      await supabase.from('adherence_logs').insert({
        patient_id: patient.id,
        log_date: new Date().toISOString().split('T')[0],
        reply_received: false,
        confirmed: false
      })

      sent++
    }

    console.log('Total sent:', sent)

    return new Response(
      JSON.stringify({ success: true, sent }),
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
