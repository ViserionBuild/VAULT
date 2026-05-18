import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, ready } = useAuth()

  if (!ready) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
