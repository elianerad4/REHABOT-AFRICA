import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  extractStatusEvent,
  isForwardStatus,
  TERMINAL_STATUSES
} from '../_shared/sms-core.ts'

// Delivery-status webhook for Textify. Textify reports message lifecycle
// changes (sent/delivered/undelivered/failed). We match the provider message
// id back to communication_logs and only ever move status FORWARD, so a
// replayed or out-of-order webhook cannot downgrade a delivered message.

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('TEXTIFY_WEBHOOK_SECRET')?.trim()
  if (!secret) {
    console.error('TEXTIFY_WEBHOOK_SECRET is not set — webhook is NOT being verified.')
    return true // fail-open; set TEXTIFY_WEBHOOK_ENFORCE=true to hard-reject
  }
  const enforce = Deno.env.get('TEXTIFY_WEBHOOK_ENFORCE') === 'true'
  const provided =
    req.headers.get('x-textify-secret') ??
    req.headers.get('x-webhook-secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (provided === secret) return true
  if (enforce) return false
  console.error('Textify webhook secret did NOT match — accepting anyway because TEXTIFY_WEBHOOK_ENFORCE is not "true".')
  return true
}

// Flatten whatever shape Textify sends into a list of status events.
function collectEvents(payload: any): any[] {
  const events: any[] = []
  const direct = extractStatusEvent(payload)
  if (direct) events.push(direct)

  for (const key of ['messages', 'data', 'events', 'statuses']) {
    const list = payload?.[key]
    if (Array.isArray(list)) {
      for (const item of list) {
        const e = extractStatusEvent(item)
        if (e) events.push(e)
      }
    }
  }
  return events
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  try {
    const payload = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const events = collectEvents(payload)
    if (events.length === 0) {
      console.error('Textify webhook: no recognisable status event in payload')
      return new Response('OK', { status: 200 })
    }

    for (const event of events) {
      const { providerMessageId, status, failureReason } = event

      const { data: existing } = await supabase
        .from('communication_logs')
        .select('id, status, sent_at, delivered_at, failed_at')
        .eq('provider', 'textify')
        .eq('provider_message_id', providerMessageId)
        .maybeSingle()

      if (!existing) {
        console.error(`Textify webhook: no matching communication_logs row for id ${providerMessageId}`)
        continue
      }

      if (!isForwardStatus(existing.status, status)) {
        console.log(`Textify webhook: ignoring non-forward status ${status} (current ${existing.status}) for ${providerMessageId}`)
        continue
      }

      const patch: Record<string, any> = { status }
      if (status === 'sent' && !existing.sent_at) patch.sent_at = new Date().toISOString()
      if (status === 'delivered') patch.delivered_at = new Date().toISOString()
      if (TERMINAL_STATUSES.has(status) && !existing.delivered_at) {
        patch.failed_at = new Date().toISOString()
        if (failureReason) patch.failure_reason = failureReason
      }

      const { error } = await supabase
        .from('communication_logs')
        .update(patch)
        .eq('id', existing.id)

      if (error) {
        console.error(`Textify webhook: failed to update ${providerMessageId}: ${error.message}`)
      } else {
        console.log(`Textify webhook: ${providerMessageId} -> ${status}`)
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('textify-webhook error:', err.message)
    return new Response('Error', { status: 500 })
  }
})
