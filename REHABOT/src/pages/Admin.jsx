import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState({
    totalPhysios: 0,
    totalPatients: 0,
    totalMessages: 0,
    activePatients: 0,
    trialPhysios: 0,
    activePhysios: 0
  })
  const [physios, setPhysios] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  async function checkAdmin() {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!data?.is_admin) {
      navigate('/dashboard')
      return
    }

    setAuthorized(true)
    fetchAdminData()
  }

  async function fetchAdminData() {
    const [
      { data: physioData },
      { data: patientData },
      { data: messageData }
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, status, physio_id, created_at'),
      supabase.from('message_logs').select('id, direction, sent_at')
    ])

    const physioList = physioData ?? []
    const patientList = patientData ?? []
    const messageList = messageData ?? []

    // Calculate stats
    setStats({
      totalPhysios: physioList.filter(p => !p.is_admin).length,
      totalPatients: patientList.length,
      totalMessages: messageList.length,
      activePatients: patientList.filter(p => p.status === 'active').length,
      trialPhysios: physioList.filter(p => p.subscription_status === 'trial' && !p.is_admin).length,
      activePhysios: physioList.filter(p => p.subscription_status === 'active' && !p.is_admin).length
    })

    // Enrich physio list with patient counts
    const enriched = physioList
      .filter(p => !p.is_admin)
      .map(p => ({
        ...p,
        patientCount: patientList.filter(pt => pt.physio_id === p.id).length,
        activePatients: patientList.filter(pt => pt.physio_id === p.id && pt.status === 'active').length,
        messageCount: messageList.filter(m =>
          patientList.some(pt => pt.id === m.patient_id && pt.physio_id === p.id)
        ).length
      }))

    setPhysios(enriched)
    setLoading(false)
  }

  useEffect(() => {
    checkAdmin()
  }, [user])

  async function updateSubscription(physioId, status) {
    await supabase
      .from('profiles')
      .update({ subscription_status: status })
      .eq('id', physioId)
    fetchAdminData()
  }

  function getStatusColor(status) {
    if (status === 'active') return 'bg-green-100 text-green-700'
    if (status === 'trial') return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function trialDaysLeft(trialEndsAt) {
    if (!trialEndsAt) return 0
    const now = new Date()
    const end = new Date(trialEndsAt)
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent 
                          rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 
                      flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 
                           border border-orange-200 px-2 py-0.5 rounded-full">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Rehabot Africa — Admin Panel
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Overview of all clinics and platform activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Physios', value: stats.totalPhysios, color: 'text-gray-900' },
            { label: 'On Trial', value: stats.trialPhysios, color: 'text-yellow-600' },
            { label: 'Paying', value: stats.activePhysios, color: 'text-green-600' },
            { label: 'Total Patients', value: stats.totalPatients, color: 'text-gray-900' },
            { label: 'Active Patients', value: stats.activePatients, color: 'text-green-600' },
            { label: 'Total Messages', value: stats.totalMessages, color: 'text-blue-600' }
          ].map((stat) => (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          {['overview', 'clinics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium 
                          transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Trial Expiring Soon */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                ⚠️ Trials Expiring Soon
              </h3>
              {physios.filter(p => p.subscription_status === 'trial' && 
                trialDaysLeft(p.trial_ends_at) <= 7).length === 0 ? (
                <p className="text-sm text-gray-400">No trials expiring in next 7 days.</p>
              ) : (
                <div className="space-y-3">
                  {physios
                    .filter(p => p.subscription_status === 'trial' && 
                      trialDaysLeft(p.trial_ends_at) <= 7)
                    .map(p => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.full_name}
                          </p>
                          <p className="text-xs text-gray-500">{p.clinic_name}</p>
                        </div>
                        <span className="text-xs font-bold text-red-600">
                          {trialDaysLeft(p.trial_ends_at)} days left
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Recent Signups */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                🆕 Recent Signups
              </h3>
              {physios.length === 0 ? (
                <p className="text-sm text-gray-400">No physios signed up yet.</p>
              ) : (
                <div className="space-y-3">
                  {physios.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.full_name}
                        </p>
                        <p className="text-xs text-gray-500">{p.clinic_name}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(p.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clinics Tab */}
        {activeTab === 'clinics' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {physios.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No clinics have signed up yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 
                                   uppercase tracking-wider px-6 py-3">
                      Physio / Clinic
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 
                                   uppercase tracking-wider px-6 py-3">
                      Patients
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 
                                   uppercase tracking-wider px-6 py-3">
                      Joined
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 
                                   uppercase tracking-wider px-6 py-3">
                      Trial Ends
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 
                                   uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 
                                   uppercase tracking-wider px-6 py-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {physios.map((p) => (
                    <tr key={p.id}
                      className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 text-sm">
                          {p.full_name}
                        </div>
                        <div className="text-xs text-gray-500">{p.clinic_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {p.patientCount} total
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.activePatients} active
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {p.trial_ends_at ? (
                          <span className={trialDaysLeft(p.trial_ends_at) <= 3 
                            ? 'text-red-600 font-medium' : ''}>
                            {formatDate(p.trial_ends_at)}
                            {p.subscription_status === 'trial' && (
                              <span className="block text-xs">
                                {trialDaysLeft(p.trial_ends_at)} days left
                              </span>
                            )}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 
                                          rounded-full ${getStatusColor(p.subscription_status)}`}>
                          {p.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={p.subscription_status}
                          onChange={(e) => updateSubscription(p.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded-lg 
                                     px-2 py-1 bg-white focus:outline-none 
                                     focus:ring-1 focus:ring-green-500"
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
