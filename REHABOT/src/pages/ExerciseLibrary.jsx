import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Video, VideoOff, Plus, Dumbbell, Bone, PersonStanding, Footprints,
  Activity, Brain, Stethoscope, Zap, MoreHorizontal, ArrowLeft, FolderOpen
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Checkbox from '../components/ui/Checkbox'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Textarea from '../components/ui/Textarea'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'

// Category `icon` is a plain string stored in the DB (see the seed migration)
// so adding a category later never requires a code change — only icons a
// physio has actually chosen render specially; anything else, including a
// category added without picking one, falls back to Dumbbell.
const CATEGORY_ICONS = {
  bone: Bone,
  'person-standing': PersonStanding,
  dumbbell: Dumbbell,
  footprints: Footprints,
  activity: Activity,
  brain: Brain,
  stethoscope: Stethoscope,
  zap: Zap,
  'more-horizontal': MoreHorizontal
}

function CategoryIcon({ icon, className }) {
  const Icon = CATEGORY_ICONS[icon] || Dumbbell
  return <Icon className={className} strokeWidth={1.75} />
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const DIFFICULTY_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const DIFFICULTY_VARIANT = { beginner: 'success', intermediate: 'warning', danger: 'danger', advanced: 'danger' }

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [exercises, setExercises] = useState([])
  const [categoryMap, setCategoryMap] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // null = category grid view; a category row, or the string 'uncategorized',
  // = inside that category's exercise list.
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')

  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  async function fetchAll() {
    const [{ data: catData }, { data: exerciseData }, { data: mapData }, { data: profile }] = await Promise.all([
      supabase.from('exercise_categories').select('*').eq('is_active', true).order('display_order'),
      supabase.from('exercises').select('*').eq('is_active', true).order('name_en', { ascending: true }),
      supabase.from('exercise_category_map').select('exercise_id, category_id'),
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    ])
    setCategories(catData ?? [])
    setExercises(exerciseData ?? [])
    setCategoryMap(mapData ?? [])
    setIsAdmin(profile?.is_admin ?? false)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exerciseIdsByCategory = useMemo(() => {
    const m = new Map()
    for (const row of categoryMap) {
      if (!m.has(row.category_id)) m.set(row.category_id, new Set())
      m.get(row.category_id).add(row.exercise_id)
    }
    return m
  }, [categoryMap])

  const categoryIdsByExercise = useMemo(() => {
    const m = new Map()
    for (const row of categoryMap) {
      if (!m.has(row.exercise_id)) m.set(row.exercise_id, [])
      m.get(row.exercise_id).push(row.category_id)
    }
    return m
  }, [categoryMap])

  const categorizedExerciseIds = useMemo(() => new Set(categoryMap.map((r) => r.exercise_id)), [categoryMap])
  const uncategorizedExercises = useMemo(
    () => exercises.filter((ex) => !categorizedExerciseIds.has(ex.id)),
    [exercises, categorizedExerciseIds]
  )

  const categoryExercises = useMemo(() => {
    if (!activeCategory) return []
    if (activeCategory === 'uncategorized') return uncategorizedExercises
    const ids = exerciseIdsByCategory.get(activeCategory.id) ?? new Set()
    return exercises.filter((ex) => ids.has(ex.id))
  }, [activeCategory, exercises, exerciseIdsByCategory, uncategorizedExercises])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categoryExercises.filter((ex) => {
      if (q && !([ex.name_en, ex.name_sw, ex.description_en].filter(Boolean).join(' ').toLowerCase().includes(q))) return false
      if (difficultyFilter && ex.difficulty !== difficultyFilter) return false
      if (equipmentFilter && !(ex.equipment ?? '').toLowerCase().includes(equipmentFilter.toLowerCase())) return false
      return true
    })
  }, [categoryExercises, search, difficultyFilter, equipmentFilter])

  function openCategory(cat) {
    setActiveCategory(cat)
    setSearch('')
    setDifficultyFilter('')
    setEquipmentFilter('')
  }

  function openForm(exercise = null) {
    setEditing(exercise)
    setShowForm(true)
  }

  async function handleSave(payload, categoryIds) {
    let exerciseId = editing?.id
    if (exerciseId) {
      await supabase.from('exercises').update(payload).eq('id', exerciseId)
    } else {
      const { data } = await supabase
        .from('exercises')
        .insert({ ...payload, is_global: true, created_by: user.id })
        .select()
        .single()
      exerciseId = data?.id
    }
    if (exerciseId) {
      // Recompute the category mapping wholesale — simplest correct way to
      // reconcile "checked" state from the form with exercise_category_map.
      await supabase.from('exercise_category_map').delete().eq('exercise_id', exerciseId)
      if (categoryIds.length > 0) {
        await supabase.from('exercise_category_map').insert(
          categoryIds.map((category_id) => ({ exercise_id: exerciseId, category_id }))
        )
      }
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

  const headerTitle = !activeCategory
    ? 'Rehabilitation Exercise Library'
    : activeCategory === 'uncategorized'
      ? 'Uncategorized Exercises'
      : `${activeCategory.name} Exercises`

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => (activeCategory ? setActiveCategory(null) : navigate('/dashboard'))} />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
        {activeCategory && (
          <button
            onClick={() => setActiveCategory(null)}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> All categories
          </button>
        )}

        <PageHeader
          title={headerTitle}
          description={
            !activeCategory
              ? 'Browse exercises by condition or body region.'
              : activeCategory === 'uncategorized'
                ? 'Exercises not yet assigned to a category — assign one so they surface here.'
                : activeCategory.description
          }
          action={isAdmin && <Button icon={Plus} onClick={() => openForm(null)}>New Exercise</Button>}
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !activeCategory ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => openCategory(cat)}
                className="text-left bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-card p-5 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mb-3">
                  <CategoryIcon icon={cat.icon} className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-display font-semibold text-neutral-900 dark:text-white text-base mb-1">{cat.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {exerciseIdsByCategory.get(cat.id)?.size ?? 0} exercise{(exerciseIdsByCategory.get(cat.id)?.size ?? 0) === 1 ? '' : 's'}
                </p>
              </button>
            ))}

            {uncategorizedExercises.length > 0 && (
              <button
                onClick={() => openCategory('uncategorized')}
                className="text-left bg-white dark:bg-surface-dark-raised rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <FolderOpen className="w-5 h-5 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} />
                </div>
                <h3 className="font-display font-semibold text-neutral-900 dark:text-white text-base mb-1">Uncategorized</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {uncategorizedExercises.length} exercise{uncategorizedExercises.length === 1 ? '' : 's'}
                </p>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input
                icon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                className="flex-1"
              />
              <Select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="sm:w-44">
                <option value="">All difficulties</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
              </Select>
              <Input
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                placeholder="Equipment…"
                className="sm:w-44"
              />
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              {filtered.length} exercise{filtered.length === 1 ? '' : 's'}
            </p>

            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800">
                <EmptyState
                  icon={Dumbbell}
                  title="No exercises yet"
                  description={isAdmin ? 'Add the first exercise for this category.' : 'No exercises match your search.'}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => setSelected(ex)}
                    className="text-left bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-card p-5 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                  >
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={ex.video_url ? 'primary' : 'neutral'} dot>
                          {ex.video_url ? 'Has video' : 'No video'}
                        </Badge>
                        {ex.difficulty && <Badge variant={DIFFICULTY_VARIANT[ex.difficulty]}>{DIFFICULTY_LABEL[ex.difficulty]}</Badge>}
                      </div>
                      {isAdmin && (
                        <span
                          onClick={(e) => { e.stopPropagation(); openForm(ex) }}
                          className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                        >
                          Edit
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-semibold text-neutral-900 dark:text-white text-base mb-1">{ex.name_en}</h3>
                    {ex.name_sw && <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">{ex.name_sw}</p>}
                    {ex.description_en && <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 mb-2">{ex.description_en}</p>}
                    {ex.equipment && <p className="text-xs text-neutral-400 dark:text-neutral-500">Equipment: {ex.equipment}</p>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name_en} size="lg">
        {selected && (
          <>
            {selected.name_sw && <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-3 mb-4">{selected.name_sw}</p>}
            {selected.video_url ? (
              <div className="bg-neutral-900 aspect-video rounded-lg overflow-hidden mb-4">
                <video src={selected.video_url} poster={selected.thumbnail_url || undefined} controls className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-video bg-neutral-100 dark:bg-white/5 rounded-lg flex flex-col items-center justify-center text-neutral-400 text-sm gap-2 mb-4">
                <VideoOff className="w-6 h-6" strokeWidth={1.75} />
                No demonstration video available
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              {selected.difficulty && <Badge variant={DIFFICULTY_VARIANT[selected.difficulty]}>{DIFFICULTY_LABEL[selected.difficulty]}</Badge>}
              {selected.equipment && <Badge>Equipment: {selected.equipment}</Badge>}
              {selected.duration_minutes && <Badge>{selected.duration_minutes} min</Badge>}
              {(selected.default_sets || selected.default_reps) && (
                <Badge variant="primary">Template: {selected.default_sets ?? '—'} × {selected.default_reps ?? '—'}{selected.default_frequency_per_week ? `, ${selected.default_frequency_per_week}x/week` : ''}</Badge>
              )}
            </div>

            {selected.description_en && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Description</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.description_en}</p>
              </div>
            )}
            {selected.instructions && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Instructions</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.instructions}</p>
              </div>
            )}
            {selected.precautions && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-warning-600 dark:text-amber-400 uppercase tracking-wide mb-1">Precautions</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.precautions}</p>
              </div>
            )}
            {selected.contraindications && (
              <div>
                <div className="text-[11px] font-semibold text-danger-500 uppercase tracking-wide mb-1">Contraindications</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.contraindications}</p>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null) }} title={editing ? 'Edit Exercise' : 'New Exercise'} size="lg">
        <ExerciseForm
          exercise={editing}
          categories={categories}
          initialCategoryIds={editing ? (categoryIdsByExercise.get(editing.id) ?? []) : (activeCategory && activeCategory !== 'uncategorized' ? [activeCategory.id] : [])}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
          onDeactivate={handleDeactivate}
        />
      </Modal>
    </div>
  )
}

