import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { EllipsisVerticalIcon, KeyRoundIcon, PencilIcon, PlusIcon, UserCheckIcon, UserXIcon } from 'lucide-react'

import AccountStatusDialog from '@/components/accounts/AccountStatusDialog'
import ResetPasswordDialog from '@/components/accounts/ResetPasswordDialog'
import { ROLE_LABEL } from '@/components/accounts/staffForm'
import StaffDialog from '@/components/accounts/StaffDialog'
import { useDebouncedValue } from '@/components/accounts/useDebouncedValue'
import UserIdentity from '@/components/accounts/UserIdentity'
import DataTable from '@/components/common/DataTable'
import ListCard from '@/components/common/ListCard'
import PageTitle from '@/components/common/PageTitle'
import { FlagBadge } from '@/components/common/StatusBadge'
import TablePagination from '@/components/common/TablePagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { date } from '@/lib/format'
import { fullName, type Page, type User } from '@/lib/types'

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

/**
 * FR-27: admins add, edit, deactivate and reactivate staff accounts and set
 * their roles. An admin's own row has no deactivate and no role change.
 */
export default function StaffPage() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [changingStatus, setChangingStatus] = useState<User | null>(null)

  const q = useDebouncedValue(search, SEARCH_DELAY_MS)
  useEffect(() => setPage(0), [q])

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff', q, page],
    queryFn: () => api.get<Page<User>>('/api/admin/staff', { q, page, size: PAGE_SIZE })
  })

  const isMe = (staff: User) => staff.id === me?.id

  const columns: ColumnDef<User, unknown>[] = [
    {
      header: 'Name',
      cell: ({ row }) => <UserIdentity user={row.original} you={isMe(row.original)} />
    },
    {
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'outline'}>
          {ROLE_LABEL[row.original.role === 'admin' ? 'admin' : 'staff']}
        </Badge>
      )
    },
    {
      header: 'Status',
      cell: ({ row }) => <FlagBadge on={row.original.status === 'active'} onLabel='Active' offLabel='Inactive' />
    },
    {
      header: 'Joined',
      cell: ({ row }) => <span className='whitespace-nowrap'>{date(row.original.createdAt)}</span>
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const staff = row.original
        const active = staff.status === 'active'
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant='ghost' size='icon-sm' aria-label={`Actions for ${fullName(staff)}`} />}
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem onClick={() => setEditing(staff)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResetting(staff)}>
                <KeyRoundIcon />
                Reset password
              </DropdownMenuItem>
              {/* An admin can't lock themselves out (server code self_lockout). */}
              {!isMe(staff) && (
                <DropdownMenuItem variant={active ? 'destructive' : 'default'} onClick={() => setChangingStatus(staff)}>
                  {active ? <UserXIcon /> : <UserCheckIcon />}
                  {active ? 'Deactivate' : 'Reactivate'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  return (
    <>
      <PageTitle title='Staff' description='Who can sign in to the dashboard, and what they are allowed to do.' />
      {error && <p role='alert' className='text-destructive'>{errorMessage(error)}</p>}
      <ListCard
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email or phone' }}
        actions={
          <Button onClick={() => setEditing('new')}>
            <PlusIcon />
            Add staff
          </Button>
        }
        footer={
          <TablePagination
            page={data?.page ?? page}
            size={data?.size ?? PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          empty='No staff account matches this search.'
        />
      </ListCard>
      {editing && (
        <StaffDialog
          staff={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && isMe(editing)}
          onClose={() => setEditing(null)}
        />
      )}
      {resetting && <ResetPasswordDialog staff={resetting} onClose={() => setResetting(null)} />}
      {changingStatus && (
        <AccountStatusDialog account={changingStatus} group='staff' onClose={() => setChangingStatus(null)} />
      )}
    </>
  )
}
