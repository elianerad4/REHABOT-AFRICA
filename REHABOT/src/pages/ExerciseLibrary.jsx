import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Video, VideoOff, Plus, Dumbbell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Textarea from '../components/ui/Textarea'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'

export default function ExerciseLibrary() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  async function fetchAll() {
    const [{ data: exerciseData }, { data: profile }] = await Promise.all([
      supabase.from('exercises').select('*').eq('is_active', true).order('name_en', { ascending: true }),
      supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    ])
    setExercises(exerciseData ?? [])
    setIsAdmin(profile?.is_admin ?? false)
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter((e) => [e.name_en, e.name_sw, e.description_en].filter(Boolean).join(' ').toLowerCase().includes(q))
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/dashboard')} />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader
          title="Exercise Library"
          description="Clinician-facing repository. Select exercises based on patient assessment."
          action={isAdmin && <Button icon={Plus} onClick={() => openForm(null)}>New Exercise</Button>}
        />

        <Input
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="mb-4 max-w-md"
        />

        {!loading && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            {filtered.length} exercise{filtered.length === 1 ? '' : 's'}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800">
            <EmptyState icon={Dumbbell} title="No exercises found" description="Try adjusting your search." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelected(ex)}
                className="text-left bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-card p-5 hover:border-primary-300 dark:hover:border-primary-500/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={ex.video_url ? 'primary' : 'neutral'} dot>
                    {ex.video_url ? 'Has video' : 'No video'}
                  </Badge>
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
                {ex.description_en && <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{ex.description_en}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name_en} size="lg">
        {selected && (
          <>
            {selected.name_sw && <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-3 mb-4">{selected.name_sw}</p>}
            {selected.video_url ? (
              <div className="bg-neutral-900 aspect-video rounded-lg overflow-hidden mb-4">
                <video src={selected.video_url} controls className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-video bg-neutral-100 dark:bg-white/5 rounded-lg flex flex-col items-center justify-center text-neutral-400 text-sm gap-2 mb-4">
                <VideoOff className="w-6 h-6" strokeWidth={1.75} />
                No demonstration video available
              </div>
            )}
            {selected.description_en && (
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Description</div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.description_en}</p>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null) }} title={editing ? 'Edit Exercise' : 'New Exercise'} size="lg">
        <ExerciseForm exercise={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={handleSave} onDeactivate={handleDeactivate} />
      </Modal>
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
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Exercise name (English)" required value={form.name_en} onChange={(e) => update('name_en', e.target.value)} />
        <Input label="Name (Swahili)" value={form.name_sw} onChange={(e) => update('name_sw', e.target.value)} />
      </div>
      <Textarea label="Description" rows={2} value={form.description_en} onChange={(e) => update('description_en', e.target.value)} />
      <Input label="Video URL" value={form.video_url} onChange={(e) => update('video_url', e.target.value)} placeholder="https://…" icon={Video} />

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
