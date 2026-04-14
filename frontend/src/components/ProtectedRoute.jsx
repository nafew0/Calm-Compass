import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, allowIncompleteSetup = false }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    )
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (!allowIncompleteSetup && !user.has_completed_setup) {
    return <Navigate to="/setup" replace />
  }

  return children
}

export default ProtectedRoute
