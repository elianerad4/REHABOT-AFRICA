import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save, CheckCircle2, AlertTriangle, AlertCircle, Plus,
  ArrowUp, ArrowDown, Trash2, Dumbbell, Moon, Video, Search,
  CalendarDays
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import {
  emptyDays, WEEKDAY_ORDER, WEEKDAY_LABELS, WEEKDAY_SHORT,
  describeDosage, validateProgramme, STATUS_LABELS, STATUS_VARIANTS
} from '../utils/programmes'

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null
  return Number(v)
}

export default function ProgrammeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useToast()

  const [loading, setLoading] = useState(true)
  const [programme, setProgramme] = useState({
    id: null,
    patient_id: '',
    name: '',
    indication: '',
    start_date: '',
    end_date: '',
    reminder_time: '',
    language: 'en',
    status: 'draft',
    clinical_instructions: '',
    precautions: ''
  })
  const [days, setDays] = useState(emptyDays)

  const [patients, setPatients] = useState([])
  const [exercises, setExercises] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryMap, setCategoryMap] = useState([])

  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [publishing, setPublishing] = useState(false)
  const [validation, setValidation] = useState(null)
  const [pickerWeekday, setPickerWeekday] = useState(null)
  const [pickerCategory, setPickerCategory] = useState('')
  const [pickerSearch, setPickerSearch] = useState('')

  const exerciseIdsByCategory = useMemo(() => {
    const m = new Map()
    for (const row of categoryMap) {
      if (!m.has(row.category_id)) m.set(row.category_id, new Set())
      m.get(row.category_id).add(row.exercise_id)
    }
    return m
  }, [categoryMap])

  const categorizedIds = useMemo(() => new Set(categoryMap.map((r) => r.exercise_id)), [categoryMap])

  const pickerExercises = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    let list = exercises
    if (pickerCategory === 'uncategorized') {
      list = list.filter((ex) => !categorizedIds.has(ex.id))
    } else if (pickerCategory) {
      const ids = exerciseIdsByCategory.get(pickerCategory) ?? new Set()
      list = list.filter((ex) => ids.has(ex.id))
    }
    if (q) {
      list = list.filter((ex) =>
        [ex.name_en, ex.name_sw, ex.description_en].filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    }
    return list
  }, [exercises, pickerCategory, pickerSearch, exerciseIdsByCategory, categorizedIds])

  async function load() {
    const [{ data: profile }, { data: patientData }, { data: exData }, { data: catData }, { data: mapData }] = await Promise.all([
      supabase.from('profiles').select('clinic_id').eq('id', user.id).maybeSingle(),
      supabase.from('patients').select('id, full_name, diagnosis, language, reminder_time').eq('physio_id', user.id).order('full_name'),
      supabase.from('exercises').select('*').eq('is_global', true).eq('is_active', true).order('name_en'),
      supabase.from('exercise_categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('exercise_category_map').select('exercise_id, category_id')
    ])

    let allPatients = patientData ?? []
    if (profile?.clinic_id) {
      const { data: clinicPatients } = await supabase
        .from('patients')
        .select('id, full_name, diagnosis, language, reminder_time')
        .eq('clinic_id', profile.clinic_id)
        .neq('physio_id', user.id)
        .order('full_name')
      allPatients = [...allPatients, ...(clinicPatients ?? [])]
    }

    setPatients(allPatients)
    setExercises(exData ?? [])
    setCategories(catData ?? [])
    setCategoryMap(mapData ?? [])

    if (id) {
      const { data: prog } = await supabase.from('programmes').select('*').eq('id', id).single()
      if (prog) {
        setProgramme({
          id: prog.id,
          patient_id: prog.patient_id,
          name: prog.name,
          indication: prog.indication ?? '',
          start_date: prog.start_date ?? '',
          end_date: prog.end_date ?? '',
          reminder_time: prog.reminder_time ? prog.reminder_time.slice(0, 5) : '',
          language: prog.language ?? 'en',
          status: prog.status ?? 'draft',
          clinical_instructions: prog.clinical_instructions ?? '',
          precautions: prog.precautions ?? ''
        })

        const { data: dayRows } = await supabase.from('programme_days').select('*').eq('programme_id', id)
        const dayIds = (dayRows ?? []).map((d) => d.id)
        let exRows = []
        if (dayIds.length) {
          const { data } = await supabase
            .from('programme_day_exercises')
            .select('*, exercises(name_en, name_sw, video_url)')
            .in('programme_day_id', dayIds)
          exRows = data ?? []
        }
        const daysArr = emptyDays()
        for (const d of dayRows ?? []) {
          const exs = exRows
            .filter((e) => e.programme_day_id === d.id)
            .sort((a, b) => a.order_index - b.order_index)
            .map((e) => ({
              exercise_id: e.exercise_id,
              name_en: e.exercises?.name_en,
              name_sw: e.exercises?.name_sw,
              sets: e.sets,
              reps: e.reps,
              hold_seconds: e.hold_seconds,
              duration_seconds: e.duration_seconds,
              rest_seconds: e.rest_seconds,
              instructions: e.instructions ?? '',
              video_url: e.video_url ?? e.exercises?.video_url ?? null
            }))
          daysArr[d.weekday] = {
            weekday: d.weekday,
            is_rest_day: d.is_rest_day,
            reminder_enabled: d.reminder_enabled,
            general_instructions: d.general_instructions ?? '',
            exercises: exs
          }
        }
        setDays(daysArr)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  function updateProgramme(key, value) {
    setProgramme((p) => ({ ...p, [key]: value }))
    if (validation) setValidation(null)
  }

  function selectPatient(patientId) {
    const patient = patients.find((p) => p.id === patientId)
    setProgramme((p) => {
      const next = { ...p, patient_id: patientId }
      if (patient) {
        if (!p.reminder_time && patient.reminder_time) next.reminder_time = patient.reminder_time.slice(0, 5)
        if (p.language === 'en' && patient.language && patient.language !== 'en') next.language = patient.language
      }
      return next
    })
  }

  function updateDay(weekday, patch) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
    if (validation) setValidation(null)
  }

  function addExercise(weekday, exercise) {
    setDays((prev) => prev.map((d) => {
      if (d.weekday !== weekday) return d
      const ex = {
        exercise_id: exercise.id,
        name_en: exercise.name_en,
        name_sw: exercise.name_sw,
        sets: exercise.default_sets ?? null,
        reps: exercise.default_reps ?? null,
        hold_seconds: null,
        duration_seconds: exercise.duration_minutes != null ? exercise.duration_minutes * 60 : null,
        rest_seconds: null,
        instructions: '',
        video_url: exercise.video_url ?? null
      }
      return { ...d, exercises: [...d.exercises, ex] }
    }))
    if (validation) setValidation(null)
  }

  function removeExercise(weekday, idx) {
    setDays((prev) => prev.map((d) =>
      d.weekday === weekday ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d
    ))
  }

  function moveExercise(weekday, idx, dir) {
    setDays((prev) => prev.map((d) => {
      if (d.weekday !== weekday) return d
      const exs = [...d.exercises]
      const target = idx + dir
      if (target < 0 || target >= exs.length) return d
      ;[exs[idx], exs[target]] = [exs[target], exs[idx]]
      return { ...d, exercises: exs }
    }))
  }

  function updateExercise(weekday, idx, patch) {
    setDays((prev) => prev.map((d) =>
      d.weekday === weekday
        ? { ...d, exercises: d.exercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)) }
        : d
    ))
  }

  async function persist() {
    let progId = programme.id

    const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', user.id).maybeSingle()
    const header = {
      patient_id: programme.patient_id,
      physio_id: user.id,
      clinic_id: profile?.clinic_id ?? null,
      name: programme.name.trim(),
      indication: programme.indication.trim() || null,
      start_date: programme.start_date || null,
      end_date: programme.end_date || null,
      reminder_time: programme.reminder_time ? `${programme.reminder_time}:00` : null,
      language: programme.language,
      status: programme.status || 'draft',
      clinical_instructions: programme.clinical_instructions.trim() || null,
      precautions: programme.precautions.trim() || null
    }

    if (progId) {
      const { error } = await supabase.from('programmes').update(header).eq('id', progId)
      if (error) return { error }
    } else {
      const { data, error } = await supabase.from('programmes').insert(header).select().single()
      if (error) return { error }
      progId = data.id
      setProgramme((p) => ({ ...p, id: progId }))
    }

    for (const day of days) {
      const dayRow = {
        programme_id: progId,
        weekday: day.weekday,
        is_rest_day: day.is_rest_day,
        reminder_enabled: day.reminder_enabled,
        general_instructions: day.general_instructions.trim() || null
      }
      const { data: dayData, error: dayError } = await supabase
        .from('programme_days')
        .upsert(dayRow, { onConflict: 'programme_id,weekday' })
        .select()
        .single()
      if (dayError) return { error: dayError }

      const { error: delError } = await supabase.from('programme_day_exercises').delete().eq('programme_day_id', dayData.id)
      if (delError) return { error: delError }

      const exRows = day.exercises.map((ex, i) => ({
        programme_day_id: dayData.id,
        exercise_id: ex.exercise_id,
        order_index: i,
        sets: numOrNull(ex.sets),
        reps: numOrNull(ex.reps),
        hold_seconds: numOrNull(ex.hold_seconds),
        duration_seconds: numOrNull(ex.duration_seconds),
        rest_seconds: numOrNull(ex.rest_seconds),
        instructions: (ex.instructions ?? '').trim() || null,
        video_url: (ex.video_url ?? '').trim() || null
      }))
      if (exRows.length) {
        const { error: exError } = await supabase.from('programme_day_exercises').insert(exRows)
        if (exError) return { error: exError }
      }
    }

    return { id: progId }
  }

  async function saveDraft() {
    if (!programme.patient_id) {
      notify('Select a patient before saving', { variant: 'warning' })
      return
    }
    setSaveStatus('saving')
    const { error } = await persist()
    if (error) {
      setSaveStatus('error')
      notify('Save failed', { variant: 'danger', description: error.message })
      return
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2500)
  }

  function runValidation() {
    setValidation(validateProgramme(programme, days))
  }

  async function publish() {
    if (!programme.patient_id) {
      notify('Select a patient before publishing', { variant: 'warning' })
      return
    }
    setPublishing(true)
    setSaveStatus('saving')
    const { id: progId, error } = await persist()
    if (error) {
      setSaveStatus('error')
      setPublishing(false)
      notify('Could not save before publishing', { variant: 'danger', description: error.message })
      return
    }
    setSaveStatus('saved')

    const { data, error: rpcError } = await supabase.rpc('publish_programme', { p_id: progId })
    if (rpcError) {
      setPublishing(false)
      notify('Publish failed', { variant: 'danger', description: rpcError.message })
      return
    }
    if (!data?.ok) {
      setPublishing(false)
      setValidation({ errors: data?.errors ?? [], warnings: [] })
      notify('Programme has blocking errors', { variant: 'danger', description: 'Resolve the errors below and publish again.' })
      return
    }
    setPublishing(false)
    notify('Programme published', { variant: 'success', description: 'Reminders are now active.' })
    navigate(`/programme/${progId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
        <TopBar back={() => navigate('/programmes')} />
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">Loading…</div>
      </div>
    )
  }

  const isActive = programme.status === 'active'

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/programmes')} />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader
          title={id ? 'Edit Programme' : 'New Weekly Programme'}
          description="Prescribe different exercises and dosages for each day of the week."
          action={
            <div className="flex items-center gap-2.5">
              {saveStatus === 'saving' && <span className="text-xs text-neutral-400">Saving…</span>}
              {saveStatus === 'saved' && <span className="text-xs text-success-600 dark:text-green-400">Saved</span>}
              {saveStatus === 'error' && <span className="text-xs text-danger-500">Save failed</span>}
              <Button variant="secondary" icon={Save} onClick={saveDraft}>Save Draft</Button>
              <Button variant="secondary" icon={CheckCircle2} onClick={runValidation}>Validate</Button>
              <Button loading={publishing} onClick={publish}>{isActive ? 'Publish changes' : 'Publish'}</Button>
            </div>
          }
        />

        {programme.status && (
          <div className="mb-6">
            <Badge variant={STATUS_VARIANTS[programme.status] ?? 'neutral'}>{STATUS_LABELS[programme.status] ?? programme.status}</Badge>
          </div>
        )}

        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mb-6 space-y-2">
            {validation.errors.map((e, i) => (
              <div key={`e${i}`} className="flex items-start gap-2.5 bg-danger-50 dark:bg-danger-500/10 border border-red-200 dark:border-red-900 text-danger-600 dark:text-red-300 rounded-lg px-4 py-2.5 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {e.message}
                  {e.weekday != null && (
                    <button className="ml-2 underline" onClick={() => document.getElementById(`day-${e.weekday}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                      {WEEKDAY_LABELS[e.weekday]}
                    </button>
                  )}
                </span>
              </div>
            ))}
            {validation.warnings.map((w, i) => (
              <div key={`w${i}`} className="flex items-start gap-2.5 bg-warning-50 dark:bg-warning-500/10 border border-amber-200 dark:border-amber-900 text-warning-600 dark:text-amber-300 rounded-lg px-4 py-2.5 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span>
                  {w.message}
                  {w.weekday != null && <span className="ml-1 font-medium">{WEEKDAY_LABELS[w.weekday]}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader title="Programme Details" description="Patient, dates, reminder time and clinical context." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Patient" required value={programme.patient_id} onChange={(e) => selectPatient(e.target.value)}>
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} — {p.diagnosis || 'no diagnosis'}</option>
              ))}
            </Select>
            <Input label="Programme name" required value={programme.name} onChange={(e) => updateProgramme('name', e.target.value)} placeholder="e.g. Post-operative knee — Phase 1" />
            <Input label="Clinical indication / diagnosis" value={programme.indication} onChange={(e) => updateProgramme('indication', e.target.value)} placeholder="e.g. ACL reconstruction" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start date" type="date" value={programme.start_date} onChange={(e) => updateProgramme('start_date', e.target.value)} />
              <Input label="End date" type="date" value={programme.end_date} onChange={(e) => updateProgramme('end_date', e.target.value)} />
            </div>
            <Input label="Daily reminder time" type="time" value={programme.reminder_time} onChange={(e) => updateProgramme('reminder_time', e.target.value)} hint="Sent in the patient's clinic timezone (Africa/Dar_es_Salaam)." />
            <Select label="Preferred language" value={programme.language} onChange={(e) => updateProgramme('language', e.target.value)}>
              <option value="en">English</option>
              <option value="sw">Swahili</option>
            </Select>
            <Textarea label="Clinical instructions" rows={2} value={programme.clinical_instructions} onChange={(e) => updateProgramme('clinical_instructions', e.target.value)} placeholder="Overall instructions for the patient (optional)" />
            <Textarea label="Precautions" rows={2} value={programme.precautions} onChange={(e) => updateProgramme('precautions', e.target.value)} placeholder="Safety precautions and warnings (optional)" />
          </div>
        </Card>

        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary-600 dark:text-primary-400" strokeWidth={2} />
          <h2 className="font-display font-semibold text-neutral-900 dark:text-white">Weekly Planner</h2>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Configure each day independently.</span>
        </div>

        <div className="space-y-4">
          {WEEKDAY_ORDER.map((weekday) => {
            const day = days[weekday]
            return (
              <DayCard
                key={weekday}
                day={day}
                onUpdate={(patch) => updateDay(weekday, patch)}
                onAdd={() => setPickerWeekday(weekday)}
                onRemove={(idx) => removeExercise(weekday, idx)}
                onMove={(idx, dir) => moveExercise(weekday, idx, dir)}
                onUpdateExercise={(idx, patch) => updateExercise(weekday, idx, patch)}
              />
            )
          })}
        </div>
      </div>

      <Modal
        open={pickerWeekday != null}
        onClose={() => setPickerWeekday(null)}
        title={`Add exercises — ${pickerWeekday != null ? WEEKDAY_LABELS[pickerWeekday] : ''}`}
        size="lg"
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Select value={pickerCategory} onChange={(e) => setPickerCategory(e.target.value)} className="sm:w-56">
            <option value="">All exercises</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input icon={Search} value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search exercises…" className="flex-1" />
        </div>

        {pickerExercises.length === 0 ? (
          <EmptyState icon={Dumbbell} title="No exercises" description="No exercises match your filters." />
        ) : (
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {pickerExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => { addExercise(pickerWeekday, ex) }}
                className="text-left w-full flex items-center justify-between p-3 border border-neutral-100 dark:border-neutral-800 rounded-lg hover:border-primary-200 dark:hover:border-primary-500/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">{ex.name_en}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                    {[ex.difficulty, ex.equipment].filter(Boolean).join(' · ') || ex.name_sw}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  {ex.video_url && <Video className="w-4 h-4 text-primary-500" strokeWidth={2} />}
                  <Plus className="w-4 h-4 text-neutral-400" strokeWidth={2} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

function DayCard({ day, onUpdate, onAdd, onRemove, onMove, onUpdateExercise }) {
  const isRest = day.is_rest_day

  return (
    <div
      id={`day-${day.weekday}`}
      className={`bg-white dark:bg-surface-dark-raised rounded-xl border shadow-card overflow-hidden ${isRest ? 'border-neutral-200 dark:border-neutral-800' : 'border-neutral-200 dark:border-neutral-800'}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold ${isRest ? 'bg-neutral-200 text-neutral-500 dark:bg-white/10 dark:text-neutral-400' : 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'}`}>
            {WEEKDAY_SHORT[day.weekday]}
          </span>
          <div>
            <p className="font-display font-semibold text-neutral-900 dark:text-white text-sm">{WEEKDAY_LABELS[day.weekday]}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {isRest ? 'Rest day' : `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdate({ is_rest_day: !isRest, reminder_enabled: isRest ? false : day.reminder_enabled })}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${isRest ? 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:border-neutral-700' : 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-500/10 dark:text-primary-300 dark:border-primary-500/20'}`}
          >
            <Moon className="w-3.5 h-3.5" strokeWidth={2} />
            {isRest ? 'Rest day' : 'Exercise day'}
          </button>
          <label className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={day.reminder_enabled}
              disabled={isRest}
              onChange={(e) => onUpdate({ reminder_enabled: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600 dark:border-neutral-600 dark:bg-surface-dark-raised disabled:opacity-40"
            />
            Reminder
          </label>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        <Input
          label="Day instructions"
          value={day.general_instructions}
          onChange={(e) => onUpdate({ general_instructions: e.target.value })}
          placeholder="General instructions for this day (optional)"
        />

        {!isRest && day.exercises.length === 0 && (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-2">
            No exercises yet — this day will be flagged as invalid on publish.
          </p>
        )}

        {day.exercises.map((ex, idx) => (
          <div key={idx} className="border border-neutral-100 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/40 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">{ex.name_en || 'Exercise'}</p>
                {ex.video_url
                  ? <Video className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" strokeWidth={2} />
                  : <Badge variant="neutral" className="flex-shrink-0">no video</Badge>}
                {describeDosage(ex) && <span className="text-xs text-neutral-400 truncate">— {describeDosage(ex)}</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onMove(idx, -1)} disabled={idx === 0} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-4 h-4" strokeWidth={2} /></button>
                <button onClick={() => onMove(idx, 1)} disabled={idx === day.exercises.length - 1} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-4 h-4" strokeWidth={2} /></button>
                <button onClick={() => onRemove(idx)} className="text-danger-400 hover:text-danger-600" aria-label="Remove"><Trash2 className="w-4 h-4" strokeWidth={2} /></button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <DosageInput label="Sets" value={ex.sets} onChange={(v) => onUpdateExercise(idx, { sets: v })} />
              <DosageInput label="Reps" value={ex.reps} onChange={(v) => onUpdateExercise(idx, { reps: v })} />
              <DosageInput label="Hold (s)" value={ex.hold_seconds} onChange={(v) => onUpdateExercise(idx, { hold_seconds: v })} />
              <DosageInput label="Duration (s)" value={ex.duration_seconds} onChange={(v) => onUpdateExercise(idx, { duration_seconds: v })} />
              <DosageInput label="Rest (s)" value={ex.rest_seconds} onChange={(v) => onUpdateExercise(idx, { rest_seconds: v })} />
            </div>

            <div className="mt-2 space-y-2">
              <Input
                label="Exercise instructions"
                value={ex.instructions ?? ''}
                onChange={(e) => onUpdateExercise(idx, { instructions: e.target.value })}
                placeholder="Specific instructions for this exercise (optional)"
              />
              <Input
                label="Demonstration video URL"
                value={ex.video_url ?? ''}
                onChange={(e) => onUpdateExercise(idx, { video_url: e.target.value })}
                placeholder="https://… (inherit from library if blank)"
              />
            </div>
          </div>
        ))}

        {!isRest && (
          <Button variant="ghost" size="sm" icon={Plus} onClick={onAdd}>Add exercise</Button>
        )}
      </div>
    </div>
  )
}

function DosageInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-0.5">{label}</label>
      <input
        type="number"
        min="0"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full h-8 px-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-surface-dark-raised text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
      />
    </div>
  )
}
