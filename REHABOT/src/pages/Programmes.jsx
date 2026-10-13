import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, Pencil, Play, Pause, CheckCircle2, Archive, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { STATUS_LABELS, STATUS_VARIANTS, formatDate, weekdayOf } from '../utils/programmes'

const WEEKDAY_SHORT = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

export default function Programmes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useToast()
  const [programmes, setProgrammes] = useState([])
  const [nextSessions, setNextSessions] = useState({})
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const { data } = await supabase
      .from('programmes')
      .select('*, patient:patients(full_name, diagnosis)')
      .order('updated_at', { ascending: false })

    const list = data ?? []
    setProgrammes(list)

    // Compute each active programme's next upcoming session.
    const activeIds = list.filter((p) => p.status === 'active').map((p) => p.id)
    if (activeIds.length) {
      const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: sessions } = await supabase
        .from('programme_sessions')
        .select('programme_id, session_date, is_rest_day')
        .in('programme_id', activeIds)
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .limit(500)

      const map = {}
      for (const s of sessions ?? []) {
        if (!map[s.programme_id] || s.session_date < map[s.programme_id].session_date) {
          map[s.programme_id] = s
        }
      }
      setNextSessions(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchAll()
  }, [user])

  async function setStatus(id, status) {
    const { data, error } = await supabase.rpc('set_programme_status', { p_id: id, p_status: status })
    if (error || !data?.ok) {
      notify('Could not update status', { variant: 'danger', description: error?.message ?? data?.error })
      return
    }
    notify(`Programme ${STATUS_LABELS[status]?.toLowerCase() ?? status}`, { variant: 'success' })
    fetchAll()
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/dashboard')} />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-8 pb-24 lg:pb-8">
        <PageHeader
          title="Weekly Programmes"
          description="Plan patient-specific weekly programmes with different exercises on each day."
          action={<Button icon={Plus} onClick={() => navigate('/programmes/new')}>New Programme</Button>}
        />

        {loading ? (
          <Card><div className="text-sm text-neutral-400 py-6 text-center">Loading programmes…</div></Card>
        ) : programmes.length === 0 ? (
          <Card>
            <EmptyState
              icon={CalendarDays}
              title="No programmes yet"
              description="Create a weekly programme to prescribe day-specific exercises."
              action={<Button icon={Plus} onClick={() => navigate('/programmes/new')}>Create your first programme</Button>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {programmes.map((p) => {
              const next = nextSessions[p.id]
              return (
                <div key={p.id} className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-neutral-900 dark:text-white text-base truncate">{p.name}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {p.patient?.full_name ?? 'Patient'} · {p.patient?.diagnosis || p.indication || '—'}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[p.status] ?? 'neutral'}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                  </div>

                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 space-y-0.5">
                    <p>{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                    {next && (
                      <p>
                        Next: <span className="font-medium text-neutral-700 dark:text-neutral-200">{formatDate(next.session_date)}</span>
                        {' '}({WEEKDAY_SHORT[weekdayOf(next.session_date)]}){next.is_rest_day ? ' — rest day' : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" icon={FileText} onClick={() => navigate(`/programme/${p.id}`)}>View</Button>
                    <Button size="sm" variant="secondary" icon={Pencil} onClick={() => navigate(`/programmes/${p.id}/edit`)}>Edit</Button>
                    {p.status === 'draft' && (
                      <Button size="sm" icon={Play} onClick={() => navigate(`/programmes/${p.id}/edit`)}>Publish</Button>
                    )}
                    {p.status === 'active' && (
                      <Button size="sm" variant="secondary" icon={Pause} onClick={() => setStatus(p.id, 'paused')}>Pause</Button>
                    )}
                    {p.status === 'paused' && (
                      <Button size="sm" icon={Play} onClick={() => setStatus(p.id, 'active')}>Resume</Button>
                    )}
                    {(p.status === 'active' || p.status === 'paused') && (
                      <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setStatus(p.id, 'completed')}>Complete</Button>
                    )}
                    {p.status !== 'archived' && (
                      <Button size="sm" variant="ghost" icon={Archive} onClick={() => setStatus(p.id, 'archived')}>Archive</Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
