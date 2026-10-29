import { Outlet, useLocation } from 'react-router'

import AppHeader from '@/components/layout/AppHeader'
import AppSidebar from '@/components/layout/AppSidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { navGroups } from '@/config/nav'

function crumbsFor(pathname: string): string[] {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === pathname) return [group.label, item.label]
    }
  }
  return ['MOS']
}

export default function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <AppSidebar role='admin' />
      <SidebarInset className='flex min-w-0 flex-1 flex-col'>
        <AppHeader crumbs={crumbsFor(pathname)} />
        <main className='mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
