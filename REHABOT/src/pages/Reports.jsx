import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Printer, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardHeader } from '../components/ui/Card'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

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
    const { data } = await supabase.from('patients').select('id, full_name, diagnosis').eq('physio_id', user.id).eq('status', 'active')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateReport() {
    if (!selectedPatient) return setError('Please select a patient')
    if (!weekStart || !weekEnd) return setError('Please select a week range')

    setError('')
    setLoading(true)
    setReportHtml(null)

    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch('https://fzousmydjfblmblpwejh.supabase.co/functions/v1/generate-report', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: selectedPatient, week_start: weekStart, week_end: weekEnd })
    })

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
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar back={() => navigate('/dashboard')} />

      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader title="Weekly Reports" description="Generate a clinical adherence and pain report for a patient." />

        <Card padding="lg" className="mb-6">
          <CardHeader title="Generate Report" description="Select a patient and week to generate their rehabilitation report." />

          {error && (
            <div role="alert" className="flex items-start gap-2.5 bg-danger-50 dark:bg-danger-500/10 border border-red-200 dark:border-red-900 text-danger-600 dark:text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              {error}
            </div>
          )}

          <div className="space-y-5">
            <Select label="Patient" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} — {p.diagnosis}</option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Week start" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
              <Input label="Week end" type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
            </div>

            <Button className="w-full" loading={loading} onClick={generateReport}>
              {loading ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {reportHtml && (
          <Card padding="none">
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Report Preview</h3>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" icon={Printer} onClick={printReport}>Print / Save PDF</Button>
                <Button size="sm" icon={Download} onClick={downloadReport}>Download HTML</Button>
              </div>
            </div>
            <iframe srcDoc={reportHtml} className="w-full" style={{ height: '600px', border: 'none' }} title="Report Preview" />
          </Card>
        )}
      </div>
    </div>
  )
}
