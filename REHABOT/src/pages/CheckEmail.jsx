import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import Logo from '../components/ui/Logo'

export default function CheckEmail() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <div className="bg-white dark:bg-surface-dark-raised rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-8 text-center">
          <div className="w-12 h-12 bg-primary-50 dark:bg-primary-500/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-5.5 h-5.5 text-primary-600 dark:text-primary-400" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-2">Check your email</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
            We sent a confirmation link to your email address.
            Click it to activate your account, then come back to sign in.
          </p>
          <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
