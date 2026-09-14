import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', clinic_name: '', phone_number: '', language: 'en' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [clinicId, setClinicId] = useState(null)

  useEffect(() => {
    if (!user) return
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, clinic_name, clinic_id, phone_number, language')
        .eq('id', user.id)
        .single()
      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          clinic_name: data.clinic_name ?? '',
          phone_number: data.phone_number ?? '',
          language: data.language ?? 'en'
        })
        setClinicId(data.clinic_id ?? null)
      }
      setFetching(false)
    }
    fetchProfile()
  }, [user])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const clinicName = form.clinic_name.trim()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim(), clinic_name: clinicName, phone_number: form.phone_number.trim(), language: form.language })
      .eq('id', user.id)

    let clinicError = null
    if (clinicId) {
      ;({ error: clinicError } = await supabase.from('clinics').update({ name: clinicName }).eq('id', clinicId))
    }

    setLoading(false)

    if (updateError || clinicError) {
      setError(updateError?.message ?? clinicError?.message)
    } else {
      setSuccess('Settings saved successfully.')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/dashboard')} />

      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader title="Settings" description="Manage your profile and clinic information." />

        <Card padding="lg">
          <CardHeader title="Profile Settings" description="Update your physio profile information." />

          {fetching ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <>
              {success && (
                <div role="status" className="flex items-start gap-2.5 bg-success-50 dark:bg-success-500/10 border border-green-200 dark:border-green-900 text-success-600 dark:text-green-300 rounded-lg px-4 py-3 text-sm mb-6">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  {success}
                </div>
              )}
              {error && (
                <div role="alert" className="flex items-start gap-2.5 bg-danger-50 dark:bg-danger-500/10 border border-red-200 dark:border-red-900 text-danger-600 dark:text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4" noValidate>
                <Input label="Full name" name="full_name" required value={form.full_name} onChange={handleChange} />
                <Input label="Clinic name" name="clinic_name" value={form.clinic_name} onChange={handleChange} />
                <Input label="Phone number" type="tel" name="phone_number" value={form.phone_number} onChange={handleChange} />
                <Select label="Language preference" name="language" value={form.language} onChange={handleChange}>
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </Select>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate('/dashboard')}>Cancel</Button>
                  <Button type="submit" className="flex-1" loading={loading}>Save Changes</Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
