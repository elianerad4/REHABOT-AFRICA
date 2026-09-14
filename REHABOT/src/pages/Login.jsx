import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Logo from '../components/ui/Logo'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white dark:bg-surface-dark-raised rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-display font-bold text-neutral-900 dark:text-white">Sign in</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Access your clinic dashboard</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 bg-danger-50 dark:bg-danger-500/10 border border-red-200 dark:border-red-900 text-danger-600 dark:text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
            No account yet?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
          By signing in you agree to our{' '}
          <Link to="/privacy" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
