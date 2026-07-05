import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendWhatsApp(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const from = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: from,
        To: `whatsapp:${to}`,
        Body: message
      })
    }
  )
}

async function getClaudeResponse(
  patientName: string,
  diagnosis: string,
  language: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const systemPrompt = language === 'sw'
    ? `Wewe ni msaidizi wa afya wa Rehabot Africa. Unasaidia mgonjwa anayeitwa ${patientName} ambaye ana ${diagnosis}. Jibu kwa Kiswahili, kwa upole na kwa ufupi. Usitoe dawa wala matibabu ya ziada. Kama tatizo ni kubwa, mwambie awasiliane na daktari wake. Jibu kwa maneno machache — hii ni ujumbe wa WhatsApp. Jibu kwa sentensi 2-3 tu.`
    : `You are a rehabilitation support assistant for Rehabot Africa. You are helping a patient named ${patientName} who has ${diagnosis}. Reply in English, briefly and warmly. Do not prescribe medication or suggest treatments beyond what their physio has assigned. If something sounds serious, tell them to contact their physiotherapist. Keep replies to 2-3 sentences maximum — this is WhatsApp.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: userMessage }
      ]
    })
  })

  const data = await response.json()
  return data.content[0].text
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Respond to Twilio immediately to prevent retries
  const responseToTwilio = new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' }
  })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse Twilio webhook body
    const body = await req.text()
    const params = new URLSearchParams(body)
    const from = params.get('From')?.replace('whatsapp:', '') ?? ''
    const messageBody = params.get('Body')?.trim() ?? ''

    if (!from || !messageBody) return responseToTwilio

    // Find patient by phone number
    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, language, diagnosis')
      .eq('phone_number', from)
      .single()

    if (!patient) return responseToTwilio

    const lang = patient.language
    const today = new Date().toISOString().split('T')[0]

    // Log inbound message
    await supabase.from('message_logs').insert({
      patient_id: patient.id,
      direction: 'inbound',
      message_type: 'other',
      content: messageBody
    })

    // INTENT 1: Pain score (number 1-10)
    const painScore = parseInt(messageBody)
    if (!isNaN(painScore) && painScore >= 1 && painScore <= 10) {
      await supabase.from('pain_logs').insert({
        patient_id: patient.id,
        score: painScore,
        raw_reply: messageBody
      })

      const reply = lang === 'sw'
        ? `Asante! Tumesajili maumivu yako: ${painScore}/10. Daktari wako ataona hii. 🙏`
        : `Thank you! We recorded your pain score: ${painScore}/10. Your physio will review this. 🙏`

      await sendWhatsApp(from, reply)

      await supabase.from('message_logs').insert({
        patient_id: patient.id,
        direction: 'outbound',
        message_type: 'pain_check',
        content: reply
      })

      return responseToTwilio
    }

    // INTENT 2: Exercise confirmation (YES / NDIYO)
    const yesReplies = ['yes', 'ndiyo', 'ndio', 'done', 'nimefanya', 'yeah', 'yep', '✅', 'ok', 'okay']
    if (yesReplies.includes(messageBody.toLowerCase())) {
      await supabase
        .from('adherence_logs')
        .update({
          confirmed: true,
          reply_received: true,
          reply_text: messageBody
        })
        .eq('patient_id', patient.id)
        .eq('log_date', today)

      const reply = lang === 'sw'
        ? `Hongera! 🎉 Umefanya vizuri leo. Endelea hivyo! Tutakuuliza kuhusu maumivu yako hivi karibuni.`
        : `Well done! 🎉 Great work today. Keep it up! We will check in on your pain level shortly.`

      await sendWhatsApp(from, reply)

      await supabase.from('message_logs').insert({
        patient_id: patient.id,
        direction: 'outbound',
        message_type: 'ai_response',
        content: reply
      })

      return responseToTwilio
    }

    // INTENT 3: Everything else → Claude AI
    const { data: history } = await supabase
      .from('conversation_context')
      .select('role, content')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: true })
      .limit(10)

    const aiReply = await getClaudeResponse(
      patient.full_name,
      patient.diagnosis,
      lang,
      history ?? [],
      messageBody
    )

    // Store conversation context
    await supabase.from('conversation_context').insert([
      { patient_id: patient.id, role: 'user', content: messageBody },
      { patient_id: patient.id, role: 'assistant', content: aiReply }
    ])

    await sendWhatsApp(from, aiReply)

    await supabase.from('message_logs').insert({
      patient_id: patient.id,
      direction: 'outbound',
      message_type: 'ai_response',
      content: aiReply
    })

  } catch (err) {
    console.error('handle-inbound error:', err)
  }

  return responseToTwilio
})