import { Link } from 'react-router-dom'

export default function CheckEmail() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 
                      w-full max-w-md p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-4 
                        flex items-center justify-center">
          <span className="text-2xl">📧</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-6">
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