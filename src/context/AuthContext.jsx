import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { subscribeUserProfile, logAuditEvent } from '../lib/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub = null

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)

      if (profileUnsub) {
        profileUnsub()
        profileUnsub = null
      }

      if (user) {
        // Realtime, not a one-time fetch — so if an admin changes this
        // user's targets, role, or details, they see it live without
        // needing to log out and back in.
        profileUnsub = subscribeUserProfile(user.uid, (p) => {
          if (p && p.active === false) {
            // Deactivated while signed in — end the session immediately
            // rather than leaving them logged in with a dead profile.
            signOut(auth)
            setProfile(null)
            setLoading(false)
            return
          }
          setProfile(p)
          setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsub()
      if (profileUnsub) profileUnsub()
    }
  }, [])

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    logAuditEvent('Login', email)
    return result
  }
  const logout = () => signOut(auth)

  const value = {
    user: firebaseUser,
    profile,
    role: profile?.role,
    isAdmin: profile?.role === 'admin' || profile?.role === 'superadmin',
    isSuperAdmin: profile?.role === 'superadmin',
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
