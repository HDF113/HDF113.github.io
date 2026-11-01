import { useAuth } from '../context/AuthContext'

/**
 * OwnerOnly - Renders children only if the current user is the site owner.
 * Otherwise renders the fallback prop (or null).
 */
export function OwnerOnly({ children, fallback = null }) {
  const { isOwner } = useAuth()
  if (!isOwner) return fallback
  return children
}

/**
 * AuthRequired - Renders children only if the user is authenticated.
 * Otherwise renders the fallback prop (or null).
 */
export function AuthRequired({ children, fallback = null }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return fallback
  return children
}
