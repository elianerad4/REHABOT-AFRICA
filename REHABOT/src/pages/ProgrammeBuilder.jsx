import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const DAYS = [
  { v: 0, label: 'Sun' }, { v: 1, label: 'Mon' }, { v: 2, label: 'Tue' },
  { v: 3, label: 'Wed' }, { v: 4, label: 'Thu' }, { v: 5, label: 'Fri' }, { v: 6, label: 'Sat' }
]

export default function ProgrammeBuilder() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()

  const [patient, setPatient] = useState(null)
  const [exercises, setExercises] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [programmeId, setProgrammeId] = useState(null)
  const [programme, setProgramme] = useState(null)
  const [programmeExercises, setProgrammeExercises] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [goalFilter, setGoalFilter] = useState('')
  const [selectedGoals, setSelectedGoals] = useState([])

  const [preview, setPreview] = useState(null)
  const [adding, setAdding] = useState(null)
  const [editingExercise, setEditingExercise] = useState(null)

  async function fetchAll() {
    const [{ data: patientData }, { data: exerciseData }, { data: programmeData }] =
      await Promise.all([
        supabase.from('patients').select('*, condition:conditions(name)').eq('id', id).single(),
        supabase.from('exercises').select('*, condition:conditions(name)').eq('is_active', true).order('name_en'),
        supabase.from('rehabilitation_programmes')
          .select('*')
          .eq('patient_id', id)
          .order('created_at', { ascending: false })
      ])

    setPatient(patientData)
    setExercises(exerciseData ?? [])

    const list = programmeData ?? []
    setProgrammes(list)
    if (list.length > 0) {
      const active = list.find(p => p.status === 'active') ?? list[0]
      setProgrammeId(active.id)
      setProgramme(active)
      setSelectedGoals((active.goal ?? '').split(',').map(s => s.trim()).filter(Boolean))
      await loadProgrammeExercises(active.id)
    }
    setLoading(false)
  }

  async function loadProgrammeExercises(pid) {
    const { data } = await supabase
      .from('programme_exercises')
      .select('*, exercise:exercises(*)')
      .eq('programme_id', pid)
      .order('order_index', { ascending: true })
    setProgrammeExercises(data ?? [])
  }

  useEffect(() => {
    fetchAll()
  }, [id])

  const goals = useMemo(() =>
    [...new Set(exercises.map(e => e.goal).filter(Boolean))].sort(),
    [exercises]
  )

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises.filter(e => {
      if (q && !`${e.name_en} ${e.name_sw} ${e.description_en ?? ''}`.toLowerCase().includes(q)) return false
      if (goalFilter && e.goal !== goalFilter) return false
      return true
    })
  }, [exercises, search, goalFilter])

  async function createProgramme() {
    const { data } = await supabase
      .from('rehabilitation_programmes')
      .insert({
        patient_id: id,
        physio_id: user.id,
        clinic_id: patient.clinic_id,
        condition_id: patient.condition_id,
        name: 'Rehabilitation Programme',
        goal: '',
        start_date: new Date().toISOString().split('T')[0],
        status: 'draft'
      })
      .select()
      .single()
    if (data) {
      setProgrammes(prev => [data, ...prev])
      setProgrammeId(data.id)
      setProgramme(data)
      setProgrammeExercises([])
      setSelectedGoals([])
    }
  }

  async function selectProgramme(pid) {
    setProgrammeId(pid)
    const p = programmes.find(x => x.id === pid)
    setProgramme(p)
    setSelectedGoals((p?.goal ?? '').split(',').map(s => s.trim()).filter(Boolean))
    await loadProgrammeExercises(pid)
  }

  function toggleGoal(goal) {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  async function saveProgramme() {
    if (!programme) return
    await supabase.from('rehabilitation_programmes')
      .update({ ...programme, goal: selectedGoals.join(',') })
      .eq('id', programme.id)
    const { data } = await supabase.from('rehabilitation_programmes')
      .select('*').eq('id', programme.id).single()
    setProgramme(data)
  }

  async function activateProgramme() {
    if (!programme) return
    await supabase.from('rehabilitation_programmes')
      .update({ status: 'paused' })
      .eq('patient_id', id)
      .in('status', ['active', 'draft'])
    await supabase.from('rehabilitation_programmes')
      .update({ status: 'active', start_date: programme.start_date ?? new Date().toISOString().split('T')[0] })
      .eq('id', programme.id)
    await fetchAll()
  }

  async function addExerciseToProgramme() {
    const { exerciseId, sets, repetitions, duration_seconds, frequency, days_of_week, laterality, clinician_notes } = adding
    const orderIndex = programmeExercises.length
    const { data } = await supabase
      .from('programme_exercises')
      .insert({
        programme_id: programme.id,
        exercise_id: exerciseId,
        sets: sets === '' ? null : Number(sets),
        repetitions: repetitions === '' ? null : Number(repetitions),
        duration_seconds: duration_seconds === '' ? null : Number(duration_seconds),
        frequency,
        days_of_week,
        laterality: laterality || null,
        clinician_notes: clinician_notes || null
      })
      .select('*, exercise:exercises(*)')
      .single()
    if (data) {
      setProgrammeExercises(prev => [...prev, { ...data, order_index: orderIndex }])
      setAdding(null)
    }
  }

  async function updateExerciseDosage() {
    const { id: peId, sets, repetitions, duration_seconds, frequency, days_of_week, laterality, clinician_notes } = editingExercise
    await supabase.from('programme_exercises').update({
      sets: sets === '' ? null : Number(sets),
      repetitions: repetitions === '' ? null : Number(repetitions),
      duration_seconds: duration_seconds === '' ? null : Number(duration_seconds),
      frequency,
      days_of_week,
      laterality: laterality || null,
      clinician_notes: clinician_notes || null
    }).eq('id', peId)
    await loadProgrammeExercises(programme.id)
    setEditingExercise(null)
  }

  async function removeExercise(peId) {
    await supabase.from('programme_exercises').delete().eq('id', peId)
    await loadProgrammeExercises(programme.id)
  }

  async function moveExercise(peId, dir) {
    const idx = programmeExercises.findIndex(e => e.id === peId)
    const swap = programmeExercises[idx + dir]
    if (!swap) return
    const updates = [
      supabase.from('programme_exercises').update({ order_index: swap.order_index }).eq('id', peId),
      supabase.from('programme_exercises').update({ order_index: programmeExercises[idx].order_index }).eq('id', swap.id)
    ]
    await Promise.all(updates)
    await loadProgrammeExercises(programme.id)
  }

  function dosageText(pe) {
    const parts = []
    if (pe.sets) parts.push(`${pe.sets} sets`)
    if (pe.repetitions) parts.push(`${pe.repetitions} reps`)
    if (pe.duration_seconds) parts.push(`${pe.duration_seconds} sec`)
    return parts.join(' × ') || '—'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/patient/${id}`)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ← Back
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">
              Rehabilitation Programme
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{patient?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className="text-xl cursor-pointer hover:opacity-75 transition-opacity">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={saveProgramme}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Save
          </button>
          <button onClick={activateProgramme}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg dark:bg-green-500 dark:hover:bg-green-600">
            Activate
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Programme selector */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Programme:</span>
          {programmes.map(p => (
            <button key={p.id}
              onClick={() => selectProgramme(p.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                programmeId === p.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
              }`}>
              {p.name} · {p.status}
            </button>
          ))}
          <button onClick={createProgramme}
            className="text-xs font-medium text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full border border-dashed border-green-400">
            + New Programme
          </button>
        </div>

        {!programme ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No rehabilitation programme yet</h3>
            <p className="text-gray-500 text-sm mb-6 dark:text-gray-400">
              Create a programme to select exercises, set dosage and activate WhatsApp follow-up.
            </p>
            <button onClick={createProgramme}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg dark:bg-green-500 dark:hover:bg-green-600">
              Create Programme
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: programme details + library */}
            <div className="space-y-6">
              {/* Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Programme Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Programme name</label>
                    <input value={programme.name}
                      onChange={(e) => setProgramme({ ...programme, name: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Start date</label>
                      <input type="date" value={programme.start_date ?? ''}
                        onChange={(e) => setProgramme({ ...programme, start_date: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">End date</label>
                      <input type="date" value={programme.end_date ?? ''}
                        onChange={(e) => setProgramme({ ...programme, end_date: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                      Rehabilitation goals
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {goals.map(g => (
                        <button key={g} onClick={() => toggleGoal(g)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                            selectedGoals.includes(g)
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                          }`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Clinician notes</label>
                    <textarea value={programme.clinician_notes ?? ''} rows={3}
                      onChange={(e) => setProgramme({ ...programme, clinician_notes: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                  </div>
                </div>
              </div>

              {/* Library */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Add exercises</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Browse the exercise library. Preview an exercise before adding it to the programme.
                </p>
                <div className="flex gap-3 mb-4">
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none">
                    <option value="">All goals</option>
                    {goals.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredExercises.map(ex => (
                    <div key={ex.id}
                      className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{ex.name_en}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ex.goal ?? ex.category}</p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <button onClick={() => setPreview(ex)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium px-2 py-1">
                          Preview
                        </button>
                        <button onClick={() => setAdding({
                          exerciseId: ex.id, sets: ex.default_sets ?? '', repetitions: ex.default_repetitions ?? '',
                          duration_seconds: ex.default_duration_seconds ?? '', frequency: 'daily',
                          days_of_week: [0, 1, 2, 3, 4, 5, 6], laterality: ex.laterality ?? '', clinician_notes: ''
                        })}
                          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 font-medium px-2 py-1">
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredExercises.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">No exercises match.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: programme exercises */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-fit">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Programme Exercises</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {programmeExercises.length} exercise{programmeExercises.length === 1 ? '' : 's'} · status: {programme.status}
              </p>

              {programmeExercises.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                  No exercises added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {programmeExercises.map((pe, i) => (
                    <div key={pe.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {i + 1}. {pe.exercise?.name_en}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {dosageText(pe)} · {pe.frequency === 'daily' ? 'Daily' : `${pe.days_of_week?.length ?? 0} days/week`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveExercise(pe.id, -1)} disabled={i === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1">↑</button>
                          <button onClick={() => moveExercise(pe.id, 1)} disabled={i === programmeExercises.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm px-1">↓</button>
                        </div>
                      </div>
                      {pe.clinician_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 mb-2">
                          {pe.clinician_notes}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button onClick={() => setEditingExercise({ ...pe, sets: pe.sets ?? '', repetitions: pe.repetitions ?? '', duration_seconds: pe.duration_seconds ?? '' })}
                          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 font-medium">
                          Edit dosage
                        </button>
                        <button onClick={() => setPreview(pe.exercise)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 font-medium">
                          Preview video
                        </button>
                        <button onClick={() => removeExercise(pe.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreview(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{preview.name_en}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{preview.condition?.name} · {preview.category}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {preview.video_url ? (
              <video src={preview.video_url} controls className="w-full bg-black aspect-video object-contain" />
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                No demonstration video available
              </div>
            )}
            <div className="px-6 py-5 space-y-3">
              {preview.instructions && (
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Instructions</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{preview.instructions}</p>
                </div>
              )}
              {preview.precautions && (
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Precautions</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{preview.precautions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add exercise modal */}
      {adding && programme && (
        <DosageModal
          title={`Add: ${exercises.find(e => e.id === adding.exerciseId)?.name_en}`}
          data={adding}
          setData={(d) => setAdding(d)}
          onCancel={() => setAdding(null)}
          onSave={addExerciseToProgramme}
        />
      )}

      {/* Edit dosage modal */}
      {editingExercise && (
        <DosageModal
          title={`Edit: ${editingExercise.exercise?.name_en}`}
          data={editingExercise}
          setData={(d) => setEditingExercise(d)}
          onCancel={() => setEditingExercise(null)}
          onSave={updateExerciseDosage}
        />
      )}
    </div>
  )
}

function DosageModal({ title, data, setData, onCancel, onSave }) {
  const [days, setDays] = useState(data.days_of_week ?? [])

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  function submit(e) {
    e.preventDefault()
    const frequency = data.frequency === 'daily' ? 'daily' : 'weekly'
    onSave({ ...data, days_of_week: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : (days.length ? days : [0, 1, 2, 3, 4, 5, 6]) })
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Sets</label>
              <input type="number" min="0" value={data.sets} onChange={(e) => setData({ ...data, sets: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Reps</label>
              <input type="number" min="0" value={data.repetitions} onChange={(e) => setData({ ...data, repetitions: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Seconds</label>
              <input type="number" min="0" value={data.duration_seconds} onChange={(e) => setData({ ...data, duration_seconds: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Frequency</label>
            <select value={data.frequency} onChange={(e) => setData({ ...data, frequency: e.target.value })}
              className={inputCls}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (select days)</option>
            </select>
          </div>

          {data.frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Days of week</label>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <button key={d.v} type="button" onClick={() => toggleDay(d.v)}
                    className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                      days.includes(d.v) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Laterality</label>
            <select value={data.laterality} onChange={(e) => setData({ ...data, laterality: e.target.value })}
              className={inputCls}>
              <option value="">Not specified</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
              <option value="n/a">N/A</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Clinician note</label>
            <textarea value={data.clinician_notes} rows={2} onChange={(e) => setData({ ...data, clinician_notes: e.target.value })}
              className={inputCls} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
            <button type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
