import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/lib/auth'
import type { Role } from '@/config/nav'

/** Sends signed-out visitors to /login, and staff away from admin-only pages (FR-05). */
export default function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to='/login' replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role as Role)) return <Navigate to='/' replace />
  return <Outlet />
}
