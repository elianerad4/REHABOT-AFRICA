import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw request
// body, keyed with the Meta App Secret) so this endpoint can't be spoofed by
// anyone who finds the URL — without this, any caller could POST a forged
// payload claiming to be from any patient's phone number.
async function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader) return false
  const expected = signatureHeader.replace(/^sha256=/, '')
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (computed.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

async function sendWhatsApp(to: string, message: string) {
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

// Normalizes a video URL for WhatsApp: decodes each path segment (in case it's
// already partially percent-encoded, e.g. copied from the Supabase dashboard)
// then re-encodes it fully, so special characters in filenames (&, (), +, ,)
// are handled correctly without corrupting a real query string (?token=...).
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

// WhatsApp Cloud API rejects video messages over 16MB.
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
    console.log('Meta API response:', JSON.stringify(result))
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
    const rawBody = await req.text()

    // Reject forged webhook calls once META_APP_SECRET is configured. Until
    // then, log loudly rather than breaking the live webhook — see the
    // deploy notes for the one-time setup step (set META_APP_SECRET from the
    // Meta App dashboard, then this becomes a hard rejection).
    const appSecret = Deno.env.get('META_APP_SECRET')
    if (appSecret) {
      const valid = await verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'), appSecret)
      if (!valid) {
        console.error('Rejected webhook call: invalid X-Hub-Signature-256')
        return new Response('Forbidden', { status: 403 })
      }
    } else {
      console.error('META_APP_SECRET is not set — webhook signature is NOT being verified. Set this secret to prevent forged inbound messages.')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = JSON.parse(rawBody)
    console.log('Payload:', JSON.stringify(payload))

    const entry = payload.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const messages = value?.messages
    const statuses = value?.statuses

    // Meta delivery-status callbacks (sent/delivered/read/failed). A media
    // message can return HTTP 200 from the send API and still fail moments
    // later, so these callbacks are the only source of truth for real
    // delivery. Match the outbound log by Meta's wamid (stored in twilio_sid).
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        if (status.status === 'failed') {
          const detail = status.errors?.[0]?.error_data?.details
            ?? status.errors?.[0]?.title
            ?? 'unknown delivery error'
          console.error(`Delivery failed for ${status.id}: ${detail}`)
          await supabase.from('message_logs')
            .update({ status: 'failed' })
            .eq('twilio_sid', status.id)
        }
      }
      return okResponse
    }

    if (!messages || messages.length === 0) return okResponse

    const message = messages[0]
    const from = '+' + message.from
    // A tapped Quick Reply button on a template arrives as type 'button' with
    // a fixed payload (set when the template's button was created), not as
    // free text — so a patient tapping "Watch Video" never has to type it.
    const messageBody = (message.text?.body ?? message.button?.payload ?? '').trim()

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

    const lowered = messageBody.toLowerCase()
    const trimmed = messageBody.trim()
    const isNumber = /^\d{1,2}$/.test(trimmed)
    const numeric = parseInt(trimmed)

    // 1. Pain score (1-10)
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

    // 2. Video request → send this patient's assigned exercise demonstrations
    const videoKeywords = ['video', 'demo', 'onyesho', 'nionyeshe']
    if (videoKeywords.some((w) => lowered.includes(w))) {
      const { data: patientExercises } = await supabase
        .from('patient_exercises')
        .select(`exercises ( name_en, name_sw, video_url )`)
        .eq('patient_id', patient.id)

      const videos = (patientExercises ?? [])
        .map((pe: any) => pe.exercises)
        .filter((ex: any) => ex && ex.video_url)

      if (videos.length === 0) {
        const reply = lang === 'sw'
          ? `Samahani, hakuna video za mazoezi zinazopatikana kwa sasa. Wasiliana na mtaalamu wako wa tiba ya viungo.`
          : `Sorry, there are no exercise videos available right now. Please contact your physiotherapist.`
        await sendWhatsApp(from, reply)
        await supabase.from('message_logs').insert({
          patient_id: patient.id, direction: 'outbound',
          message_type: 'video_request', content: reply
        })
        return okResponse
      }

      const introReply = lang === 'sw'
        ? `Hapa kuna video za mazoezi ya leo:`
        : `Here are today's exercise demonstration videos:`
      const introResult = await sendWhatsApp(from, introReply)
      await supabase.from('message_logs').insert({
        patient_id: patient.id, direction: 'outbound',
        message_type: 'video_request', content: introReply,
        twilio_sid: introResult?.messages?.[0]?.id ?? null
      })

      for (const ex of videos) {
        const name = lang === 'sw' ? (ex.name_sw ?? ex.name_en) : ex.name_en

        const size = await getVideoSize(ex.video_url)
        if (size !== null && size > MAX_VIDEO_BYTES) {
          console.error(`Video too large for WhatsApp (${(size / 1048576).toFixed(1)}MB > 16MB): ${name} — ${ex.video_url}`)
          await supabase.from('message_logs').insert({
            patient_id: patient.id, direction: 'outbound',
            message_type: 'exercise_video', status: 'failed',
            content: `${name}: video exceeds WhatsApp's 16MB limit (${(size / 1048576).toFixed(1)}MB) — ${ex.video_url}`
          })
          continue
        }

        const sendResult = await sendWhatsAppVideo(from, ex.video_url, name)
        await supabase.from('message_logs').insert({
          patient_id: patient.id, direction: 'outbound',
          message_type: 'exercise_video', status: sendResult ? 'sent' : 'failed',
          twilio_sid: sendResult?.messages?.[0]?.id ?? null,
          content: ex.video_url
        })
      }
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