function ExerciseForm({ exercise, categories, initialCategoryIds, onClose, onSave, onDeactivate }) {
  const [form, setForm] = useState({
    name_en: exercise?.name_en ?? '',
    name_sw: exercise?.name_sw ?? '',
    description_en: exercise?.description_en ?? '',
    instructions: exercise?.instructions ?? '',
    difficulty: exercise?.difficulty ?? '',
    equipment: exercise?.equipment ?? '',
    duration_minutes: exercise?.duration_minutes ?? '',
    default_sets: exercise?.default_sets ?? '',
    default_reps: exercise?.default_reps ?? '',
    default_frequency_per_week: exercise?.default_frequency_per_week ?? '',
    precautions: exercise?.precautions ?? '',
    contraindications: exercise?.contraindications ?? '',
    video_url: exercise?.video_url ?? '',
    thumbnail_url: exercise?.thumbnail_url ?? '',
    is_active: exercise?.is_active ?? true
  })
  const [categoryIds, setCategoryIds] = useState(initialCategoryIds)
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleCategory(id) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const toIntOrNull = (v) => (v === '' || v === null || v === undefined ? null : parseInt(v, 10))
    const payload = {
      ...form,
      difficulty: form.difficulty || null,
      duration_minutes: toIntOrNull(form.duration_minutes),
      default_sets: toIntOrNull(form.default_sets),
      default_reps: toIntOrNull(form.default_reps),
      default_frequency_per_week: toIntOrNull(form.default_frequency_per_week)
    }
    await onSave(payload, categoryIds)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Exercise name (English)" required value={form.name_en} onChange={(e) => update('name_en', e.target.value)} />
        <Input label="Name (Swahili)" value={form.name_sw} onChange={(e) => update('name_sw', e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Categories</label>
        <div className="grid grid-cols-2 gap-2 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg max-h-40 overflow-y-auto">
          {categories.map((cat) => (
            <Checkbox
              key={cat.id}
              label={cat.name}
              checked={categoryIds.includes(cat.id)}
              onChange={() => toggleCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      <Textarea label="Description" rows={2} value={form.description_en} onChange={(e) => update('description_en', e.target.value)} />
      <Textarea label="Instructions" rows={3} value={form.instructions} onChange={(e) => update('instructions', e.target.value)} placeholder="Step-by-step cues for the patient" />

      <div className="grid grid-cols-2 gap-4">
        <Select label="Difficulty" value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)}>
          <option value="">Not set</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
        </Select>
        <Input label="Equipment" value={form.equipment} onChange={(e) => update('equipment', e.target.value)} placeholder="e.g. Resistance band, or none" />
      </div>

      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Default dosage — a starting template only; the physiotherapist sets the actual prescription per patient.</p>
        <div className="grid grid-cols-4 gap-3">
          <Input label="Sets" type="number" min="0" value={form.default_sets} onChange={(e) => update('default_sets', e.target.value)} />
          <Input label="Reps" type="number" min="0" value={form.default_reps} onChange={(e) => update('default_reps', e.target.value)} />
          <Input label="×/week" type="number" min="0" value={form.default_frequency_per_week} onChange={(e) => update('default_frequency_per_week', e.target.value)} />
          <Input label="Duration (min)" type="number" min="0" value={form.duration_minutes} onChange={(e) => update('duration_minutes', e.target.value)} />
        </div>
      </div>

      <Textarea label="Precautions" rows={2} value={form.precautions} onChange={(e) => update('precautions', e.target.value)} />
      <Textarea label="Contraindications" rows={2} value={form.contraindications} onChange={(e) => update('contraindications', e.target.value)} />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Video URL" value={form.video_url} onChange={(e) => update('video_url', e.target.value)} placeholder="https://…" icon={Video} />
        <Input label="Thumbnail URL" value={form.thumbnail_url} onChange={(e) => update('thumbnail_url', e.target.value)} placeholder="https://… (optional)" />
      </div>

      {exercise && (
        <Checkbox label="Active (visible in the library)" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} />
      )}

      <div className="flex items-center justify-between pt-2">
        <div>
          {exercise && (
            <Button type="button" variant="danger-ghost" size="sm" onClick={() => onDeactivate(exercise)}>
              Deactivate Exercise
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Exercise</Button>
        </div>
      </div>
    </form>
  )
}
