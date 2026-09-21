import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { Plus, TrendingUp, Activity, MessageSquare, Dumbbell, X, ArrowLeft, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import Card, { CardHeader } from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'

const CHART_PRIMARY = '#0D9488'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [painLogs, setPainLogs] = useState([])
  const [adherenceLogs, setAdherenceLogs] = useState([])
  const [messages, setMessages] = useState([])
  const [exercises, setExercises] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryMap, setCategoryMap] = useState([])
  const [patientExercises, setPatientExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseDescription, setNewExerciseDescription] = useState('')
  const [newExerciseCategoryId, setNewExerciseCategoryId] = useState('')
  const [assignCategoryId, setAssignCategoryId] = useState('')
  const [assignSearch, setAssignSearch] = useState('')
  const [configuring, setConfiguring] = useState(null) // exercise being prescribed
  const [dosage, setDosage] = useState({ sets: 3, reps: 10, frequency_per_week: 5 })
  const [reminderTime, setReminderTime] = useState('')
  const [reminderSaveStatus, setReminderSaveStatus] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  async function fetchAll() {
    const [
      { data: patientData },
      { data: painData },
      { data: adherenceData },
      { data: messageData },
      { data: exerciseData },
      { data: categoryData },
      { data: categoryMapData },
      { data: patientExerciseData }
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase.from('pain_logs').select('*').eq('patient_id', id).order('logged_at', { ascending: true }).limit(14),
      supabase.from('adherence_logs').select('*').eq('patient_id', id).order('log_date', { ascending: false }).limit(7),
      supabase.from('message_logs').select('*').eq('patient_id', id).order('sent_at', { ascending: false }).limit(20),
      supabase.from('exercises').select('*').eq('is_global', true).eq('is_active', true).order('name_en'),
      supabase.from('exercise_categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('exercise_category_map').select('exercise_id, category_id'),
      supabase.from('patient_exercises').select('*, exercise:exercises(*)').eq('patient_id', id)
    ])

    setPatient(patientData)
    setPainLogs(painData ?? [])
    setAdherenceLogs(adherenceData ?? [])
    setMessages(messageData ?? [])
    setExercises(exerciseData ?? [])
    setCategories(categoryData ?? [])
    setCategoryMap(categoryMapData ?? [])
    setPatientExercises(patientExerciseData ?? [])
    setReminderTime(patientData?.reminder_time?.slice(0, 5) ?? '')
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const exerciseIdsByCategory = useMemo(() => {
    const m = new Map()
    for (const row of categoryMap) {
      if (!m.has(row.category_id)) m.set(row.category_id, new Set())
      m.get(row.category_id).add(row.exercise_id)
    }
    return m
  }, [categoryMap])

  const alreadyAssignedIds = useMemo(() => new Set(patientExercises.map((pe) => pe.exercise_id)), [patientExercises])

  // "Uncategorized" is computed, not a stored category — it's every exercise
  // with no row in exercise_category_map. Mirrors ExerciseLibrary.jsx so the
  // original (pre-taxonomy) exercises are still assignable from here.
  const categorizedExerciseIds = useMemo(() => new Set(categoryMap.map((r) => r.exercise_id)), [categoryMap])
  const uncategorizedCount = useMemo(
    () => exercises.filter((ex) => !categorizedExerciseIds.has(ex.id)).length,
    [exercises, categorizedExerciseIds]
  )

  const assignableExercises = useMemo(() => {
    if (!assignCategoryId) return []
    const isUncategorized = assignCategoryId === 'uncategorized'
    const ids = isUncategorized ? null : (exerciseIdsByCategory.get(assignCategoryId) ?? new Set())
    const q = assignSearch.trim().toLowerCase()
    return exercises
      .filter((ex) => (isUncategorized ? !categorizedExerciseIds.has(ex.id) : ids.has(ex.id)) && !alreadyAssignedIds.has(ex.id))
      .filter((ex) => !q || [ex.name_en, ex.name_sw, ex.description_en].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [assignCategoryId, exercises, exerciseIdsByCategory, assignSearch, alreadyAssignedIds, categorizedExerciseIds])

  function beginConfigure(exercise) {
    setConfiguring(exercise)
    setDosage({
      sets: exercise.default_sets ?? 3,
      reps: exercise.default_reps ?? 10,
      frequency_per_week: exercise.default_frequency_per_week ?? 5
    })
  }

  async function confirmAssign() {
    if (!configuring) return
    setExercisesLoading(true)
    await supabase.from('patient_exercises').insert({
      patient_id: id,
      exercise_id: configuring.id,
      sets: dosage.sets,
      reps: dosage.reps,
      frequency_per_week: dosage.frequency_per_week
    })
    const { data } = await supabase.from('patient_exercises').select('*, exercise:exercises(*)').eq('patient_id', id)
    setPatientExercises(data ?? [])
    setConfiguring(null)
    setExercisesLoading(false)
  }

  async function removePatientExercise(peId) {
    setExercisesLoading(true)
    await supabase.from('patient_exercises').delete().eq('id', peId)
    setPatientExercises((prev) => prev.filter((pe) => pe.id !== peId))
    setExercisesLoading(false)
  }

  async function addNewExercise() {
    if (!newExerciseName.trim()) return
    setExercisesLoading(true)
    const { data } = await supabase
      .from('exercises')
      .insert({
        name_en: newExerciseName.trim(),
        description_en: newExerciseDescription.trim(),
        is_global: true,
        created_by: user.id
      })
      .select()
      .single()
    if (data) {
      if (newExerciseCategoryId) {
        await supabase.from('exercise_category_map').insert({ exercise_id: data.id, category_id: newExerciseCategoryId })
        setCategoryMap((prev) => [...prev, { exercise_id: data.id, category_id: newExerciseCategoryId }])
      }
      setExercises((prev) => [...prev, data])
      setAssignCategoryId(newExerciseCategoryId || assignCategoryId)
    }
    setNewExerciseName('')
    setNewExerciseDescription('')
    setNewExerciseCategoryId('')
    setShowAddExercise(false)
    setExercisesLoading(false)
  }

  async function updateStatus(newStatus) {
    await supabase.from('patients').update({ status: newStatus }).eq('id', id)
    setPatient({ ...patient, status: newStatus })
  }

  function handleReminderTimeChange(e) {
    setReminderTime(e.target.value)
    setReminderSaveStatus('')
  }

  async function saveReminderTime() {
    const value = reminderTime
    if (!value) return setReminderSaveStatus('')
    if (!/^\d{2}:\d{2}$/.test(value)) return
    const time = `${value}:00`
    if (time === patient?.reminder_time) return setReminderSaveStatus('saved')
    setReminderSaveStatus('saving')
    const { error } = await supabase.from('patients').update({ reminder_time: time }).eq('id', id)
    if (error) {
      setReminderSaveStatus('error')
      return
    }
    // send-daily-reminders guards "once per day" purely by the presence of
    // today's adherence_logs row, so a reminder already sent earlier today
    // (e.g. from the default 08:00 before a time was set) would block the
    // newly chosen time. Clear it so the physio can move the time freely and
    // have it fire today. Today is computed in EAT (UTC+3) to match the
    // reminder function.
    const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]
    await supabase.from('adherence_logs').delete().eq('patient_id', id).eq('log_date', today)
    setAdherenceLogs((prev) => prev.filter((l) => l.log_date !== today))
    setPatient({ ...patient, reminder_time: time })
    setReminderSaveStatus('saved')
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const adherencePercent = adherenceLogs.length > 0
    ? Math.round((adherenceLogs.filter((l) => l.confirmed).length / adherenceLogs.length) * 100)
    : 0

  const avgPain = painLogs.length > 0
    ? (painLogs.reduce((sum, l) => sum + l.score, 0) / painLogs.length).toFixed(1)
    : 'N/A'

  const painChartData = painLogs.map((log) => ({ date: formatDate(log.logged_at), pain: log.score }))
  const adherenceChartData = [...adherenceLogs].reverse().map((log) => ({ date: formatDate(log.log_date), done: log.confirmed ? 1 : 0 }))

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
        <TopBar back={() => navigate('/dashboard')} />
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-surface-dark">
        <div className="text-center">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">Patient not found.</p>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar
        back={() => navigate('/dashboard')}
        actions={
          <div className="flex items-center gap-3 mr-1">
            <Avatar name={patient.full_name} size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">{patient.full_name}</p>
              <p className="text-xs text-neutral-400 leading-tight">{patient.diagnosis}</p>
            </div>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Reminder
              <input
                type="time"
                value={reminderTime}
                onChange={handleReminderTimeChange}
                onBlur={saveReminderTime}
                className="text-xs border border-neutral-300 dark:border-neutral-700 dark:bg-surface-dark-raised dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </label>
            {reminderSaveStatus === 'saving' && <span className="text-xs text-neutral-400">Saving…</span>}
            {reminderSaveStatus === 'saved' && <span className="text-xs text-success-600 dark:text-green-400">Saved</span>}
            {reminderSaveStatus === 'error' && <span className="text-xs text-danger-500">Failed to save</span>}
          </div>

          <select
            value={patient.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer bg-neutral-100 text-neutral-700 dark:bg-white/5 dark:text-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Phone', value: patient.phone_number },
            { label: 'Language', value: patient.language === 'sw' ? 'Swahili' : 'English' },
            { label: '7-Day Adherence', value: `${adherencePercent}%` },
            { label: 'Avg Pain Score', value: `${avgPain}/10` }
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{stat.label}</div>
              <div className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{stat.value}</div>
            </div>
          ))}
        </div>

        <Tabs
          className="mb-6"
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'messages', label: 'Messages' },
            { value: 'exercises', label: 'Exercises' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader title="Pain Trend" description="Patient-reported pain scores (1–10)" />
              {painChartData.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No pain scores recorded yet" description="Pain scores appear when the patient replies to check-ins." />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={painChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-neutral-400)' }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'var(--color-neutral-400)' }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-neutral-200)', fontSize: 13 }} />
                    <Line type="monotone" dataKey="pain" stroke={CHART_PRIMARY} strokeWidth={2} dot={{ fill: CHART_PRIMARY, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardHeader title="Exercise Adherence" description="Last 7 days — did the patient confirm exercises?" />
              {adherenceChartData.length === 0 ? (
                <EmptyState icon={Activity} title="No adherence data yet" description="Data appears after daily reminders are sent." />
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={adherenceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-neutral-400)' }} />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => (v === 1 ? 'Yes' : 'No')} tick={{ fontSize: 11, fill: 'var(--color-neutral-400)' }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--color-neutral-200)', fontSize: 13 }} formatter={(v) => (v === 1 ? 'Completed' : 'Missed')} />
                    <Bar dataKey="done" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {patient.notes && (
              <Card>
                <CardHeader title="Clinical Notes" />
                <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{patient.notes}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <Card padding="none">
            {messages.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No messages yet" description="Messages appear once WhatsApp follow-up begins." />
            ) : (
              <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {[...messages].reverse().map((msg) => (
                  <div key={msg.id} className={`px-6 py-4 flex gap-4 ${msg.direction === 'outbound' ? '' : 'bg-primary-50/40 dark:bg-primary-500/5'}`}>
                    <Avatar
                      name={msg.direction === 'outbound' ? 'Rehabot' : patient.full_name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {msg.direction === 'outbound' ? 'Rehabot' : patient.full_name}
                        </span>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
                          {new Date(msg.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.message_type && <Badge>{msg.message_type}</Badge>}
                        {msg.status === 'failed' && <Badge variant="danger">failed to send</Badge>}
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'exercises' && (
          <div className="space-y-6">
            <Card>
              <CardHeader title="Assigned Exercises" description="Exercises currently assigned to this patient" />
              {patientExercises.length === 0 ? (
                <EmptyState icon={Dumbbell} title="No exercises assigned yet" description="Select from the library below to assign." />
              ) : (
                <div className="space-y-3">
                  {patientExercises.map((pe) => (
                    <div key={pe.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-white/[0.03] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white text-sm">{pe.exercise?.name_en}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {pe.sets} sets × {pe.reps} reps · {pe.frequency_per_week}x/week
                          {pe.exercise?.description_en && <> — {pe.exercise.description_en}</>}
                        </p>
                      </div>
                      <Button variant="danger-ghost" size="sm" disabled={exercisesLoading} onClick={() => removePatientExercise(pe.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Assign Exercise</h3>
                <Button variant="ghost" size="sm" icon={Plus} onClick={() => setShowAddExercise((v) => !v)}>
                  New Exercise
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Choose a condition/category, then search or browse within it.</p>

              {showAddExercise && (
                <div className="mb-4 p-4 bg-primary-50/60 dark:bg-primary-500/5 border border-primary-100 dark:border-primary-500/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-neutral-900 dark:text-white text-sm">Add New Exercise</h4>
                    <button onClick={() => setShowAddExercise(false)} className="text-neutral-400 hover:text-neutral-600">
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                  <Input placeholder="Exercise name" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} />
                  <Textarea placeholder="Description (optional)" rows={2} value={newExerciseDescription} onChange={(e) => setNewExerciseDescription(e.target.value)} />
                  <Select value={newExerciseCategoryId} onChange={(e) => setNewExerciseCategoryId(e.target.value)}>
                    <option value="">No category (add later from the Exercise Library)</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" loading={exercisesLoading} disabled={!newExerciseName.trim()} onClick={addNewExercise}>
                      Save Exercise
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowAddExercise(false); setNewExerciseName(''); setNewExerciseDescription(''); setNewExerciseCategoryId('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {configuring ? (
                <div className="p-4 bg-primary-50/60 dark:bg-primary-500/5 border border-primary-100 dark:border-primary-500/20 rounded-lg">
                  <button onClick={() => setConfiguring(null)} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 mb-3">
                    <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back to results
                  </button>
                  <p className="font-medium text-neutral-900 dark:text-white text-sm mb-1">{configuring.name_en}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Set this patient's dosage — the library's default is only a starting template.</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Input label="Sets" type="number" min="0" value={dosage.sets} onChange={(e) => setDosage((d) => ({ ...d, sets: e.target.value }))} />
                    <Input label="Reps" type="number" min="0" value={dosage.reps} onChange={(e) => setDosage((d) => ({ ...d, reps: e.target.value }))} />
                    <Input label="×/week" type="number" min="0" value={dosage.frequency_per_week} onChange={(e) => setDosage((d) => ({ ...d, frequency_per_week: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={exercisesLoading} onClick={confirmAssign}>Assign to patient</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfiguring(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Select value={assignCategoryId} onChange={(e) => { setAssignCategoryId(e.target.value); setAssignSearch('') }} className="sm:w-56">
                      <option value="">Choose a category…</option>
                      {uncategorizedCount > 0 && (
                        <option value="uncategorized">Uncategorized ({uncategorizedCount})</option>
                      )}
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({exerciseIdsByCategory.get(c.id)?.size ?? 0})</option>
                      ))}
                    </Select>
                    {assignCategoryId && (
                      <Input
                        icon={Search}
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        placeholder="Search within this category…"
                        className="flex-1"
                      />
                    )}
                  </div>

                  {!assignCategoryId ? (
                    <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 py-6">Pick a category to browse its exercises.</p>
                  ) : assignableExercises.length === 0 ? (
                    <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 py-6">No unassigned exercises in this category yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {assignableExercises.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between p-3 border border-neutral-100 dark:border-neutral-800 rounded-lg hover:border-primary-200 dark:hover:border-primary-500/40 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-white text-sm">{ex.name_en}</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">
                              {[ex.difficulty, ex.equipment].filter(Boolean).join(' · ') || ex.name_sw}
                            </p>
                            {ex.description_en && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{ex.description_en}</p>}
                          </div>
                          <Button variant="ghost" size="sm" disabled={exercisesLoading} onClick={() => beginConfigure(ex)}>
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
