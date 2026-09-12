import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Logo from '../components/ui/Logo'

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()

  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  async function fetchAll() {
    const [{ data: exerciseData }, { data: profile }] = await Promise.all([
      supabase.from('exercises')
        .select('*')
        .eq('is_active', true)
        .order('name_en', { ascending: true }),
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    ])
    setExercises(exerciseData ?? [])
    setIsAdmin(profile?.is_admin ?? false)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter(e => {
      const haystack = [e.name_en, e.name_sw, e.description_en]
        .filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [exercises, search])

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
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
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
            <p className="text-gray-500 text-sm dark:text-gray-400">Try adjusting your search.</p>
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
                    {ex.video_url ? 'Has video' : 'No video'}
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
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ex.description_en}</p>
                )}
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
                {selected.name_sw && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selected.name_sw}</p>
                )}
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
              <Section label="Description" value={selected.description_en} />
            </div>
          </div>
        </div>
      )}

      {/* Admin Add/Edit Modal */}
      {showForm && (
        <ExerciseForm
          exercise={editing}
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

function ExerciseForm({ exercise, onClose, onSave, onDeactivate }) {
  const [form, setForm] = useState({
    name_en: exercise?.name_en ?? '',
    name_sw: exercise?.name_sw ?? '',
    description_en: exercise?.description_en ?? '',
    video_url: exercise?.video_url ?? ''
  })
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
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

          <Field label="Video URL" cls={labelCls}>
            <input value={form.video_url} onChange={(e) => update('video_url', e.target.value)} className={inputCls} placeholder="https://..." />
          </Field>

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
