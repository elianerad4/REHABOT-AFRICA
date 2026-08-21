import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

export default function RehabDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()

  const [patient, setPatient] = useState(null)
  const [programme, setProgramme] = useState(null)
  const [programmeExercises, setProgrammeExercises] = useState([])
  const [completionLogs, setCompletionLogs] = useState([])
  const [painLogs, setPainLogs] = useState([])
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 27)
    const startStr = start.toISOString().split('T')[0]

    const [{ data: patientData }, { data: programmeData }, { data: logData }, { data: painData }, { data: flagData }] =
      await Promise.all([
        supabase.from('patients').select('*, condition:conditions(name)').eq('id', id).single(),
        supabase.from('rehabilitation_programmes')
          .select('*, programme_exercises(id, sets, repetitions, duration_seconds, frequency, days_of_week, laterality, order_index, is_active, exercise:exercises(name_en, goal))')
          .eq('patient_id', id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase.from('exercise_completion_logs')
          .select('id, log_date, status, difficulty_rating, completed_at')
          .eq('patient_id', id)
          .gte('log_date', startStr)
          .order('log_date', { ascending: true }),
        supabase.from('pain_logs')
          .select('score, logged_at')
          .eq('patient_id', id)
          .gte('logged_at', startStr)
          .order('logged_at', { ascending: true }),
        supabase.from('clinician_flags')
          .select('*')
          .eq('patient_id', id)
          .in('status', ['open', 'reviewed'])
          .order('created_at', { ascending: false })
          .limit(50)
      ])

    setPatient(patientData)
    setProgramme(programmeData ?? null)
    setProgrammeExercises(
      (programmeData?.programme_exercises ?? [])
        .filter(pe => pe.is_active !== false)
        .sort((a, b) => a.order_index - b.order_index)
    )
    setCompletionLogs(logData ?? [])
    setPainLogs(painData ?? [])
    setFlags(flagData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [id])

  async function reviewFlag(flagId, status) {
    await supabase.from('clinician_flags')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', flagId)
    fetchAll()
  }

  const stats = useMemo(() => {
    const last7 = completionLogs.filter(l => {
      const d = new Date(l.log_date + 'T00:00:00Z')
      const cutoff = new Date()
      cutoff.setUTCDate(cutoff.getUTCDate() - 7)
      return d >= cutoff
    })

    const total = last7.length
    const completed = last7.filter(l => l.status === 'completed').length
    const dailyAdherence = total > 0 ? Math.round((completed / total) * 100) : 0

    const byDate = {}
    for (const l of completionLogs) {
      if (!byDate[l.log_date]) byDate[l.log_date] = { done: 0, total: 0 }
      byDate[l.log_date].total += 1
      if (l.status === 'completed') byDate[l.log_date].done += 1
    }
    const adherenceChart = Object.keys(byDate).slice(-14).map(date => ({
      date: date.slice(5),
      pct: Math.round((byDate[date].done / byDate[date].total) * 100)
    }))

    const difficultyRatings = completionLogs.filter(l => l.difficulty_rating != null)
    const avgDifficulty = difficultyRatings.length > 0
      ? (difficultyRatings.reduce((s, l) => s + l.difficulty_rating, 0) / difficultyRatings.length).toFixed(1)
      : '—'

    const difficultyByDate = {}
    for (const l of completionLogs) {
      if (l.difficulty_rating == null) continue
      difficultyByDate[l.log_date] = l.difficulty_rating
    }
    const difficultyChart = Object.keys(difficultyByDate).slice(-14).map(date => ({
      date: date.slice(5),
      difficulty: difficultyByDate[date]
    }))

    const painChart = painLogs.map(l => ({
      date: l.logged_at.slice(5, 10),
      pain: l.score
    })).slice(-14)

    const lastCompleted = completionLogs
      .filter(l => l.completed_at)
      .map(l => new Date(l.completed_at))
      .sort((a, b) => b - a)[0]

    const openFlags = flags.filter(f => f.status === 'open')

    return { total, completed, dailyAdherence, adherenceChart, avgDifficulty, difficultyChart, painChart, lastCompleted, openFlags }
  }, [completionLogs, painLogs, flags])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  function formatDate(d) {
    return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/patient/${id}`)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">← Back</button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">{patient?.full_name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {patient?.condition?.name ?? 'Patient'} Rehabilitation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className="text-xl cursor-pointer hover:opacity-75 transition-opacity">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => navigate(`/patient/${id}/programme`)}
            className="text-sm text-green-600 hover:text-green-700 font-medium dark:text-green-400 dark:hover:text-green-300">
            Edit Programme
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Programme summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {programme ? programme.name : 'No active programme'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {programme
                  ? `Status: ${programme.status} · ${programme.start_date ?? '—'}${programme.end_date ? ` → ${programme.end_date}` : ''}`
                  : 'Create and activate a programme to begin follow-up.'}
              </p>
            </div>
            <div className="flex gap-6">
              <Stat label="Adherence" value={`${stats.dailyAdherence}%`} />
              <Stat label="Exercises" value={`${stats.completed} / ${stats.total}`} />
              <Stat label="Avg difficulty" value={`${stats.avgDifficulty}/5`} />
              <Stat label="Flags" value={String(stats.openFlags.length)} warn={stats.openFlags.length > 0} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Adherence (last 14 days)">
            {stats.adherenceChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.adherenceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="pct" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="Pain trend">
            {stats.painChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.painChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pain" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="Difficulty trend (1–5)">
            {stats.difficultyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.difficultyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="difficulty" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          {/* Flags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Clinician Flags</h3>
            {flags.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No flags.</p>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {flags.map(f => (
                  <div key={f.id} className={`border rounded-lg p-3 ${f.severity === 'urgent' ? 'border-red-200 dark:border-red-800' : 'border-amber-200 dark:border-amber-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.severity === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                        {f.severity}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{f.details}</p>
                    {f.status === 'open' ? (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => reviewFlag(f.id, 'reviewed')}
                          className="text-xs text-green-600 dark:text-green-400 font-medium">Mark reviewed</button>
                        <button onClick={() => reviewFlag(f.id, 'resolved')}
                          className="text-xs text-gray-500 dark:text-gray-400 font-medium">Resolve</button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">Status: {f.status}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Programme exercises + last completed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Programme Exercises</h3>
            {programmeExercises.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No exercises in the active programme.</p>
            ) : (
              <div className="space-y-2">
                {programmeExercises.map((pe, i) => (
                  <div key={pe.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {i + 1}. {pe.exercise?.name_en}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {[pe.sets && `${pe.sets} × ${pe.repetitions ?? ''}`, pe.duration_seconds && `${pe.duration_seconds} sec`, pe.laterality].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{pe.frequency}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            {stats.lastCompleted ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Last completed: <strong>{formatDate(stats.lastCompleted)}</strong>
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No completions recorded yet.</p>
            )}
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent days</h4>
            <div className="space-y-1.5">
              {Object.entries(
                completionLogs.reduce((acc, l) => {
                  if (!acc[l.log_date]) acc[l.log_date] = { done: 0, total: 0 }
                  acc[l.log_date].total++
                  if (l.status === 'completed') acc[l.log_date].done++
                  return acc
                }, {})
              ).slice(-14).reverse().map(([date, v]) => (
                <div key={date} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{date}</span>
                  <span className="text-xs text-gray-500">
                    {v.done}/{v.total} {v.done === v.total && v.total > 0 ? '✓' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="text-center text-sm text-gray-400 py-12">No data yet.</p>
}
