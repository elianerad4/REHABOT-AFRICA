import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Logo from '../components/ui/Logo'
import Input from '../components/ui/Input'
import Checkbox from '../components/ui/Checkbox'
import Button from '../components/ui/Button'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', clinic_name: '', email: '', password: '' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    if (!agreed) {
      setError('Please accept the Privacy Policy to continue.')
      return
    }

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
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white dark:bg-surface-dark-raised rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-display font-bold text-neutral-900 dark:text-white">Create your account</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Start your 14-day free trial</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 bg-danger-50 dark:bg-danger-500/10 border border-red-200 dark:border-red-900 text-danger-600 dark:text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <Input
              label="Your full name"
              name="full_name"
              required
              autoComplete="name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Elian Darva"
            />
            <Input
              label="Clinic name"
              name="clinic_name"
              required
              value={form.clinic_name}
              onChange={handleChange}
              placeholder="CCBRT Physiotherapy"
            />
            <Input
              label="Email"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@clinic.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
            />

            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              label={
                <>
                  I agree to the{' '}
                  <Link to="/privacy" target="_blank" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                    Privacy Policy
                  </Link>
                </>
              }
            />

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
