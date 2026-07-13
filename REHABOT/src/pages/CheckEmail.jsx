import { Link } from 'react-router-dom'

export default function CheckEmail() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 
                      w-full max-w-md p-8 text-center">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full mx-auto mb-4 
                        flex items-center justify-center">
          <span className="text-2xl">📧</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          We sent a confirmation link to your email address. 
          Click it to activate your account then come back to sign in.
        </p>
        <Link
          to="/login"
          className="text-green-600 font-medium text-sm hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}