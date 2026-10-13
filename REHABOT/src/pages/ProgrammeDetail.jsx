import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Play, Pause, CheckCircle2, Archive, CalendarDays, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import {
  WEEKDAY_LABELS, WEEKDAY_ORDER, formatDate,
  describeDosage, STATUS_LABELS, STATUS_VARIANTS
} from '../utils/programmes'

const REMINDER_STATUS_VARIANT = {
  pending: 'neutral',
  sending: 'info',
  sent: 'primary',
  failed: 'danger',
  skipped: 'neutral'
}

export default function ProgrammeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useToast()

  const [programme, setProgramme] = useState(null)
  const [patient, setPatient] = useState(null)
  const [days, setDays] = useState([])
  const [sessions, setSessions] = useState([])
  const [painLogs, setPainLogs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: prog } = await supabase
      .from('programmes')
      .select('*, patient:patients(full_name, diagnosis, language)')
      .eq('id', id)
      .single()

    if (!prog) { setLoading(false); return }
    setProgramme(prog)
    setPatient(prog.patient ?? null)

    const [{ data: dayRows }, { data: sessionRows }, { data: painData }] = await Promise.all([
      supabase.from('programme_days').select('*, programme_day_exercises(*, exercises(name_en, name_sw))').eq('programme_id', id),
      supabase.from('programme_sessions').select('*').eq('programme_id', id).order('session_date', { ascending: true }),
      supabase.from('pain_logs').select('*').eq('patient_id', prog.patient_id).order('logged_at', { ascending: false }).limit(30)
    ])

    setDays((dayRows ?? []).sort((a, b) => a.weekday - b.weekday))
    setSessions(sessionRows ?? [])
    setPainLogs(painData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  async function setStatus(status) {
    const { data, error } = await supabase.rpc('set_programme_status', { p_id: id, p_status: status })
    if (error || !data?.ok) {
      notify('Could not update status', { variant: 'danger', description: error?.message ?? data?.error })
      return
    }
    notify(`Programme ${STATUS_LABELS[status]?.toLowerCase() ?? status}`, { variant: 'success' })
    load()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
        <TopBar back={() => navigate('/programmes')} />
        <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-8 pb-24 lg:pb-8">Loading…</div>
      </div>
    )
  }

  if (!programme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-surface-dark">
        <div className="text-center">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">Programme not found.</p>
          <Button variant="secondary" onClick={() => navigate('/programmes')}>Back to programmes</Button>
        </div>
      </div>
    )
  }

  const sortedDays = WEEKDAY_ORDER.map((w) => days.find((d) => d.weekday === w)).filter(Boolean)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/programmes')} />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-8 pb-24 lg:pb-8">
        <PageHeader
          title={programme.name}
          description={`${patient?.full_name ?? 'Patient'} · ${programme.indication || patient?.diagnosis || '—'}`}
          action={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant={STATUS_VARIANTS[programme.status] ?? 'neutral'}>{STATUS_LABELS[programme.status] ?? programme.status}</Badge>
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => navigate(`/programmes/${id}/edit`)}>Edit</Button>
              {programme.status === 'draft' && (
                <Button size="sm" icon={Play} onClick={() => navigate(`/programmes/${id}/edit`)}>Publish</Button>
              )}
              {programme.status === 'active' && (
                <Button variant="secondary" size="sm" icon={Pause} onClick={() => setStatus('paused')}>Pause</Button>
              )}
              {programme.status === 'paused' && (
                <Button size="sm" icon={Play} onClick={() => setStatus('active')}>Resume</Button>
              )}
              {(programme.status === 'active' || programme.status === 'paused') && (
                <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => setStatus('completed')}>Complete</Button>
              )}
              {programme.status !== 'archived' && (
                <Button variant="ghost" size="sm" icon={Archive} onClick={() => setStatus('archived')}>Archive</Button>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Start', value: formatDate(programme.start_date) },
            { label: 'End', value: formatDate(programme.end_date) },
            { label: 'Reminder time', value: programme.reminder_time ? programme.reminder_time.slice(0, 5) : '—' },
            { label: 'Language', value: programme.language === 'sw' ? 'Swahili' : 'English' }
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{s.label}</div>
              <div className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{s.value}</div>
            </div>
          ))}
        </div>

        {(programme.clinical_instructions || programme.precautions) && (
          <Card className="mb-6">
            {programme.clinical_instructions && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Clinical instructions</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{programme.clinical_instructions}</p>
              </div>
            )}
            {programme.precautions && (
              <div>
                <div className="text-[11px] font-semibold text-warning-600 dark:text-amber-400 uppercase tracking-wide mb-1">Precautions</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{programme.precautions}</p>
              </div>
            )}
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader title="Weekly Schedule" description="The recurring Monday–Sunday template." />
          <div className="space-y-2">
            {sortedDays.map((day) => (
              <div key={day.weekday} className="flex items-start gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-white/[0.03]">
                <span className={`w-16 flex-shrink-0 text-xs font-semibold ${day.is_rest_day ? 'text-neutral-400' : 'text-primary-600 dark:text-primary-400'}`}>
                  {WEEKDAY_LABELS[day.weekday]}
                </span>
                <div className="flex-1 min-w-0">
                  {day.is_rest_day ? (
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">Rest day</p>
                  ) : day.programme_day_exercises?.length ? (
                    <div className="space-y-1">
                      {day.programme_day_exercises.map((pde) => (
                        <p key={pde.id} className="text-sm text-neutral-700 dark:text-neutral-300">
                          {pde.exercises?.name_en ?? 'Exercise'}{' '}
                          <span className="text-xs text-neutral-400">{describeDosage(pde)}</span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 dark:text-neutral-500">No exercises</p>
                  )}
                  {!day.reminder_enabled && <span className="text-xs text-neutral-400">· reminder off</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-6">
          <CardHeader title="Dated Sessions" description="The actual calendar sessions generated from this programme." />
          {sessions.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No sessions yet" description="Sessions are generated when the programme is published." />
          ) : (
            <div className="space-y-1.5">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                  <div className="w-28 flex-shrink-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{formatDate(s.session_date)}</p>
                    <p className="text-xs text-neutral-400">{WEEKDAY_LABELS[s.weekday]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {s.is_rest_day ? (
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">Rest day</p>
                    ) : (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {(s.snapshot?.exercises ?? []).map((ex) => ex.name_en || ex.name_sw).filter(Boolean).join(' · ') || 'No exercises'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.status === 'completed' && <Badge variant="success">completed</Badge>}
                    {!s.is_rest_day && <Badge variant={REMINDER_STATUS_VARIANT[s.reminder_status] ?? 'neutral'}>{s.reminder_status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Pain Score History" description="Patient-reported pain scores (most recent first)." />
          {painLogs.length === 0 ? (
            <EmptyState icon={Activity} title="No pain scores" description="Pain scores appear when the patient replies to check-ins." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {painLogs.map((log) => (
                <div key={log.id} className="bg-neutral-50 dark:bg-white/[0.03] rounded-lg p-3">
                  <div className="text-xl font-bold text-neutral-900 dark:text-white">{log.score}/10</div>
                  <div className="text-xs text-neutral-400">{new Date(log.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
