import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function AddPatient() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useTheme()
  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    phone_number: '',
    emergency_name: '',
    emergency_phone: '',
    diagnosis: '',
    injury_date: '',
    referring_dr: '',
    previous_physio: '',
    medical_history: '',
    medications: '',
    treatment_goals: '',
    sessions_per_week: '',
    expected_weeks: '',
    language: 'sw',
    reminder_time: '',
    pain_score: '',
    mobility_status: '',
    consent_messages: false,
    consent_data: false
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
    if (form.previous_physio) {
      parts.push(`Previous PT: ${form.previous_physio}`)
    }
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id')
      .eq('id', user.id)
      .single()

    const notes = buildNotes()

    const reminderTime = form.reminder_time
      ? form.reminder_time.length === 5 ? `${form.reminder_time}:00` : form.reminder_time
      : null

    const { error: insertError } = await supabase
      .from('patients')
      .insert({
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
      setError(insertError.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 
                      flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ← Back
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white flex-1">Add New Patient</h1>
        <button onClick={toggleDarkMode} className="text-xl cursor-pointer hover:opacity-75 transition-opacity">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 
                            rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Section 1 */}
            <div>
              <h2 className="text-base font-bold text-[#16a34a] dark:text-green-400 mb-1">
                👤 Personal Information
              </h2>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-5" />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="e.g. Juma Mwangi"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      required
                      min="1"
                      max="120"
                      value={form.age}
                      onChange={handleChange}
                      placeholder="e.g. 45"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      required
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone number WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    required
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder="0712345678 or +255712345678"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Tanzanian numbers starting with 0 will be auto-converted to +255
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Emergency contact name
                    </label>
                    <input
                      type="text"
                      name="emergency_name"
                      value={form.emergency_name}
                      onChange={handleChange}
                      placeholder="e.g. Amina Mwangi"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Emergency contact phone
                    </label>
                    <input
                      type="tel"
                      name="emergency_phone"
                      value={form.emergency_phone}
                      onChange={handleChange}
                      placeholder="+255712345678"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-base font-bold text-[#16a34a] dark:text-green-400 mb-1">
                🏥 Clinical Information
              </h2>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-5" />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary diagnosis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="diagnosis"
                    required
                    value={form.diagnosis}
                    onChange={handleChange}
                    placeholder="e.g. Low back pain, ACL tear, Frozen shoulder"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of injury or onset
                    </label>
                    <input
                      type="date"
                      name="injury_date"
                      value={form.injury_date}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Referring doctor or hospital
                    </label>
                    <input
                      type="text"
                      name="referring_dr"
                      value={form.referring_dr}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Mwamba, MNH"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Previous physiotherapy
                  </label>
                  <select
                    name="previous_physio"
                    value={form.previous_physio}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Medical history
                  </label>
                  <textarea
                    name="medical_history"
                    value={form.medical_history}
                    onChange={handleChange}
                    placeholder="diabetes, hypertension, previous surgeries..."
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current medications
                  </label>
                  <textarea
                    name="medications"
                    value={form.medications}
                    onChange={handleChange}
                    placeholder="List any medications the patient is currently taking..."
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Clinical Profile */}
            <div>
              <h2 className="text-base font-bold text-[#16a34a] dark:text-green-400 mb-1">
                🩺 Clinical Profile
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Optional clinical information completed by the treating professional.
              </p>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-5" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobility level
                  </label>
                  <select
                    name="mobility_status"
                    value={form.mobility_status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3
                               text-sm focus:outline-none focus:ring-2
                               focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Not set</option>
                    <option value="Walks independently">Walks independently</option>
                    <option value="Walks with support">Walks with support</option>
                    <option value="Wheelchair user">Wheelchair user</option>
                    <option value="Bedridden">Bedridden</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-base font-bold text-[#16a34a] dark:text-green-400 mb-1">
                🎯 Rehabilitation Plan
              </h2>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-5" />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Treatment goals <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="treatment_goals"
                    required
                    value={form.treatment_goals}
                    onChange={handleChange}
                    placeholder="what does the patient want to achieve?"
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sessions per week
                    </label>
                    <select
                      name="sessions_per_week"
                      value={form.sessions_per_week}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="5">5</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expected duration in weeks
                    </label>
                    <input
                      type="number"
                      name="expected_weeks"
                      min="1"
                      value={form.expected_weeks}
                      onChange={handleChange}
                      placeholder="e.g. 6"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred language <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="language"
                      value={form.language}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="sw">Swahili</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reminder time
                    </label>
                    <input
                      type="time"
                      name="reminder_time"
                      value={form.reminder_time}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                                 text-sm focus:outline-none focus:ring-2 
                                 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Pick any time — the patient will be messaged at this time daily.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-base font-bold text-[#16a34a] dark:text-green-400 mb-1">
                📊 Current Status
              </h2>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-5" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current pain score
                  </label>
                  <select
                    name="pain_score"
                    value={form.pain_score}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select pain level</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n} — {n === 1 ? 'Mild' : n === 10 ? 'Severe' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobility status
                  </label>
                  <select
                    name="mobility_status"
                    value={form.mobility_status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 
                               text-sm focus:outline-none focus:ring-2 
                               focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select mobility</option>
                    <option value="Walks independently">Walks independently</option>
                    <option value="Walks with support">Walks with support</option>
                    <option value="Wheelchair user">Wheelchair user</option>
                    <option value="Bedridden">Bedridden</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-base font-bold text-[#16a34a] dark:text-green-400 mb-1">
                ✅ Consent
              </h2>
              <div className="border-b border-gray-200 dark:border-gray-700 mb-5" />

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent_messages"
                    checked={form.consent_messages}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 
                               rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Patient consents to receive WhatsApp messages <span className="text-red-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent_data"
                    checked={form.consent_data}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 
                               rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Patient consents to data being stored securely <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-3 rounded-lg 
                           text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 
                           disabled:bg-green-400 text-white font-medium 
                           py-3 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Adding patient...' : 'Add Patient'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
