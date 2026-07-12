import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [painLogs, setPainLogs] = useState([])
  const [adherenceLogs, setAdherenceLogs] = useState([])
  const [messages, setMessages] = useState([])
  const [exercises, setExercises] = useState([])
  const [patientExercises, setPatientExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [exercisesLoading, setExercisesLoading] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseDescription, setNewExerciseDescription] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  async function fetchAll() {
    const [
      { data: patientData },
      { data: painData },
      { data: adherenceData },
      { data: messageData },
      { data: exerciseData },
      { data: patientExerciseData }
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase.from('pain_logs').select('*').eq('patient_id', id)
        .order('logged_at', { ascending: true }).limit(14),
      supabase.from('adherence_logs').select('*').eq('patient_id', id)
        .order('log_date', { ascending: false }).limit(7),
      supabase.from('message_logs').select('*').eq('patient_id', id)
        .order('sent_at', { ascending: false }).limit(20),
      supabase.from('exercises').select('*').eq('is_global', true).order('name'),
      supabase.from('patient_exercises').select('*, exercise:exercises(*)')
        .eq('patient_id', id)
    ])

    setPatient(patientData)
    setPainLogs(painData ?? [])
    setAdherenceLogs(adherenceData ?? [])
    setMessages(messageData ?? [])
    setExercises(exerciseData ?? [])
    setPatientExercises(patientExerciseData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
  }, [id])

  async function assignExercise(exerciseId) {
    setExercisesLoading(true)
    await supabase.from('patient_exercises').insert({
      patient_id: id,
      exercise_id: exerciseId,
      sets: 3,
      reps: 10,
      frequency_per_week: 5
    })
    const { data } = await supabase
      .from('patient_exercises')
      .select('*, exercise:exercises(*)')
      .eq('patient_id', id)
    setPatientExercises(data ?? [])
    setExercisesLoading(false)
  }

  async function removePatientExercise(peId) {
    setExercisesLoading(true)
    await supabase.from('patient_exercises').delete().eq('id', peId)
    setPatientExercises(prev => prev.filter(pe => pe.id !== peId))
    setExercisesLoading(false)
  }

  async function addNewExercise() {
    if (!newExerciseName.trim()) return
    setExercisesLoading(true)
    const { data } = await supabase
      .from('exercises')
      .insert({ name: newExerciseName.trim(), description: newExerciseDescription.trim(), is_global: true })
      .select()
      .single()
    if (data) {
      setExercises(prev => [...prev, data])
    }
    setNewExerciseName('')
    setNewExerciseDescription('')
    setShowAddExercise(false)
    setExercisesLoading(false)
  }

  async function updateStatus(newStatus) {
    await supabase
      .from('patients')
      .update({ status: newStatus })
      .eq('id', id)
    setPatient({ ...patient, status: newStatus })
  }

  function getStatusColor(status) {
    if (status === 'active') return 'bg-green-100 text-green-700'
    if (status === 'paused') return 'bg-yellow-100 text-yellow-700'
    if (status === 'discharged') return 'bg-gray-100 text-gray-500'
    return 'bg-gray-100 text-gray-500'
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short'
    })
  }

  // Calculate adherence % for last 7 days
  const adherencePercent = adherenceLogs.length > 0
    ? Math.round(
        (adherenceLogs.filter(l => l.confirmed).length / adherenceLogs.length) * 100
      )
    : 0

  // Average pain score
  const avgPain = painLogs.length > 0
    ? (painLogs.reduce((sum, l) => sum + l.score, 0) / painLogs.length).toFixed(1)
    : 'N/A'

  // Format pain data for chart
  const painChartData = painLogs.map(log => ({
    date: formatDate(log.logged_at),
    pain: log.score
  }))

  // Format adherence for chart
  const adherenceChartData = [...adherenceLogs].reverse().map(log => ({
    date: formatDate(log.log_date),
    done: log.confirmed ? 1 : 0
  }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent 
                        rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Patient not found.</p>
          <button onClick={() => navigate('/dashboard')}
            className="text-green-600 font-medium">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 
                      flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center 
                            justify-center">
              <span className="text-green-700 font-bold">
                {patient.full_name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">
                {patient.full_name}
              </h1>
              <p className="text-xs text-gray-500">{patient.diagnosis}</p>
            </div>
          </div>
        </div>

        {/* Status selector */}
        <select
          value={patient.status}
          onChange={(e) => updateStatus(e.target.value)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 
                      cursor-pointer ${getStatusColor(patient.status)}`}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="discharged">Discharged</option>
        </select>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Phone', value: patient.phone_number },
            { label: 'Language', value: patient.language === 'sw' ? 'Swahili' : 'English' },
            { label: '7-Day Adherence', value: `${adherencePercent}%` },
            { label: 'Avg Pain Score', value: `${avgPain}/10` }
          ].map((stat) => (
            <div key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
              <div className="font-bold text-gray-900 text-sm truncate">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          {['overview', 'messages', 'exercises'].map((tab) => (
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
          <div className="space-y-6">

            {/* Pain Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Pain Trend</h3>
              <p className="text-xs text-gray-500 mb-4">
                Patient-reported pain scores (1–10)
              </p>
              {painChartData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No pain scores recorded yet.
                  <br />Pain scores appear when patient replies to check-ins.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={painChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="pain"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ fill: '#16a34a', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Adherence */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">
                Exercise Adherence
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Last 7 days — did patient confirm exercises?
              </p>
              {adherenceChartData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No adherence data yet.
                  <br />Data appears after daily reminders are sent.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={adherenceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={[0, 1]}
                      ticks={[0, 1]}
                      tickFormatter={(v) => v === 1 ? 'Yes' : 'No'}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v) => v === 1 ? 'Completed' : 'Missed'}
                    />
                    <Bar dataKey="done" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Notes */}
            {patient.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Clinical Notes
                </h3>
                <p className="text-sm text-gray-600">{patient.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No messages yet.
                <br />Messages appear after WhatsApp integration is active.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {messages.map((msg) => (
                  <div key={msg.id}
                    className={`px-6 py-4 flex gap-4 ${
                      msg.direction === 'outbound' ? 'bg-white' : 'bg-green-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center 
                                    justify-center text-xs font-bold flex-shrink-0 ${
                      msg.direction === 'outbound'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {msg.direction === 'outbound' ? 'R' : 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {msg.direction === 'outbound' ? 'Rehabot' : patient.full_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.sent_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        {msg.message_type && (
                          <span className="text-xs bg-gray-100 text-gray-500 
                                           px-2 py-0.5 rounded-full">
                            {msg.message_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
          <div className="space-y-6">
            {/* Currently assigned exercises */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">
                Assigned Exercises
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Exercises currently assigned to this patient
              </p>
              {patientExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No exercises assigned yet.
                  <br />Select from the list below to assign.
                </div>
              ) : (
                <div className="space-y-3">
                  {patientExercises.map((pe) => (
                    <div key={pe.id}
                      className="flex items-center justify-between p-3 
                                 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {pe.exercise?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {pe.sets} sets × {pe.reps} reps · {pe.frequency_per_week}x/week
                          {pe.exercise?.description && (
                            <> — {pe.exercise.description}</>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => removePatientExercise(pe.id)}
                        disabled={exercisesLoading}
                        className="text-red-500 hover:text-red-700 text-xs font-medium
                                   px-3 py-1.5 rounded-lg hover:bg-red-50 
                                   transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available exercises */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-1">
                Exercise Library
              </h3>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500">
                  Global exercises — tap to assign to this patient
                </p>
                <button
                  onClick={() => setShowAddExercise(!showAddExercise)}
                  className="text-green-600 hover:text-green-700 text-xs font-medium
                             px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                >
                  + New Exercise
                </button>
              </div>

              {showAddExercise && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 text-sm mb-3">
                    Add New Exercise
                  </h4>
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                               mb-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newExerciseDescription}
                    onChange={(e) => setNewExerciseDescription(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                               mb-3 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addNewExercise}
                      disabled={exercisesLoading || !newExerciseName.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs
                                 font-medium px-4 py-1.5 rounded-lg transition-colors
                                 disabled:opacity-50"
                    >
                      {exercisesLoading ? 'Saving...' : 'Save Exercise'}
                    </button>
                    <button
                      onClick={() => { setShowAddExercise(false); setNewExerciseName(''); setNewExerciseDescription('') }}
                      className="text-gray-500 hover:text-gray-700 text-xs font-medium
                                 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {exercises.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No exercises found in the library.
                </div>
              ) : (
                <div className="grid gap-3">
                  {exercises
                    .filter(ex => !patientExercises.some(pe => pe.exercise_id === ex.id))
                    .map((ex) => (
                      <div key={ex.id}
                        className="flex items-center justify-between p-3 
                                   border border-gray-100 rounded-lg
                                   hover:border-green-200 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {ex.name}
                          </p>
                          {ex.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {ex.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => assignExercise(ex.id)}
                          disabled={exercisesLoading}
                          className="text-green-600 hover:text-green-700 text-xs 
                                     font-medium px-3 py-1.5 rounded-lg 
                                     hover:bg-green-50 transition-colors 
                                     disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  {exercises.filter(ex => !patientExercises.some(pe => pe.exercise_id === ex.id)).length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      All exercises are already assigned.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}