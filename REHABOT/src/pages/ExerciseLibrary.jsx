import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Logo from '../components/ui/Logo'

const DIFFICULTY_ORDER = ['easy', 'moderate', 'advanced']

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()

  const [exercises, setExercises] = useState([])
  const [conditions, setConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    condition: '',
    goal: '',
    body_region: '',
    difficulty: '',
    equipment: '',
    position: '',
    category: ''
  })

  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  async function fetchAll() {
    const [{ data: exerciseData }, { data: conditionData }, { data: profile }] = await Promise.all([
      supabase.from('exercises')
        .select('*, condition:conditions(name)')
        .eq('is_active', true)
        .order('name_en', { ascending: true }),
      supabase.from('conditions').select('id, name').eq('is_active', true).order('name'),
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    ])
    setExercises(exerciseData ?? [])
    setConditions(conditionData ?? [])
    setIsAdmin(profile?.is_admin ?? false)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const filterOptions = useMemo(() => {
    const pick = (key) => [...new Set(exercises.map(e => e[key]).filter(Boolean))].sort()
    return {
      goal: pick('goal'),
      body_region: pick('body_region'),
      difficulty: [...new Set(exercises.map(e => e.difficulty).filter(Boolean))].sort(
        (a, b) => DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b)
      ),
      equipment: pick('equipment'),
      position: pick('position'),
      category: pick('category')
    }
  }, [exercises])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises.filter(e => {
      if (q) {
        const haystack = [e.name_en, e.name_sw, e.description_en, e.instructions, e.goal, e.category]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filters.condition && e.condition_id !== filters.condition) return false
      if (filters.goal && e.goal !== filters.goal) return false
      if (filters.body_region && e.body_region !== filters.body_region) return false
      if (filters.difficulty && e.difficulty !== filters.difficulty) return false
      if (filters.equipment && e.equipment !== filters.equipment) return false
      if (filters.position && e.position !== filters.position) return false
      if (filters.category && e.category !== filters.category) return false
      return true
    })
  }, [exercises, search, filters])

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  function openForm(exercise = null) {
    setEditing(exercise)
    setShowForm(true)
  }

  async function handleSave(payload) {
    if (editing?.id) {
      await supabase.from('exercises').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('exercises').insert({ ...payload, is_global: true, created_by: user.id })
    }
    setShowForm(false)
    setEditing(null)
    fetchAll()
  }

  async function handleDeactivate(exercise) {
    await supabase.from('exercises').update({ is_active: false }).eq('id', exercise.id)
    setShowForm(false)
    setEditing(null)
    setSelected(null)
    fetchAll()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm dark:text-gray-400">Loading exercise library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className="text-xl cursor-pointer hover:opacity-75 transition-opacity">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Exercise Library</h2>
            <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">
              Clinician-facing repository. Select exercises based on patient assessment.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => openForm(null)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors dark:bg-green-500 dark:hover:bg-green-600"
            >
              + New Exercise
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <select value={filters.condition} onChange={(e) => setFilter('condition', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500">
            <option value="">Condition</option>
            {conditions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500">
            <option value="">Category</option>
            {filterOptions.category.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.goal} onChange={(e) => setFilter('goal', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500">
            <option value="">Goal</option>
            {filterOptions.goal.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.body_region} onChange={(e) => setFilter('body_region', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500">
            <option value="">Body region</option>
            {filterOptions.body_region.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.difficulty} onChange={(e) => setFilter('difficulty', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500">
            <option value="">Difficulty</option>
            {filterOptions.difficulty.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.equipment} onChange={(e) => setFilter('equipment', e.target.value)}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500">
            <option value="">Equipment</option>
            {filterOptions.equipment.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Count */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {filtered.length} exercise{filtered.length === 1 ? '' : 's'}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-4xl mb-3">🏋️</div>
            <h3 className="font-semibold text-gray-900 mb-1 dark:text-white">No exercises found</h3>
            <p className="text-gray-500 text-sm dark:text-gray-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ex => (
              <button
                key={ex.id}
                onClick={() => setSelected(ex)}
                className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-green-300 dark:hover:border-green-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                    {ex.condition?.name ?? 'Exercise'}
                  </span>
                  {isAdmin && (
                    <span
                      onClick={(e) => { e.stopPropagation(); openForm(ex) }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    >
                      Edit
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">{ex.name_en}</h3>
                {ex.name_sw && <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{ex.name_sw}</p>}
                {ex.description_en && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{ex.description_en}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {[ex.category, ex.body_region, ex.difficulty].filter(Boolean).map((tag) => (
                    <span key={tag} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full capitalize">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.name_en}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selected.condition?.name} · {selected.category ?? 'Uncategorised'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {selected.video_url ? (
              <div className="bg-black aspect-video">
                <video src={selected.video_url} controls className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                No demonstration video available
              </div>
            )}

            <div className="px-6 py-5 space-y-4">
              <Section label="Purpose" value={selected.goal} />
              <Section label="Starting position" value={selected.position} />
              <Section label="Instructions" value={selected.instructions} />
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Dosage</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {[selected.default_sets && `${selected.default_sets} sets`, selected.default_repetitions && `${selected.default_repetitions} reps`, selected.default_duration_seconds && `${selected.default_duration_seconds} seconds`].filter(Boolean).join(' × ') || 'Set at programme level'}
                </p>
              </div>
              <Section label="Equipment" value={selected.equipment} />
              <Section label="Precautions" value={selected.precautions} />
              <Section label="Progression" value={selected.progression} />
              <Section label="Regression" value={selected.regression} />
            </div>
          </div>
        </div>
      )}

      {/* Admin Add/Edit Modal */}
      {showForm && (
        <ExerciseForm
          exercise={editing}
          conditions={conditions}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
          onDeactivate={handleDeactivate}
        />
      )}
    </div>
  )
}

function Section({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function ExerciseForm({ exercise, conditions, onClose, onSave, onDeactivate }) {
  const [form, setForm] = useState({
    name_en: exercise?.name_en ?? '',
    name_sw: exercise?.name_sw ?? '',
    description_en: exercise?.description_en ?? '',
    condition_id: exercise?.condition_id ?? conditions[0]?.id ?? '',
    category: exercise?.category ?? '',
    goal: exercise?.goal ?? '',
    body_region: exercise?.body_region ?? '',
    position: exercise?.position ?? '',
    equipment: exercise?.equipment ?? '',
    difficulty: exercise?.difficulty ?? 'easy',
    instructions: exercise?.instructions ?? '',
    video_url: exercise?.video_url ?? '',
    default_sets: exercise?.default_sets ?? '',
    default_repetitions: exercise?.default_repetitions ?? '',
    default_duration_seconds: exercise?.default_duration_seconds ?? '',
    precautions: exercise?.precautions ?? '',
    contraindications: exercise?.contraindications ?? '',
    progression: exercise?.progression ?? '',
    regression: exercise?.regression ?? '',
    laterality: exercise?.laterality ?? 'bilateral'
  })
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      default_sets: form.default_sets === '' ? null : Number(form.default_sets),
      default_repetitions: form.default_repetitions === '' ? null : Number(form.default_repetitions),
      default_duration_seconds: form.default_duration_seconds === '' ? null : Number(form.default_duration_seconds),
      condition_id: form.condition_id || null
    }
    await onSave(payload)
    setSaving(false)
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {exercise ? 'Edit Exercise' : 'New Exercise'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Exercise name (English)" cls={labelCls}>
              <input required value={form.name_en} onChange={(e) => update('name_en', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Name (Swahili)" cls={labelCls}>
              <input value={form.name_sw} onChange={(e) => update('name_sw', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Description" cls={labelCls}>
            <textarea value={form.description_en} onChange={(e) => update('description_en', e.target.value)} rows={2} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Condition" cls={labelCls}>
              <select value={form.condition_id} onChange={(e) => update('condition_id', e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                {conditions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Category" cls={labelCls}>
              <input value={form.category} onChange={(e) => update('category', e.target.value)} className={inputCls} placeholder="e.g. Balance" />
            </Field>
            <Field label="Rehabilitation goal" cls={labelCls}>
              <input value={form.goal} onChange={(e) => update('goal', e.target.value)} className={inputCls} placeholder="e.g. Improve transfers" />
            </Field>
            <Field label="Body region" cls={labelCls}>
              <input value={form.body_region} onChange={(e) => update('body_region', e.target.value)} className={inputCls} placeholder="e.g. Lower limb" />
            </Field>
            <Field label="Position" cls={labelCls}>
              <input value={form.position} onChange={(e) => update('position', e.target.value)} className={inputCls} placeholder="e.g. Sitting" />
            </Field>
            <Field label="Difficulty" cls={labelCls}>
              <select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)} className={inputCls}>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
            <Field label="Equipment" cls={labelCls}>
              <input value={form.equipment} onChange={(e) => update('equipment', e.target.value)} className={inputCls} placeholder="e.g. None" />
            </Field>
            <Field label="Laterality" cls={labelCls}>
              <select value={form.laterality} onChange={(e) => update('laterality', e.target.value)} className={inputCls}>
                <option value="bilateral">Bilateral</option>
                <option value="unilateral">Unilateral</option>
                <option value="n/a">N/A</option>
              </select>
            </Field>
            <Field label="Video URL" cls={labelCls}>
              <input value={form.video_url} onChange={(e) => update('video_url', e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
            <Field label="Default sets" cls={labelCls}>
              <input type="number" min="0" value={form.default_sets} onChange={(e) => update('default_sets', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Default repetitions" cls={labelCls}>
              <input type="number" min="0" value={form.default_repetitions} onChange={(e) => update('default_repetitions', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Default duration (seconds)" cls={labelCls}>
              <input type="number" min="0" value={form.default_duration_seconds} onChange={(e) => update('default_duration_seconds', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Instructions" cls={labelCls}>
            <textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} rows={3} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Precautions" cls={labelCls}>
              <textarea value={form.precautions} onChange={(e) => update('precautions', e.target.value)} rows={2} className={inputCls} />
            </Field>
            <Field label="Contraindications" cls={labelCls}>
              <textarea value={form.contraindications} onChange={(e) => update('contraindications', e.target.value)} rows={2} className={inputCls} />
            </Field>
            <Field label="Progression" cls={labelCls}>
              <textarea value={form.progression} onChange={(e) => update('progression', e.target.value)} rows={2} className={inputCls} />
            </Field>
            <Field label="Regression" cls={labelCls}>
              <textarea value={form.regression} onChange={(e) => update('regression', e.target.value)} rows={2} className={inputCls} />
            </Field>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {exercise && (
                <button
                  type="button"
                  onClick={() => onDeactivate(exercise)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Deactivate Exercise
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium px-4 py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium px-4 py-2 rounded-lg text-sm">
                {saving ? 'Saving...' : 'Save Exercise'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, cls }) {
  return (
    <div>
      <label className={cls}>{label}</label>
      {children}
    </div>
  )
}
