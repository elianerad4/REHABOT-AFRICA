import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchPatients()
    }
  }, [user])

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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function getStatusColor(status) {
    if (status === 'active') return 'bg-green-100 text-green-700'
    if (status === 'paused') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent 
                          rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 
                      flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center 
                          justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Rehabot Africa</h1>
            <p className="text-xs text-gray-500">
              {profile?.clinic_name ?? 'Your Clinic'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            {profile?.full_name ?? user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Good morning, {profile?.full_name?.split(' ')[0] ?? 'Doctor'} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Here is your patient overview for today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Patients', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-green-600' },
            { label: 'Paused', value: stats.paused, color: 'text-yellow-600' },
            { label: 'Discharged', value: stats.discharged, color: 'text-gray-400' }
          ].map((stat) => (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Patient List Header */}
        <div className="flex items-center justify-between mb-4">
  <h3 className="font-semibold text-gray-900">Your Patients</h3>
  <div className="flex items-center gap-3">
    <button
      onClick={() => navigate('/reports')}
      className="border border-gray-300 text-gray-700 hover:bg-gray-50 
                 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      Reports
    </button>
    <button
      onClick={() => navigate('/add-patient')}
      className="bg-green-600 hover:bg-green-700 text-white text-sm 
                 font-medium px-4 py-2 rounded-lg transition-colors"
    >
      + Add Patient
    </button>
  </div>
</div>

        {/* Patient List */}
        {patients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🏥</div>
            <h3 className="font-semibold text-gray-900 mb-1">No patients yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Add your first patient to start sending follow-up messages.
            </p>
            <button
              onClick={() => navigate('/add-patient')}
              className="bg-green-600 hover:bg-green-700 text-white text-sm 
                         font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Add your first patient
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3">
                    Patient
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3">
                    Diagnosis
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 
                                 uppercase tracking-wider px-6 py-3">
                    Language
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}
                    className="border-b border-gray-50 hover:bg-gray-50 
                               cursor-pointer transition-colors"
                    onClick={() => navigate(`/patient/${patient.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full 
                                        flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-semibold text-sm">
                            {patient.full_name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 text-sm">
                          {patient.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {patient.diagnosis}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {patient.phone_number}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 
                                        rounded-full ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 uppercase">
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