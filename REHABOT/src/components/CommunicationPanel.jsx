import { useState, useEffect } from 'react'
import { MessageCircle, MessageSquareText, Smartphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Card, { CardHeader } from './ui/Card'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'

const TYPE_LABEL = {
  exercise_reminder: 'Exercise reminder',
  appointment_reminder: 'Appointment reminder',
  pain_score_request: 'Pain score request',
  follow_up: 'Follow-up',
  missed_follow_up: 'Missed follow-up',
  patient_response: 'Patient response',
  otp: 'OTP',
  system: 'System'
}

const STATUS_VARIANT = {
  delivered: 'success',
  sent: 'primary',
  scheduled: 'info',
  pending: 'info',
  sending: 'info',
  processing: 'info',
  undelivered: 'warning',
  failed: 'danger'
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return d.toLocaleString('en-GB', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Builds the RLS-scoped base query for communication_logs.
function baseQuery() {
  return supabase
    .from('communication_logs')
    .select('id, channel, message_type, status, direction, message_content, response, created_at, sent_at, delivered_at, patient:patients(full_name)')
}

export default function CommunicationPanel({ patientId, patientIds, limit = 10 }) {
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  function scope(query) {
    if (patientId) return query.eq('patient_id', patientId)
    if (Array.isArray(patientIds) && patientIds.length) return query.in('patient_id', patientIds)
    return query
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const recent = scope(baseQuery()).order('created_at', { ascending: false }).limit(limit)

      const [
        { data: recentData },
        { count: smsCount },
        { count: smsDelivered },
        { count: smsFailed },
        { count: whatsappCount },
        { count: responseCount }
      ] = await Promise.all([
        recent,
        scope(supabase.from('communication_logs').select('id', { count: 'exact', head: true })).eq('channel', 'sms').eq('direction', 'outbound'),
        scope(supabase.from('communication_logs').select('id', { count: 'exact', head: true })).eq('channel', 'sms').eq('status', 'delivered'),
        scope(supabase.from('communication_logs').select('id', { count: 'exact', head: true })).eq('channel', 'sms').eq('status', 'failed'),
        scope(supabase.from('communication_logs').select('id', { count: 'exact', head: true })).eq('channel', 'whatsapp').eq('direction', 'outbound'),
        scope(supabase.from('communication_logs').select('id', { count: 'exact', head: true })).eq('direction', 'inbound')
      ])

      if (cancelled) return
      setLogs(recentData ?? [])
      setSummary({
        smsSent: smsCount ?? 0,
        smsDelivered: smsDelivered ?? 0,
        smsFailed: smsFailed ?? 0,
        whatsapp: whatsappCount ?? 0,
        responses: responseCount ?? 0
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, JSON.stringify(patientIds ?? []), limit])

  if (loading) {
    return <Card><div className="text-sm text-neutral-400 py-6 text-center">Loading communication…</div></Card>
  }

  return (
    <Card>
      <CardHeader title="Continuity Engine" description="Multi-channel communication with your patients (WhatsApp + SMS)" />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label: 'SMS sent', value: summary.smsSent },
            { label: 'SMS delivered', value: summary.smsDelivered },
            { label: 'SMS failed', value: summary.smsFailed },
            { label: 'WhatsApp sent', value: summary.whatsapp },
            { label: 'Patient replies', value: summary.responses }
          ].map((s) => (
            <div key={s.label} className="bg-neutral-50 dark:bg-white/[0.03] rounded-lg px-3 py-2.5">
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">{s.value}</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState icon={Smartphone} title="No communication yet" description="Reminders and SMS follow-ups will appear here." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                {log.channel === 'whatsapp'
                  ? <MessageCircle className="w-4 h-4 text-primary-500" strokeWidth={2} />
                  : <MessageSquareText className="w-4 h-4 text-info-500" strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {log.patient?.full_name ?? 'Patient'}
                  </span>
                  <span className="text-[11px] uppercase text-neutral-400">{log.channel}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{TYPE_LABEL[log.message_type] ?? log.message_type}</span>
                  <Badge variant={STATUS_VARIANT[log.status] ?? 'neutral'}>{log.status}</Badge>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{log.message_content ?? log.response}</p>
              </div>
              <span className="text-[11px] text-neutral-400 flex-shrink-0">{formatTime(log.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
