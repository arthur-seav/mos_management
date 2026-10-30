import { Briefcase, Package } from 'lucide-react'

import { activeHref, isActivePath, visibleGroups } from '@/components/layout/AppSidebar'
import type { NavGroup } from '@/config/nav'

const groups: NavGroup[] = [
  {
    label: 'Orders',
    items: [{ label: 'Queue', href: '/orders/queue', icon: Package }]
  },
  {
    label: 'Admin',
    items: [{ label: 'Staff', href: '/accounts/staff', icon: Briefcase, roles: ['admin'] }]
  }
]

describe('visibleGroups (FR-05: staff see only daily order work)', () => {
  it('drops admin-only entries and the groups they leave empty for staff', () => {
    expect(visibleGroups(groups, 'staff').map(g => g.label)).toEqual(['Orders'])
  })

  it('keeps everything for admins', () => {
    expect(visibleGroups(groups, 'admin').map(g => g.label)).toEqual(['Orders', 'Admin'])
  })
})

describe('isActivePath', () => {
  it('matches a page and its sub-pages, but "/" only itself', () => {
    expect(isActivePath('/menu/products', '/menu/products/4')).toBe(true)
    expect(isActivePath('/menu/products', '/menu/productsx')).toBe(false)
    expect(isActivePath('/', '/orders')).toBe(false)
    expect(isActivePath('/', '/')).toBe(true)
  })
})

describe('activeHref', () => {
  const nested: NavGroup[] = [
    {
      label: 'Orders',
      items: [
        { label: 'Queue', href: '/orders/queue', icon: Package },
        { label: 'Records', href: '/orders', icon: Package }
      ]
    }
  ]

  it('highlights only the most specific entry', () => {
    expect(activeHref(nested, '/orders/queue')).toBe('/orders/queue')
    expect(activeHref(nested, '/orders')).toBe('/orders')
    expect(activeHref(nested, '/menu')).toBeNull()
  })
})
