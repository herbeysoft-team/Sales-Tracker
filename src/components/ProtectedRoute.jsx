import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-ink-soft">Loading…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/dashboard" replace />
  return children
}