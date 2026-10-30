import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { UserCheckIcon, UserXIcon } from 'lucide-react'

import AccountStatusDialog from '@/components/accounts/AccountStatusDialog'
import { useDebouncedValue } from '@/components/accounts/useDebouncedValue'
import UserIdentity from '@/components/accounts/UserIdentity'
import DataTable from '@/components/common/DataTable'
import ListCard from '@/components/common/ListCard'
import PageTitle from '@/components/common/PageTitle'
import { FlagBadge } from '@/components/common/StatusBadge'
import TablePagination from '@/components/common/TablePagination'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { date } from '@/lib/format'
import { fullName, type Page, type User } from '@/lib/types'

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

/**
 * FR-31: admins read the customer list and deactivate accounts. Customers
 * are created by signing up in the app, so there is nothing to add or edit.
 */
export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [changingStatus, setChangingStatus] = useState<User | null>(null)

  const q = useDebouncedValue(search, SEARCH_DELAY_MS)
  useEffect(() => setPage(0), [q])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', q, page],
    queryFn: () => api.get<Page<User>>('/api/admin/customers', { q, page, size: PAGE_SIZE })
  })

  const columns: ColumnDef<User, unknown>[] = [
    { header: 'Name', cell: ({ row }) => <UserIdentity user={row.original} /> },
    {
      header: 'Email',
      cell: ({ row }) => <span className='text-muted-foreground'>{row.original.email ?? '—'}</span>
    },
    {
      header: 'Phone',
      cell: ({ row }) => <span className='text-muted-foreground whitespace-nowrap'>{row.original.phone ?? '—'}</span>
    },
    {
      header: 'Joined',
      cell: ({ row }) => <span className='whitespace-nowrap'>{date(row.original.createdAt)}</span>
    },
    {
      header: 'Status',
      cell: ({ row }) => <FlagBadge on={row.original.status === 'active'} onLabel='Active' offLabel='Inactive' />
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const customer = row.original
        const active = customer.status === 'active'
        return (
          <Button
            variant='outline'
            size='sm'
            aria-label={`${active ? 'Deactivate' : 'Reactivate'} ${fullName(customer)}`}
            onClick={() => setChangingStatus(customer)}
          >
            {active ? <UserXIcon /> : <UserCheckIcon />}
            {active ? 'Deactivate' : 'Reactivate'}
          </Button>
        )
      }
    }
  ]

  return (
    <>
      <PageTitle title='Customers' description='People who order in the app. They sign themselves up.' />
      <ListCard
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email or phone' }}
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
          empty='No customer matches this search.'
        />
      </ListCard>
      {changingStatus && (
        <AccountStatusDialog account={changingStatus} group='customers' onClose={() => setChangingStatus(null)} />
      )}
    </>
  )
}
