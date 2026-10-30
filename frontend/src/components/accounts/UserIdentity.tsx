import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { fullName, initials, type User } from '@/lib/types'

/**
 * AdminCN's user cell: initials in a circle, the name, and the contact
 * detail the person signs in with under it.
 */
export default function UserIdentity({ user, you }: { user: User; you?: boolean }) {
  return (
    <div className='flex items-center gap-3'>
      <Avatar className='size-9'>
        <AvatarFallback className='bg-accent text-accent-foreground text-xs font-medium'>
          {initials(user)}
        </AvatarFallback>
      </Avatar>
      <div className='flex flex-col'>
        <span className='font-medium whitespace-nowrap'>
          {fullName(user)}
          {you && <span className='text-muted-foreground ml-1.5 text-xs font-normal'>(you)</span>}
        </span>
        <span className='text-muted-foreground text-xs'>{user.email ?? user.phone ?? 'No contact details'}</span>
      </div>
    </div>
  )
}
