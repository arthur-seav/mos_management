import { NavLink, useLocation } from 'react-router'

import { LogoMark } from '@/components/layout/Logo'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { navGroups, type NavGroup, type Role } from '@/config/nav'

/** Entries the role may see; groups left empty are dropped. */
export function visibleGroups(groups: NavGroup[], role: Role): NavGroup[] {
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.roles || i.roles.includes(role)) }))
    .filter(g => g.items.length > 0)
}

export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

/** AdminCN's sidebar layout: brand header, uppercase group labels, icon rows. */
export default function AppSidebar({ role }: { role: Role }) {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='gap-2.5 bg-transparent! [&>svg]:size-8' render={<NavLink to='/' />}>
              <LogoMark />
              <div className='flex flex-col items-start leading-tight'>
                <span className='font-heading text-lg font-semibold text-nowrap'>MOS</span>
                <span className='text-muted-foreground text-xs text-nowrap'>Store dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups(navGroups, role).map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className='text-sidebar-foreground/50 tracking-wider uppercase'>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={isActivePath(item.href, pathname)}
                      className='data-active:bg-sidebar-accent! data-active:font-medium'
                      render={<NavLink to={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
