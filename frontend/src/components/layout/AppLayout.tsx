import { Outlet, useLocation } from 'react-router'

import AppHeader from '@/components/layout/AppHeader'
import AppSidebar from '@/components/layout/AppSidebar'
import ProfileDropdown from '@/components/layout/ProfileDropdown'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { navGroups, type Role } from '@/config/nav'
import { useAuth } from '@/lib/auth'

const extraCrumbs: Record<string, string[]> = {
  '/account/password': ['Account', 'Change password']
}

export function crumbsFor(pathname: string): string[] {
  if (extraCrumbs[pathname]) return extraCrumbs[pathname]
  let best: { length: number; crumbs: string[] } | null = null
  for (const group of navGroups) {
    for (const item of group.items) {
      const match = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
      if (match && (!best || item.href.length > best.length)) {
        best = { length: item.href.length, crumbs: [group.label, item.label] }
      }
    }
  }
  return best?.crumbs ?? ['MOS']
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar role={(user?.role ?? 'staff') as Role} />
      <SidebarInset className='flex min-w-0 flex-1 flex-col'>
        <AppHeader crumbs={crumbsFor(pathname)} actions={<ProfileDropdown />} />
        <main className='mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
