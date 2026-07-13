import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    clinic_name: '',
    phone_number: '',
    language: 'en'
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const saved = localStorage.getItem('darkMode') === 'true'
  const [darkMode, setDarkMode] = useState(saved)

  useEffect(() => {
    if (!user) return
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          clinic_name: data.clinic_name ?? '',
          phone_number: data.phone_number ?? '',
          language: data.language ?? 'en'
        })
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

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: form.full_name.trim(),
        clinic_name: form.clinic_name.trim(),
        phone_number: form.phone_number.trim(),
        language: form.language
      })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Settings saved successfully!')
    }
  }

  function handleDarkModeToggle() {
    const next = !darkMode
    setDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent 
                        rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 
                      px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← Back
          </button>
          <Logo size="sm" />
        </div>
        <h1 className="font-bold text-gray-900 dark:text-white text-sm">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Profile Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Update your physio profile information.
          </p>

          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 
                            text-green-700 dark:text-green-300 rounded-lg px-4 py-3 text-sm mb-6">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 
                            text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
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
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white 
                           rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clinic name
              </label>
              <input
                type="text"
                name="clinic_name"
                value={form.clinic_name}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white 
                           rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white 
                           rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language preference
              </label>
              <select
                name="language"
                value={form.language}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white 
                           rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
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
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Dark Mode Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Dark Mode
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Switch between light and dark appearance.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Dark Mode
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              onClick={handleDarkModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors 
                          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                          dark:focus:ring-offset-gray-800 ${darkMode ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform 
                            ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
