import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, PauseCircle, UserX, Dumbbell, FileBarChart, Plus, Building2, CalendarDays, Search, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getGreeting } from '../utils/getGreeting'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { Table, THead, Th, Tr, Td } from '../components/ui/Table'
import { SkeletonCard, SkeletonTable } from '../components/ui/Skeleton'
import CommunicationPanel from '../components/CommunicationPanel'

const STATUS_VARIANT = { active: 'success', paused: 'warning', discharged: 'neutral' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, discharged: 0 })

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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
        active: data.filter((p) => p.status === 'active').length,
        paused: data.filter((p) => p.status === 'paused').length,
        discharged: data.filter((p) => p.status === 'discharged').length
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

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) =>
      [p.full_name, p.diagnosis, p.phone_number].filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [patients, search])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar
        context={profile?.clinic_name ?? 'Your Clinic'}
        isAdmin={!!profile?.is_admin}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-8 pb-24 lg:pb-8">
        <PageHeader
          title={`${getGreeting()}, ${profile?.full_name?.split(' ')[0] ?? 'Doctor'}`}
          description="Here is your patient overview for today."
          action={
            <Button size="sm" icon={Plus} onClick={() => navigate('/add-patient')}>
              Add Patient
            </Button>
          }
        />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard label="Total Patients" value={stats.total} icon={Users} />
            <StatCard label="Active" value={stats.active} icon={UserCheck} tone="success" />
            <StatCard label="Paused" value={stats.paused} icon={PauseCircle} tone="warning" />
            <StatCard label="Discharged" value={stats.discharged} icon={UserX} />
          </div>
        )}

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display font-semibold text-neutral-900 dark:text-white">Your Patients</h2>
          <div className="hidden sm:flex items-center gap-2.5">
            <Button variant="secondary" size="sm" icon={Dumbbell} onClick={() => navigate('/library')}>
              Exercise Library
            </Button>
            <Button variant="secondary" size="sm" icon={CalendarDays} onClick={() => navigate('/programmes')}>
              Programmes
            </Button>
            <Button variant="secondary" size="sm" icon={FileBarChart} onClick={() => navigate('/reports')}>
              Reports
            </Button>
          </div>
        </div>

        {!loading && patients.length > 0 && (
          <div className="mb-4">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients by name, diagnosis or phone…"
            />
          </div>
        )}

        <div className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-card overflow-hidden">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : patients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No patients yet"
              description="Add your first patient to start sending follow-up messages."
              action={<Button icon={Plus} onClick={() => navigate('/add-patient')}>Add your first patient</Button>}
            />
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching patients"
              description="Try a different search term."
            />
          ) : (
            <>
              {/* Mobile: responsive patient cards */}
              <ul className="md:hidden divide-y divide-neutral-50 dark:divide-neutral-800">
                {filteredPatients.map((patient) => (
                  <li key={patient.id}>
                    <button
                      onClick={() => navigate(`/patient/${patient.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                    >
                      <Avatar name={patient.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">{patient.full_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {patient.diagnosis || 'No diagnosis'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant={STATUS_VARIANT[patient.status] ?? 'neutral'}>{patient.status}</Badge>
                        <span className="text-[10px] uppercase text-neutral-400">{patient.language}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <Th>Patient</Th>
                    <Th>Diagnosis</Th>
                    <Th>Phone</Th>
                    <Th>Status</Th>
                    <Th>Language</Th>
                  </THead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <Tr key={patient.id} onClick={() => navigate(`/patient/${patient.id}`)}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={patient.full_name} size="sm" />
                            <span className="font-medium text-neutral-900 dark:text-white">{patient.full_name}</span>
                          </div>
                        </Td>
                        <Td>{patient.diagnosis}</Td>
                        <Td>{patient.phone_number}</Td>
                        <Td>
                          <Badge variant={STATUS_VARIANT[patient.status] ?? 'neutral'}>{patient.status}</Badge>
                        </Td>
                        <Td className="uppercase">{patient.language}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </div>

        {!loading && patients.length > 0 && (
          <div className="mt-8">
            <CommunicationPanel patientIds={patients.map((p) => p.id)} limit={8} />
          </div>
        )}
      </div>
    </div>
  )
}
