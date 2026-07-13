import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    discharged: 0
  })

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  async function fetchPatients() {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('physio_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setPatients(data)
      setStats({
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
        paused: data.filter(p => p.status === 'paused').length,
        discharged: data.filter(p => p.status === 'discharged').length
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchPatients()
    }
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function getStatusColor(status) {
    if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
    if (status === 'paused') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
    if (status === 'discharged') return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent 
                          rounded-full animate-spin mx-auto mb-3 dark:border-green-500"></div>
          <p className="text-gray-500 text-sm dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 
                      flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span className="text-xs text-gray-400 border-l border-gray-200 
                           pl-4 hidden sm:block dark:text-gray-500 dark:border-gray-700">
            {profile?.clinic_name ?? 'Your Clinic'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block dark:text-gray-300">
            {profile?.full_name ?? user?.email}
          </span>
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-orange-600 font-medium hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
          >
            Admin
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium dark:text-gray-400 dark:hover:text-gray-300"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium dark:text-red-400 dark:hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good morning, {profile?.full_name?.split(' ')[0] ?? 'Doctor'} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1 dark:text-gray-400">
            Here is your patient overview for today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Patients', value: stats.total, color: 'text-gray-900 dark:text-white' },
            { label: 'Active', value: stats.active, color: 'text-green-600 dark:text-green-400' },
            { label: 'Paused', value: stats.paused, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Discharged', value: stats.discharged, color: 'text-gray-400 dark:text-gray-500' }
          ].map((stat) => (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center dark:bg-gray-800 dark:border-gray-700">
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Patient List Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Your Patients</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reports')}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 
                         text-sm font-medium px-4 py-2 rounded-lg transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Reports
            </button>
            <button
              onClick={() => navigate('/add-patient')}
              className="bg-green-600 hover:bg-green-700 text-white text-sm 
                         font-medium px-4 py-2 rounded-lg transition-colors dark:bg-green-500 dark:hover:bg-green-600"
            >
              + Add Patient
            </button>
          </div>
        </div>

        {/* Patient List */}
        {patients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center dark:bg-gray-800 dark:border-gray-700">
            <div className="text-4xl mb-3">🏥</div>
            <h3 className="font-semibold text-gray-900 mb-1 dark:text-white">No patients yet</h3>
            <p className="text-gray-500 text-sm mb-6 dark:text-gray-400">
              Add your first patient to start sending follow-up messages.
            </p>
            <button
              onClick={() => navigate('/add-patient')}
              className="bg-green-600 hover:bg-green-700 text-white text-sm 
                         font-medium px-6 py-2.5 rounded-lg transition-colors dark:bg-green-500 dark:hover:bg-green-600"
            >
              Add your first patient
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3 dark:text-gray-400">
                    Patient
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3 dark:text-gray-400">
                    Diagnosis
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3 dark:text-gray-400">
                    Phone
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3 dark:text-gray-400">
                    Language
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}
                    className="border-b border-gray-50 hover:bg-gray-50 
                               cursor-pointer transition-colors dark:border-gray-700 dark:hover:bg-gray-700"
                    onClick={() => navigate(`/patient/${patient.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full 
                                        flex items-center justify-center flex-shrink-0 dark:bg-green-900/50">
                          <span className="text-green-700 font-semibold text-sm dark:text-green-300">
                            {patient.full_name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 text-sm dark:text-white">
                          {patient.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {patient.diagnosis}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {patient.phone_number}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 
                                        rounded-full ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 uppercase dark:text-gray-300">
                      {patient.language}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}