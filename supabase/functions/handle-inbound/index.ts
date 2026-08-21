import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkSafety } from '../_shared/stroke.js'

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
  if (!response.ok || result.error) {
    throw new Error(
      `Meta text error: ${result.error?.message ?? `HTTP ${response.status}`}`
    )
  }
  return result
}

async function getClaudeResponse(
  patientName: string,
  diagnosis: string,
  language: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const systemPrompt = language === 'sw'
    ? `Wewe ni msaidizi wa afya wa Rehabot Africa. Unasaidia mgonjwa anayeitwa ${patientName} ambaye ana ${diagnosis}. Jibu kwa Kiswahili, kwa upole na kwa ufupi. Usitoe dawa wala matibabu ya ziada. Kama tatizo ni kubwa, mwambie awasiliane na daktari wake. Jibu kwa sentensi 2-3 tu.`
    : `You are a rehabilitation support assistant for Rehabot Africa. You are helping a patient named ${patientName} who has ${diagnosis}. Reply in English, briefly and warmly. Do not prescribe medication or suggest treatments beyond what their physio has assigned. If something sounds serious, tell them to contact their physiotherapist. Keep replies to 2-3 sentences maximum.`

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
      messages: [...history, { role: 'user', content: userMessage }]
    })
  })
  const data = await response.json()
  return data.content[0].text
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    console.log('Verification attempt:', { mode, token, challenge })
    if (mode === 'subscribe' && token === Deno.env.get('META_VERIFY_TOKEN')) {
      console.log('Verified successfully')
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  const okResponse = new Response('OK', { status: 200 })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    console.log('Payload:', JSON.stringify(payload))

    const entry = payload.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages

    if (!messages || messages.length === 0) return okResponse

    const message = messages[0]
    const from = '+' + message.from
    const messageBody = message.text?.body?.trim() ?? ''

    console.log('From:', from, 'Message:', messageBody)
    if (!from || !messageBody) return okResponse

    const { data: patientRows } = await supabase
      .from('patients')
      .select('id, full_name, language, diagnosis')
      .eq('phone_number', from)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    const patient = patientRows?.[0]

    if (!patient) {
      console.log('Patient not found:', from)
      return okResponse
    }

    const lang = patient.language
    const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]

    await supabase.from('message_logs').insert({
      patient_id: patient.id,
      direction: 'inbound',
      message_type: 'other',
      content: messageBody
    })

    // 1. Safety flags — concerning responses are flagged, never diagnosed.
    const safety = checkSafety(messageBody, lang)
    if (safety) {
      await supabase.from('clinician_flags').insert({
        patient_id: patient.id,
        flag_type: 'concerning_response',
        severity: safety.severity,
        details: safety.details,
        source: 'system'
      })
      await sendWhatsApp(from, safety.reply)
      await supabase.from('message_logs').insert({
        patient_id: patient.id, direction: 'outbound',
        message_type: 'safety_flag', content: safety.reply
      })
      return okResponse
    }

    const lowered = messageBody.toLowerCase()
    const trimmed = messageBody.trim()
    const isNumber = /^\d{1,2}$/.test(trimmed)
    const numeric = parseInt(trimmed)

    // 2. Programme completion context for today
    const { data: completionLogs } = await supabase
      .from('exercise_completion_logs')
      .select('id, status, difficulty_rating')
      .eq('patient_id', patient.id)
      .eq('log_date', today)
      .limit(100)

    const pendingCompletions = (completionLogs ?? []).filter(l => l.status === 'pending')
    const awaitingDifficulty = (completionLogs ?? []).filter(l => l.status === 'completed' && l.difficulty_rating == null)

    const doneWords = ['done', 'complete', 'completed', 'finished', 'nimefanya', 'nimemaliza']

    // 3. DONE → mark today's programme exercises as completed, ask for difficulty
    if (pendingCompletions.length > 0 && doneWords.includes(lowered)) {
      const now = new Date().toISOString()
      await supabase.from('exercise_completion_logs')
        .update({ status: 'completed', completed_at: now, patient_response: messageBody })
        .eq('patient_id', patient.id)
        .eq('log_date', today)
        .eq('status', 'pending')
      const reply = lang === 'sw'
        ? `Hongera! Umemaliza mazoezi ya leo. Ulikuwa mgumu kiasi gani? (1 - Rahisi sana, 5 - Mgumu sana)`
        : `Well done! You completed today's programme. How difficult was it? (1 = very easy, 5 = very difficult)`
      await sendWhatsApp(from, reply)
      await supabase.from('message_logs').insert({
        patient_id: patient.id, direction: 'outbound',
        message_type: 'difficulty_prompt', content: reply
      })
      return okResponse
    }

    // 4. Difficulty rating (1-5) after completion
    if (awaitingDifficulty.length > 0 && isNumber && numeric >= 1 && numeric <= 5) {
      await supabase.from('exercise_completion_logs')
        .update({ difficulty_rating: numeric, patient_response: messageBody })
        .eq('patient_id', patient.id)
        .eq('log_date', today)
        .eq('status', 'completed')
      const reply = lang === 'sw'
        ? `Asante! Tumerekodi kiwango cha ugumu: ${numeric}/5. Daktari wako ataona.`
        : `Thank you! We recorded your difficulty rating: ${numeric}/5. Your physio will review this.`
      await sendWhatsApp(from, reply)
      await supabase.from('message_logs').insert({
        patient_id: patient.id, direction: 'outbound',
        message_type: 'difficulty_rating', content: reply
      })
      return okResponse
    }

    // 5. Pain score (1-10)
    if (isNumber && numeric >= 1 && numeric <= 10) {
      await supabase.from('pain_logs').insert({
        patient_id: patient.id,
        score: numeric,
        raw_reply: messageBody
      })
      const reply = lang === 'sw'
        ? `Asante! Tumesajili maumivu yako: ${numeric}/10. Daktari wako ataona hii.`
        : `Thank you! We recorded your pain score: ${numeric}/10. Your physio will review this.`
      await sendWhatsApp(from, reply)
      await supabase.from('message_logs').insert({
        patient_id: patient.id, direction: 'outbound',
        message_type: 'pain_check', content: reply
      })
      return okResponse
    }

    const yesReplies = ['yes', 'ndiyo', 'ndio', 'done', 'nimefanya', 'yeah', 'yep', 'ok', 'okay']
    if (yesReplies.includes(lowered)) {
      await supabase.from('adherence_logs')
        .update({ confirmed: true, reply_received: true, reply_text: messageBody })
        .eq('patient_id', patient.id)
        .eq('log_date', today)
      const reply = lang === 'sw'
        ? `Hongera! Umefanya vizuri leo. Endelea hivyo!`
        : `Well done! Great work today. Keep it up!`
      await sendWhatsApp(from, reply)
      await supabase.from('message_logs').insert({
        patient_id: patient.id, direction: 'outbound',
        message_type: 'ai_response', content: reply
      })
      return okResponse
    }

    const { data: history } = await supabase
      .from('conversation_context')
      .select('role, content')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: true })
      .limit(10)

    const aiReply = await getClaudeResponse(
      patient.full_name, patient.diagnosis, lang, history ?? [], messageBody
    )

    await supabase.from('conversation_context').insert([
      { patient_id: patient.id, role: 'user', content: messageBody },
      { patient_id: patient.id, role: 'assistant', content: aiReply }
    ])

    await sendWhatsApp(from, aiReply)

    await supabase.from('message_logs').insert({
      patient_id: patient.id, direction: 'outbound',
      message_type: 'ai_response', content: aiReply
    })

  } catch (err) {
    console.error('Error:', err.message)
  }

  return okResponse
})
