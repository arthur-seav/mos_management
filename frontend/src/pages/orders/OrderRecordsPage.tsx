import { useEffect, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useSearchParams } from 'react-router'

import DataTable from '@/components/common/DataTable'
import ListCard from '@/components/common/ListCard'
import PageTitle from '@/components/common/PageTitle'
import TablePagination from '@/components/common/TablePagination'
import { OrderStatusBadge, PaymentStatusBadge, SourceBadge } from '@/components/common/StatusBadge'
import OrderDetailSheet from '@/components/orders/OrderDetailSheet'
import {
  filtersToParams,
  ORDER_SOURCES,
  ORDER_STATUSES,
  ordersQuery,
  PAGE_SIZE,
  readFilters,
  refundPendingPayment,
  type OrderFilters
} from '@/components/orders/orderFilters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, errorMessage } from '@/lib/api'
import { dateTime, money, ORDER_STATUS_LABEL, SOURCE_LABEL } from '@/lib/format'
import type { Order, Page } from '@/lib/types'

const STATUS_ITEMS = [
  { label: 'All statuses', value: 'all' },
  ...ORDER_STATUSES.map(status => ({ label: ORDER_STATUS_LABEL[status], value: status }))
]

const SOURCE_ITEMS = [
  { label: 'All sources', value: 'all' },
  ...ORDER_SOURCES.map(source => ({ label: SOURCE_LABEL[source], value: source }))
]

/** FR-32: the order history, searchable by day, status, source and pickup code / customer. */
export default function OrderRecordsPage() {
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const [searchText, setSearchText] = useState(filters.q)
  const [openOrderId, setOpenOrderId] = useState<number | null>(null)

  const query = ordersQuery(filters)
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', query],
    queryFn: () => api.get<Page<Order>>('/api/admin/orders', query)
  })

  function change(next: Partial<OrderFilters>) {
    // Any new filter starts again on the first page.
    setParams(filtersToParams({ ...filters, page: 0, ...next }), { replace: true })
  }

  // The timer must use the newest filters, not the ones of the render that started it.
  const changeRef = useRef(change)
  changeRef.current = change

  // The search box waits 300 ms before asking the server (NFR-02).
  useEffect(() => {
    if (searchText === filters.q) return
    const timer = setTimeout(() => changeRef.current({ q: searchText }), 300)
    return () => clearTimeout(timer)
  }, [searchText, filters.q])

  const columns: ColumnDef<Order, unknown>[] = [
    {
      header: 'Pickup code',
      cell: ({ row }) => <span className='font-medium'>{row.original.pickupCode ?? '—'}</span>
    },
    { header: 'Placed', cell: ({ row }) => dateTime(row.original.placedAt ?? row.original.createdAt) },
    { header: 'Source', cell: ({ row }) => <SourceBadge source={row.original.source} /> },
    { header: 'Customer', cell: ({ row }) => row.original.customer?.name ?? 'Walk-in' },
    { header: 'Drinks', cell: ({ row }) => row.original.drinkCount },
    { header: 'Total', cell: ({ row }) => <span className='text-price'>{money(row.original.totalAmount)}</span> },
    {
      header: 'Status',
      cell: ({ row }) => {
        const refund = refundPendingPayment(row.original.payments)
        return (
          <div className='flex flex-wrap items-center gap-1.5'>
            <OrderStatusBadge status={row.original.status} />
            {refund && <PaymentStatusBadge status={refund.status} />}
          </div>
        )
      }
    }
  ]

  return (
    <>
      <PageTitle title='Order records' description='Every order the store has taken.' />
      {error && <p role='alert' className='text-destructive'>{errorMessage(error)}</p>}
      <ListCard
        filters={
          <>
            <div className='grid gap-1.5'>
              <Label htmlFor='from'>From</Label>
              <Input id='from' type='date' value={filters.from} onChange={e => change({ from: e.target.value })} />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='to'>To</Label>
              <Input id='to' type='date' value={filters.to} onChange={e => change({ to: e.target.value })} />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='status'>Status</Label>
              <Select
                items={STATUS_ITEMS}
                value={filters.status}
                onValueChange={value => change({ status: (value ?? 'all') as OrderFilters['status'] })}
              >
                <SelectTrigger id='status' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ITEMS.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='source'>Source</Label>
              <Select
                items={SOURCE_ITEMS}
                value={filters.source}
                onValueChange={value => change({ source: (value ?? 'all') as OrderFilters['source'] })}
              >
                <SelectTrigger id='source' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_ITEMS.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        }
        search={{ value: searchText, onChange: setSearchText, placeholder: 'Search code, customer or phone' }}
        footer={
          <TablePagination
            page={filters.page}
            size={PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={page => setParams(filtersToParams({ ...filters, page }), { replace: true })}
          />
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          empty='No orders match these filters.'
          onRowClick={order => setOpenOrderId(order.id)}
        />
      </ListCard>
      {openOrderId !== null && <OrderDetailSheet orderId={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </>
  )
}
