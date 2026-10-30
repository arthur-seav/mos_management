import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, readSession, setUnauthorizedHandler, storeSession } from '@/lib/api'
import type { SignInResponse, User } from '@/lib/types'

type Session = { token: string; user: User }

type AuthContextValue = {
  user: User | null
  isAdmin: boolean
  signIn: (identifier: string, password: string) => Promise<User>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Keeps the staff/admin session in localStorage; FR-03 sign-out drops it. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession<Session>())

  const signOut = useCallback(() => {
    storeSession(null)
    setSession(null)
  }, [])

  useEffect(() => setUnauthorizedHandler(signOut), [signOut])

  // Refresh the profile once: a role change or deactivation shows at once.
  useEffect(() => {
    if (!session) return
    api
      .get<User>('/api/admin/me')
      .then(user => {
        const next = { token: session.token, user }
        storeSession(next)
        setSession(next)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<SignInResponse>('/api/admin/auth/sign-in', { identifier, password })
    storeSession(res)
    setSession(res)
    return res.user
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, isAdmin: session?.user.role === 'admin', signIn, signOut }),
    [session, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
