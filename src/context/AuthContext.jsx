import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, SITE_OWNER } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  // Fetch the user's profile from the profiles table
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      return data
    }
    return null
  }, [])

  // Check if the current user is the site owner
  const checkOwnership = useCallback((userProfile, authUser) => {
    if (!authUser) return false
    // Check by username matching SITE_OWNER
    if (userProfile?.username === SITE_OWNER) return true
    // Fallback: check GitHub metadata
    const githubLogin =
      authUser.user_metadata?.user_name ||
      authUser.user_metadata?.preferred_username ||
      authUser.user_metadata?.login
    if (githubLogin === SITE_OWNER) return true
    return false
  }, [])

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        const userProfile = await fetchProfile(session.user.id)
        setProfile(userProfile)
        setIsOwner(checkOwnership(userProfile, session.user))
      }

      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const userProfile = await fetchProfile(session.user.id)
        setProfile(userProfile)
        setIsOwner(checkOwnership(userProfile, session.user))
      } else {
        setUser(null)
        setProfile(null)
        setIsOwner(false)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile, checkOwnership])

  // Sign in with GitHub OAuth
  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) console.error('GitHub sign-in error:', error)
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsOwner(false)
  }

  const value = {
    user,
    profile,
    loading,
    isOwner,
    isAuthenticated: !!user,
    signInWithGitHub,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
