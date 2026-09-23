import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Stethoscope, HeartPulse, Target, Activity, ClipboardCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import Checkbox from '../components/ui/Checkbox'
import Button from '../components/ui/Button'

function FormSection({ icon: Icon, title, description, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" strokeWidth={2} />
        <h2 className="text-sm font-display font-semibold text-neutral-900 dark:text-white">{title}</h2>
      </div>
      {description && <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">{description}</p>}
      <div className="border-b border-neutral-100 dark:border-neutral-800 mb-5" />
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export default function AddPatient() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', age: '', gender: '', phone_number: '',
    emergency_name: '', emergency_phone: '',
    diagnosis: '', injury_date: '', referring_dr: '', previous_physio: '',
    medical_history: '', medications: '',
    treatment_goals: '', sessions_per_week: '', expected_weeks: '',
    language: 'sw', reminder_time: '',
    pain_score: '', mobility_status: '',
    consent_messages: false, consent_data: false
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  function buildNotes() {
    const parts = []
    if (form.age || form.gender || form.emergency_name || form.emergency_phone) {
      const info = []
      if (form.age) info.push(`Age: ${form.age}`)
      if (form.gender) info.push(`Gender: ${form.gender}`)
      const emergency = [form.emergency_name, form.emergency_phone].filter(Boolean).join(' ')
      if (emergency) info.push(`Emergency: ${emergency}`)
      parts.push(info.join(' | '))
    }
    if (form.medical_history || form.medications) {
      const clinical = []
      if (form.medical_history) clinical.push(`Medical History: ${form.medical_history}`)
      if (form.medications) clinical.push(`Medications: ${form.medications}`)
      parts.push(clinical.join(' | '))
    }
    if (form.treatment_goals || form.sessions_per_week || form.expected_weeks) {
      const rehab = []
      if (form.treatment_goals) rehab.push(`Goals: ${form.treatment_goals}`)
      if (form.sessions_per_week) rehab.push(`Sessions/week: ${form.sessions_per_week}`)
      if (form.expected_weeks) rehab.push(`Duration: ${form.expected_weeks} weeks`)
      parts.push(rehab.join(' | '))
    }
    if (form.pain_score || form.mobility_status || form.referring_dr) {
      const status = []
      if (form.pain_score) status.push(`Pain: ${form.pain_score}/10`)
      if (form.mobility_status) status.push(`Mobility: ${form.mobility_status}`)
      if (form.referring_dr) status.push(`Referring: ${form.referring_dr}`)
      parts.push(status.join(' | '))
    }
    if (form.previous_physio) parts.push(`Previous PT: ${form.previous_physio}`)
    return parts.join('\n')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.consent_messages || !form.consent_data) {
      setError('Please check both consent boxes before submitting.')
      return
    }

    setLoading(true)

    let phone = form.phone_number.replace(/[\s\-()]/g, '').trim()
    if (phone.startsWith('0')) {
      phone = '+255' + phone.slice(1)
    } else if (!phone.startsWith('+')) {
      phone = '+' + phone
    }

    const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', user.id).single()

    const notes = buildNotes()
    const reminderTime = form.reminder_time
      ? form.reminder_time.length === 5 ? `${form.reminder_time}:00` : form.reminder_time
      : null

    const { error: insertError } = await supabase.from('patients').insert({
      physio_id: user.id,
      clinic_id: profile?.clinic_id ?? null,
      full_name: form.full_name.trim(),
      phone_number: phone,
      diagnosis: form.diagnosis.trim(),
      language: form.language,
      notes,
      reminder_time: reminderTime,
      status: 'active'
    })

    if (insertError) {
      if (
        insertError.code === '23505' &&
        (insertError.message ?? '').includes('patients_phone_number_active_unique')
      ) {
        setError('A patient with this phone number is already active. Please search for the existing record instead of creating a new one.')
      } else {
        setError(insertError.message)
      }
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/dashboard')} />

      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader title="Add New Patient" description="Record a new patient and start their WhatsApp follow-up." />

        <Card padding="lg">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 bg-danger-50 dark:bg-danger-500/10 border border-red-200 dark:border-red-900 text-danger-600 dark:text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            <FormSection icon={User} title="Personal Information">
              <Input label="Full name" name="full_name" required value={form.full_name} onChange={handleChange} placeholder="e.g. Juma Mwangi" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Age" type="number" name="age" required min="1" max="120" value={form.age} onChange={handleChange} placeholder="e.g. 45" />
                <Select label="Gender" name="gender" required value={form.gender} onChange={handleChange}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Select>
              </div>

              <Input
                label="Phone number (WhatsApp)"
                type="tel"
                name="phone_number"
                required
                value={form.phone_number}
                onChange={handleChange}
                placeholder="0712345678 or +255712345678"
                hint="Tanzanian numbers starting with 0 will be auto-converted to +255"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Emergency contact name" name="emergency_name" value={form.emergency_name} onChange={handleChange} placeholder="e.g. Amina Mwangi" />
                <Input label="Emergency contact phone" type="tel" name="emergency_phone" value={form.emergency_phone} onChange={handleChange} placeholder="+255712345678" />
              </div>
            </FormSection>

            <FormSection icon={Stethoscope} title="Clinical Information">
              <Input label="Primary diagnosis" name="diagnosis" required value={form.diagnosis} onChange={handleChange} placeholder="e.g. Low back pain, ACL tear, Frozen shoulder" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date of injury or onset" type="date" name="injury_date" value={form.injury_date} onChange={handleChange} />
                <Input label="Referring doctor or hospital" name="referring_dr" value={form.referring_dr} onChange={handleChange} placeholder="e.g. Dr. Mwamba, MNH" />
              </div>

              <Select label="Previous physiotherapy" name="previous_physio" value={form.previous_physio} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </Select>

              <Textarea label="Medical history" name="medical_history" value={form.medical_history} onChange={handleChange} placeholder="Diabetes, hypertension, previous surgeries..." />
              <Textarea label="Current medications" name="medications" value={form.medications} onChange={handleChange} placeholder="List any medications the patient is currently taking..." />
            </FormSection>

            <FormSection icon={HeartPulse} title="Clinical Profile" description="Optional clinical information completed by the treating professional.">
              <Select label="Mobility level" name="mobility_status" value={form.mobility_status} onChange={handleChange}>
                <option value="">Not set</option>
                <option value="Walks independently">Walks independently</option>
                <option value="Walks with support">Walks with support</option>
                <option value="Wheelchair user">Wheelchair user</option>
                <option value="Bedridden">Bedridden</option>
              </Select>
            </FormSection>

            <FormSection icon={Target} title="Rehabilitation Plan">
              <Textarea label="Treatment goals" name="treatment_goals" required value={form.treatment_goals} onChange={handleChange} placeholder="What does the patient want to achieve?" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Sessions per week" name="sessions_per_week" value={form.sessions_per_week} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="Daily">Daily</option>
                </Select>
                <Input label="Expected duration in weeks" type="number" name="expected_weeks" min="1" value={form.expected_weeks} onChange={handleChange} placeholder="e.g. 6" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Preferred language" name="language" required value={form.language} onChange={handleChange}>
                  <option value="sw">Swahili</option>
                  <option value="en">English</option>
                </Select>
                <Input
                  label="Reminder time"
                  type="time"
                  name="reminder_time"
                  value={form.reminder_time}
                  onChange={handleChange}
                  hint="The patient will be messaged at this time daily."
                />
              </div>
            </FormSection>

            <FormSection icon={Activity} title="Current Status">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Current pain score" name="pain_score" value={form.pain_score} onChange={handleChange}>
                  <option value="">Select pain level</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n} — {n === 1 ? 'Mild' : n === 10 ? 'Severe' : ''}</option>
                  ))}
                </Select>
                <Select label="Mobility status" name="mobility_status" value={form.mobility_status} onChange={handleChange}>
                  <option value="">Select mobility</option>
                  <option value="Walks independently">Walks independently</option>
                  <option value="Walks with support">Walks with support</option>
                  <option value="Wheelchair user">Wheelchair user</option>
                  <option value="Bedridden">Bedridden</option>
                </Select>
              </div>
            </FormSection>

            <FormSection icon={ClipboardCheck} title="Consent">
              <Checkbox
                name="consent_messages"
                checked={form.consent_messages}
                onChange={handleChange}
                label={<>Patient consents to receive WhatsApp messages <span className="text-danger-500">*</span></>}
              />
              <Checkbox
                name="consent_data"
                checked={form.consent_data}
                onChange={handleChange}
                label={<>Patient consents to data being stored securely <span className="text-danger-500">*</span></>}
              />
            </FormSection>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                {loading ? 'Adding patient…' : 'Add Patient'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
