import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AddPatient() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    diagnosis: '',
    language: 'sw',
    notes: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let phone = form.phone_number.replace(/[\s\-()]/g, '').trim()
    if (phone.startsWith('0')) {
      phone = '+255' + phone.slice(1)
    } else if (!phone.startsWith('+')) {
      phone = '+' + phone
    }

    const { error: insertError } = await supabase
      .from('patients')
      .insert({
        physio_id: user.id,
        full_name: form.full_name.trim(),
        phone_number: phone,
        diagnosis: form.diagnosis.trim(),
        language: form.language,
        notes: form.notes.trim()
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
        <h1 className="font-bold text-gray-900 dark:text-white">Add New Patient</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Patient Details
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            The patient will receive WhatsApp messages at the phone number you provide.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 
                            rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full name
              </label>
              <input
                type="text"
                name="full_name"
                required
                value={form.full_name}
                onChange={handleChange}
                placeholder="Juma Mwangi"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                           text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone number (WhatsApp)
              </label>
              <input
                type="tel"
                name="phone_number"
                required
                value={form.phone_number}
                onChange={handleChange}
                placeholder="0712345678 or +255712345678"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                           text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Tanzanian numbers starting with 0 will be auto-converted to +255
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Diagnosis
              </label>
              <input
                type="text"
                name="diagnosis"
                required
                value={form.diagnosis}
                onChange={handleChange}
                placeholder="e.g. Stroke, Clubfoot, Low back pain, CTEV"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                           text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred language
              </label>
              <select
                name="language"
                value={form.language}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                           text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              >
                <option value="sw">Swahili</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional clinical notes..."
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                           text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2.5 rounded-lg 
                           text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 
                           disabled:bg-green-400 text-white font-medium 
                           py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Adding patient...' : 'Add patient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}