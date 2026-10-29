import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard } from 'lucide-react'

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

export const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [{ label: 'Overview', href: '/', icon: LayoutDashboard }]
  }
]
