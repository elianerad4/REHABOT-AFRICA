import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Reports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportHtml, setReportHtml] = useState(null)
  const [error, setError] = useState('')

  async function fetchPatients() {
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, diagnosis')
      .eq('physio_id', user.id)
      .eq('status', 'active')
    setPatients(data ?? [])
  }

  function setDefaultWeek() {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    setWeekStart(monday.toISOString().split('T')[0])
    setWeekEnd(sunday.toISOString().split('T')[0])
  }

  useEffect(() => {
    fetchPatients()
    setDefaultWeek()
  }, [])

  async function generateReport() {
    if (!selectedPatient) {
      setError('Please select a patient')
      return
    }
    if (!weekStart || !weekEnd) {
      setError('Please select a week range')
      return
    }

    setError('')
    setLoading(true)
    setReportHtml(null)

    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      'https://fzousmydjfblmblpwejh.supabase.co/functions/v1/generate-report',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: selectedPatient,
          week_start: weekStart,
          week_end: weekEnd
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    setReportHtml(data.html)
    setLoading(false)
  }

  function downloadReport() {
    const blob = new Blob([reportHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rehabot-report-${weekStart}-${weekEnd}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    const win = window.open('', '_blank')
    win.document.write(reportHtml)
    win.document.close()
    win.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 
                      flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ← Back
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white">Weekly Reports</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Generator */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Generate Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Select a patient and week to generate their rehabilitation report.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 
                            rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Patient
              </label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                           text-sm focus:outline-none focus:ring-2 
                           focus:ring-green-500"
              >
                <option value="">Select a patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} — {p.diagnosis}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Week start
                </label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                             text-sm focus:outline-none focus:ring-2 
                             focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Week end
                </label>
                <input
                  type="date"
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 
                             text-sm focus:outline-none focus:ring-2 
                             focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 
                         disabled:bg-green-400 text-white font-medium 
                         py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {reportHtml && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex 
                            items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Report Preview</h3>
              <div className="flex gap-3">
                <button
                  onClick={printReport}
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                             hover:bg-gray-50 dark:hover:bg-gray-700 font-medium px-4 py-2 
                             rounded-lg text-sm transition-colors"
                >
                  Print / Save PDF
                </button>
                <button
                  onClick={downloadReport}
                  className="bg-green-600 hover:bg-green-700 text-white 
                             font-medium px-4 py-2 rounded-lg text-sm 
                             transition-colors"
                >
                  Download HTML
                </button>
              </div>
            </div>
            <iframe
              srcDoc={reportHtml}
              className="w-full"
              style={{ height: '600px', border: 'none' }}
              title="Report Preview"
            />
          </div>
        )}
      </div>
    </div>
  )
}