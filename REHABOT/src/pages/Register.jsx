import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    clinic_name: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          clinic_name: form.clinic_name
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/check-email')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 
                      w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-600 rounded-xl mx-auto mb-3 
                          flex items-center justify-center">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Start your 14-day free trial</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 
                          rounded-lg px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your full name
            </label>
            <input
              type="text"
              name="full_name"
              required
              value={form.full_name}
              onChange={handleChange}
              placeholder="Elian Darva"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 
                         text-sm focus:outline-none focus:ring-2 focus:ring-green-500 
                         focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic name
            </label>
            <input
              type="text"
              name="clinic_name"
              required
              value={form.clinic_name}
              onChange={handleChange}
              placeholder="CCBRT Physiotherapy"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 
                         text-sm focus:outline-none focus:ring-2 focus:ring-green-500 
                         focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@clinic.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 
                         text-sm focus:outline-none focus:ring-2 focus:ring-green-500 
                         focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 
                         text-sm focus:outline-none focus:ring-2 focus:ring-green-500 
                         focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 
                       text-white font-medium py-2.5 rounded-lg text-sm 
                       transition-colors duration-200"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}