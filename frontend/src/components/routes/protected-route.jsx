import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return null
  }

  if (!isAuthenticated) {
    // Remember where the user was so signing back in returns them there.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
