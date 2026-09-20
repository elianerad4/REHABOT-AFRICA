import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Sparkles, ShieldCheck, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Tabs from '../components/ui/Tabs'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import { Table, THead, Th, Tr, Td } from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeleton'

const STATUS_VARIANT = { active: 'success', trial: 'warning', expired: 'danger' }

function slugify(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState({ totalPhysios: 0, totalPatients: 0, totalMessages: 0, activePatients: 0, trialPhysios: 0, activePhysios: 0 })
  const [physios, setPhysios] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryCounts, setCategoryCounts] = useState({})
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  async function fetchCategories() {
    setCategoriesLoading(true)
    const [{ data: categoryData }, { data: mapData }] = await Promise.all([
      supabase.from('exercise_categories').select('*').order('display_order'),
      supabase.from('exercise_category_map').select('category_id')
    ])
    const counts = {}
    for (const row of mapData ?? []) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
    setCategories(categoryData ?? [])
    setCategoryCounts(counts)
    setCategoriesLoading(false)
  }

  async function saveCategory(form) {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || null,
      body_region: form.body_region.trim() || null,
      icon: form.icon.trim() || null,
      display_order: parseInt(form.display_order, 10) || 0
    }
    if (editingCategory?.id) {
      await supabase.from('exercise_categories').update(payload).eq('id', editingCategory.id)
    } else {
      await supabase.from('exercise_categories').insert(payload)
    }
    setShowCategoryForm(false)
    setEditingCategory(null)
    fetchCategories()
  }

  async function toggleCategoryActive(category) {
    await supabase.from('exercise_categories').update({ is_active: !category.is_active }).eq('id', category.id)
    fetchCategories()
  }

  async function fetchAdminData() {
    const [{ data: physioData }, { data: patientData }, { data: messageData }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, status, physio_id, created_at'),
      supabase.from('message_logs').select('id, direction, sent_at')
    ])

    const physioList = physioData ?? []
    const patientList = patientData ?? []
    const messageList = messageData ?? []

    setStats({
      totalPhysios: physioList.filter((p) => !p.is_admin).length,
      totalPatients: patientList.length,
      totalMessages: messageList.length,
      activePatients: patientList.filter((p) => p.status === 'active').length,
      trialPhysios: physioList.filter((p) => p.subscription_status === 'trial' && !p.is_admin).length,
      activePhysios: physioList.filter((p) => p.subscription_status === 'active' && !p.is_admin).length
    })

    const enriched = physioList
      .filter((p) => !p.is_admin)
      .map((p) => ({
        ...p,
        patientCount: patientList.filter((pt) => pt.physio_id === p.id).length,
        activePatients: patientList.filter((pt) => pt.physio_id === p.id && pt.status === 'active').length,
        messageCount: messageList.filter((m) => patientList.some((pt) => pt.id === m.patient_id && pt.physio_id === p.id)).length
      }))

    setPhysios(enriched)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    async function checkAdmin() {
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!data?.is_admin) {
        navigate('/dashboard')
        return
      }
      setAuthorized(true)
      fetchAdminData()
      fetchCategories()
    }
    checkAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function updateSubscription(physioId, status) {
    await supabase.from('profiles').update({ subscription_status: status }).eq('id', physioId)
    fetchAdminData()
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function trialDaysLeft(trialEndsAt) {
    if (!trialEndsAt) return 0
    const diff = Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  if (!user || (loading && !authorized)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
        <TopBar />
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  const expiringTrials = physios.filter((p) => p.subscription_status === 'trial' && trialDaysLeft(p.trial_ends_at) <= 7)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar
        context={
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-600 dark:text-amber-400 bg-warning-50 dark:bg-warning-500/10 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" strokeWidth={2.25} /> Admin
          </span>
        }
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader title="Rehabot Africa — Admin Panel" description="Overview of all clinics and platform activity." />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Physios" value={stats.totalPhysios} />
          <StatCard label="On Trial" value={stats.trialPhysios} tone="warning" />
          <StatCard label="Paying" value={stats.activePhysios} tone="success" />
          <StatCard label="Total Patients" value={stats.totalPatients} />
          <StatCard label="Active Patients" value={stats.activePatients} tone="success" />
          <StatCard label="Total Messages" value={stats.totalMessages} tone="primary" />
        </div>

        <Tabs
          className="mb-6"
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'clinics', label: 'Clinics' },
            { value: 'categories', label: 'Exercise Categories' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-warning-500" strokeWidth={2} />
                <h3 className="font-semibold text-neutral-900 dark:text-white">Trials Expiring Soon</h3>
              </div>
              {expiringTrials.length === 0 ? (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No trials expiring in the next 7 days.</p>
              ) : (
                <div className="space-y-3">
                  {expiringTrials.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{p.full_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.clinic_name}</p>
                      </div>
                      <span className="text-xs font-semibold text-danger-500">{trialDaysLeft(p.trial_ends_at)} days left</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary-500" strokeWidth={2} />
                <h3 className="font-semibold text-neutral-900 dark:text-white">Recent Signups</h3>
              </div>
              {physios.length === 0 ? (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No physios signed up yet.</p>
              ) : (
                <div className="space-y-3">
                  {physios.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{p.full_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.clinic_name}</p>
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(p.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'clinics' && (
          <Card padding="none">
            {physios.length === 0 ? (
              <EmptyState title="No clinics have signed up yet." />
            ) : (
              <Table>
                <THead>
                  <Th>Physio / Clinic</Th>
                  <Th>Patients</Th>
                  <Th>Joined</Th>
                  <Th>Trial Ends</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </THead>
                <tbody>
                  {physios.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <div className="font-medium text-neutral-900 dark:text-white">{p.full_name}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{p.clinic_name}</div>
                      </Td>
                      <Td>
                        <div className="text-neutral-900 dark:text-white">{p.patientCount} total</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{p.activePatients} active</div>
                      </Td>
                      <Td>{formatDate(p.created_at)}</Td>
                      <Td>
                        {p.trial_ends_at ? (
                          <span className={trialDaysLeft(p.trial_ends_at) <= 3 ? 'text-danger-500 font-medium' : ''}>
                            {formatDate(p.trial_ends_at)}
                            {p.subscription_status === 'trial' && (
                              <span className="block text-xs">{trialDaysLeft(p.trial_ends_at)} days left</span>
                            )}
                          </span>
                        ) : 'N/A'}
                      </Td>
                      <Td>
                        <Badge variant={STATUS_VARIANT[p.subscription_status] ?? 'neutral'}>{p.subscription_status}</Badge>
                      </Td>
                      <Td>
                        <select
                          value={p.subscription_status}
                          onChange={(e) => updateSubscription(p.id, e.target.value)}
                          className="text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 bg-white dark:bg-surface-dark-raised dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                        </select>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        )}

        {activeTab === 'categories' && (
          <Card padding="none">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Exercise Categories</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Organizational categories for the exercise library. Adding one here makes it available
                  immediately — no code changes needed.
                </p>
              </div>
              <Button
                size="sm"
                icon={Plus}
                onClick={() => { setEditingCategory(null); setShowCategoryForm((v) => !v) }}
              >
                New Category
              </Button>
            </div>

            {showCategoryForm && (
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-primary-50/40 dark:bg-primary-500/5">
                <CategoryForm
                  category={editingCategory}
                  onCancel={() => { setShowCategoryForm(false); setEditingCategory(null) }}
                  onSave={saveCategory}
                />
              </div>
            )}

            {categoriesLoading ? (
              <div className="p-5"><SkeletonCard /></div>
            ) : categories.length === 0 ? (
              <EmptyState title="No categories yet." />
            ) : (
              <Table>
                <THead>
                  <Th>Category</Th>
                  <Th>Slug</Th>
                  <Th>Body region</Th>
                  <Th>Exercises</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </THead>
                <tbody>
                  {categories.map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <div className="font-medium text-neutral-900 dark:text-white">{c.name}</div>
                      </Td>
                      <Td><span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{c.slug}</span></Td>
                      <Td>{c.body_region ?? '—'}</Td>
                      <Td>{categoryCounts[c.id] ?? 0}</Td>
                      <Td>
                        <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                            onClick={() => { setEditingCategory(c); setShowCategoryForm(true) }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 hover:underline"
                            onClick={() => toggleCategoryActive(c)}
                          >
                            {c.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

function CategoryForm({ category, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    body_region: category?.body_region ?? '',
    icon: category?.icon ?? '',
    display_order: category?.display_order ?? 0
  })
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!!category?.slug)

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateName(value) {
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-neutral-900 dark:text-white text-sm">{category ? 'Edit Category' : 'New Category'}</h4>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-600">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Name" required value={form.name} onChange={(e) => updateName(e.target.value)} placeholder="e.g. Shoulder Pain" />
        <Input
          label="Slug"
          required
          value={form.slug}
          onChange={(e) => { setSlugTouched(true); update('slug', slugify(e.target.value)) }}
          placeholder="e.g. shoulder-pain"
        />
      </div>
      <Textarea label="Description" rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Body region" value={form.body_region} onChange={(e) => update('body_region', e.target.value)} placeholder="e.g. Shoulder" />
        <Input label="Icon key" value={form.icon} onChange={(e) => update('icon', e.target.value)} placeholder="e.g. dumbbell" />
        <Input label="Display order" type="number" value={form.display_order} onChange={(e) => update('display_order', e.target.value)} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" loading={saving}>Save Category</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
