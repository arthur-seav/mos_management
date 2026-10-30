import { useEffect, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/common/ConfirmDialog'
import PageTitle from '@/components/common/PageTitle'
import { playNewOrderBeep } from '@/components/queue/beep'
import OrderCard from '@/components/queue/OrderCard'
import {
  itemsFor,
  newOnlineOrderIds,
  placedOnlineIds,
  QUEUE_COLUMNS,
  QUEUE_KEY
} from '@/components/queue/queue-logic'
import QueueColumn from '@/components/queue/QueueColumn'
import RejectDialog from '@/components/queue/RejectDialog'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import { ORDER_STATUS_LABEL } from '@/lib/format'
import type { Order, Queue, StoreInfo } from '@/lib/types'

/**
 * FR-19..FR-21: one board for online and walk-in orders (BR-11), polled every
 * three seconds so a new order is on screen within five (NFR-02). One tap moves
 * an order on (NFR-04); new orders can be rejected with a reason (BR-10).
 */
export default function OrderQueuePage() {
  const client = useQueryClient()
  const [rejecting, setRejecting] = useState<Order | null>(null)
  const [confirmPause, setConfirmPause] = useState(false)
  const seen = useRef<ReadonlySet<number> | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: QUEUE_KEY,
    queryFn: () => api.get<Queue>('/api/admin/orders/queue'),
    refetchInterval: 3000
  })

  // FR-34: tell staff about online orders that were not in the previous poll.
  useEffect(() => {
    if (!data) return
    const fresh = newOnlineOrderIds(seen.current, data.orders)
    seen.current = new Set(placedOnlineIds(data.orders))
    if (fresh.length === 0) return
    for (const id of fresh) {
      const item = data.orders.find(i => i.order.id === id)
      toast.info(`New order ${item?.order.pickupCode ?? `#${id}`}`)
    }
    playNewOrderBeep()
  }, [data])

  const advance = useMutation({
    mutationFn: (id: number) => api.post<Order>(`/api/admin/orders/${id}/advance`),
    onSuccess: order => {
      client.invalidateQueries({ queryKey: QUEUE_KEY })
      toast.success(`${order.pickupCode ?? `#${order.id}`} is ${ORDER_STATUS_LABEL[order.status]}.`)
    },
    onError: e => toast.error(errorMessage(e))
  })

  const onlineOrdering = useMutation({
    mutationFn: (open: boolean) => api.put<StoreInfo>('/api/admin/store/online-ordering', { open }),
    onSuccess: info => {
      client.invalidateQueries({ queryKey: QUEUE_KEY })
      setConfirmPause(false)
      toast.success(info.settings.onlineOrderingOpen ? 'Online ordering is open again.' : 'Online ordering paused.')
    },
    onError: e => toast.error(errorMessage(e))
  })

  const items = data?.orders ?? []
  const serverTime = data?.serverTime ?? new Date().toISOString()
  const open = data?.onlineOrderingOpen ?? true

  return (
    <>
      <PageTitle
        title='Order queue'
        description='Online and walk-in orders in one list, in the order they are due.'
        actions={
          <>
            <span className='text-muted-foreground text-sm'>
              {open ? 'Online ordering is open' : 'Online ordering is paused'}
            </span>
            <Button
              variant={open ? 'outline' : 'default'}
              disabled={onlineOrdering.isPending}
              onClick={() => (open ? setConfirmPause(true) : onlineOrdering.mutate(true))}
            >
              {open ? 'Pause online orders' : 'Resume online orders'}
            </Button>
          </>
        }
      />
      {isLoading && <p className='sr-only'>Loading orders</p>}
      <div className='grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {QUEUE_COLUMNS.map(column => {
          const columnItems = itemsFor(items, column.status)
          return (
            <QueueColumn
              key={column.status}
              title={column.title}
              count={columnItems.length}
              loading={isLoading}
              empty='No orders here.'
            >
              {columnItems.map(item => (
                <OrderCard
                  key={item.order.id}
                  item={item}
                  serverTime={serverTime}
                  busy={advance.isPending && advance.variables === item.order.id}
                  onAdvance={() => advance.mutate(item.order.id)}
                  onReject={() => setRejecting(item.order)}
                />
              ))}
            </QueueColumn>
          )
        })}
      </div>
      {rejecting && <RejectDialog order={rejecting} onClose={() => setRejecting(null)} />}
      <ConfirmDialog
        open={confirmPause}
        onOpenChange={setConfirmPause}
        title='Pause online orders?'
        description="Customers can't place orders in the app until you resume. Orders already placed carry on."
        confirmLabel='Pause ordering'
        destructive
        busy={onlineOrdering.isPending}
        onConfirm={() => onlineOrdering.mutate(false)}
      />
    </>
  )
}
