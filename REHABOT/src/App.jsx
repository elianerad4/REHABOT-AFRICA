import { useEffect } from 'react'
import Admin from './pages/Admin'
import Reports from './pages/Reports'
import PatientDetail from './pages/PatientDetail'
import AddPatient from './pages/AddPatient'
import CheckEmail from './pages/CheckEmail'
import Settings from './pages/Settings'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

export default function App() {
  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved === 'true') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
  path="/admin"
  element={
    <ProtectedRoute>
      <Admin />
    </ProtectedRoute>
  }
/>
          <Route
  path="/reports"
  element={
    <ProtectedRoute>
      <Reports />
    </ProtectedRoute>
  }
/>
          <Route
  path="/patient/:id"
  element={
    <ProtectedRoute>
      <PatientDetail />
    </ProtectedRoute>
  }
/>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route
  path="/add-patient"
  element={
    <ProtectedRoute>
      <AddPatient />
    </ProtectedRoute>
  }
/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}