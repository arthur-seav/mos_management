import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  ClipboardList,
  Coffee,
  LayoutDashboard,
  ListChecks,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  UserCog,
  Users
} from 'lucide-react'

/** Who may see a menu entry (SA 1.5). */
export type Role = 'staff' | 'admin'

export type NavLeaf = {
  label: string
  href: string
  icon: LucideIcon
  /** Missing = staff and admins. */
  roles?: Role[]
}

export type NavGroup = {
  label: string
  items: NavLeaf[]
}

/**
 * SA 1.5: staff do daily order work (orders, payments, product status,
 * search, pausing online orders); admins see everything.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [{ label: 'Overview', href: '/', icon: LayoutDashboard }]
  },
  {
    label: 'Orders',
    items: [
      { label: 'Order queue', href: '/orders/queue', icon: ListChecks },
      { label: 'Walk-in order', href: '/orders/new', icon: ShoppingBag },
      { label: 'Order records', href: '/orders', icon: ClipboardList }
    ]
  },
  {
    label: 'Menu',
    items: [
      { label: 'Drinks', href: '/menu/products', icon: Coffee },
      { label: 'Categories', href: '/menu/categories', icon: Tags, roles: ['admin'] },
      { label: 'Options', href: '/menu/options', icon: SlidersHorizontal, roles: ['admin'] }
    ]
  },
  {
    label: 'Store',
    items: [
      { label: 'Store settings', href: '/store', icon: Store },
      { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] }
    ]
  },
  {
    label: 'Accounts',
    items: [
      { label: 'Staff', href: '/accounts/staff', icon: UserCog, roles: ['admin'] },
      { label: 'Customers', href: '/accounts/customers', icon: Users, roles: ['admin'] }
    ]
  }
]
