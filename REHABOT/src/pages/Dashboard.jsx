import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, PauseCircle, UserX, Dumbbell, FileBarChart, Plus, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getGreeting } from '../utils/getGreeting'
import TopBar from '../components/layout/TopBar'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-surface-dark">
      <TopBar
        context={profile?.clinic_name ?? 'Your Clinic'}
        isAdmin={!!profile?.is_admin}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8">
        <PageHeader
          title={`${getGreeting()}, ${profile?.full_name?.split(' ')[0] ?? 'Doctor'}`}
          description="Here is your patient overview for today."
        />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Patients" value={stats.total} icon={Users} />
            <StatCard label="Active" value={stats.active} icon={UserCheck} tone="success" />
            <StatCard label="Paused" value={stats.paused} icon={PauseCircle} tone="warning" />
            <StatCard label="Discharged" value={stats.discharged} icon={UserX} />
          </div>
        )}

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display font-semibold text-neutral-900 dark:text-white">Your Patients</h2>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" icon={Dumbbell} onClick={() => navigate('/library')}>
              Exercise Library
            </Button>
            <Button variant="secondary" size="sm" icon={FileBarChart} onClick={() => navigate('/reports')}>
              Reports
            </Button>
            <Button size="sm" icon={Plus} onClick={() => navigate('/add-patient')}>
              Add Patient
            </Button>
          </div>
        </div>

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
          ) : (
            <Table>
              <THead>
                <Th>Patient</Th>
                <Th>Diagnosis</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th>Language</Th>
              </THead>
              <tbody>
                {patients.map((patient) => (
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
