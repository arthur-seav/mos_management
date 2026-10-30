import { SourceBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { money, NEXT_ACTION_LABEL } from '@/lib/format'
import type { QueueItem } from '@/lib/types'
import { cn } from '@/lib/utils'

import { minutesWaiting, pickupLabel, placedLabel } from './queue-logic'

/**
 * One order on the board: what to make, and one big button for the next step
 * (NFR-04). Reject only shows while the order is still new (BR-10).
 */
export default function OrderCard({
  item,
  serverTime,
  busy,
  onAdvance,
  onReject
}: {
  item: QueueItem
  serverTime: string
  busy?: boolean
  onAdvance: () => void
  onReject: () => void
}) {
  const { order } = item
  const code = order.pickupCode ?? `#${order.id}`
  const nextLabel = item.nextStatus ? NEXT_ACTION_LABEL[item.nextStatus] : undefined

  return (
    <Card
      size='sm'
      role='group'
      aria-label={`Order ${code}`}
      className={cn('gap-3', item.overdue && 'border-destructive ring-destructive border-2')}
    >
      <CardContent className='grid gap-2'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <p className='text-heading'>{code}</p>
            <p className='text-muted-foreground text-xs'>{placedLabel(order, serverTime)}</p>
          </div>
          <SourceBadge source={order.source} />
        </div>
        <p className='text-mocha text-sm font-medium'>{pickupLabel(order)}</p>
        {order.customer && <p className='text-sm'>{order.customer.name}</p>}
        <ul className='grid gap-1'>
          {order.items.map((line, i) => (
            <li key={`${line.productId}-${i}`}>
              <p className='text-sm font-medium'>{`${line.quantity} × ${line.productName}`}</p>
              {line.optionNames.length > 0 && (
                <p className='text-muted-foreground text-xs'>{line.optionNames.join(' · ')}</p>
              )}
            </li>
          ))}
        </ul>
        {order.note && <p className='bg-muted rounded-md px-2 py-1 text-xs'>Note: {order.note}</p>}
        <div className='flex items-center justify-between gap-2'>
          <span className='text-price'>{money(order.totalAmount)}</span>
          {item.overdue && (
            <span className='text-destructive text-xs font-semibold'>
              Waiting over {minutesWaiting(order.readyAt, serverTime)} min
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className='grid gap-2'>
        {nextLabel && (
          <Button size='lg' className='w-full' disabled={busy} onClick={onAdvance}>
            {nextLabel}
          </Button>
        )}
        {order.status === 'placed' && (
          <Button variant='destructive' className='w-full' onClick={onReject}>
            Reject
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
