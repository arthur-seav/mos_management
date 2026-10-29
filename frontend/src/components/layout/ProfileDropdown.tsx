import { KeyRoundIcon, LogOutIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { fullName, initials } from '@/lib/types'

/** AdminCN's avatar menu on the right of the top bar. */
export default function ProfileDropdown() {
  const { user, signOut } = useAuth()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' size='icon' className='rounded-full hover:bg-transparent' aria-label='Account' />}
      >
        <Avatar>
          <AvatarFallback className='bg-accent text-accent-foreground'>{initials(user)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex flex-col items-start px-2 py-2.5 font-normal'>
            <span className='text-foreground text-base font-semibold'>{fullName(user)}</span>
            <span className='text-muted-foreground text-sm'>{user.email ?? user.phone}</span>
            <span className='bg-muted text-muted-foreground mt-1 rounded px-1.5 py-0.5 text-xs capitalize'>
              {user.role}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to='/account/password' />}>
            <KeyRoundIcon />
            <span>Change password</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant='destructive' onClick={signOut}>
            <LogOutIcon />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
