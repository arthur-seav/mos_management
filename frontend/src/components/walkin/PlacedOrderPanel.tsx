import { CheckCircle2Icon } from 'lucide-react'
import { Link } from 'react-router'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { money } from '@/lib/format'
import type { Order } from '@/lib/types'

/**
 * After a walk-in order is placed (BR-13): the pickup code to call out, and
 * the total the server charged — not the one this screen added up (NFR-07).
 */
export default function PlacedOrderPanel({ order, onNew }: { order: Order; onNew: () => void }) {
  return (
    <Card>
      <CardContent className='grid justify-items-center gap-4 py-6 text-center'>
        <span className='bg-success-bg text-success flex size-12 items-center justify-center rounded-full'>
          <CheckCircle2Icon className='size-6' />
        </span>
        <div className='grid gap-1'>
          <p className='text-muted-foreground text-sm'>Pickup code</p>
          <p className='text-heading text-mocha text-4xl tracking-widest'>{order.pickupCode ?? '—'}</p>
        </div>
        <p className='text-section'>
          {money(order.totalAmount)} · Paid in cash
        </p>
        <div className='grid w-full gap-2'>
          <Button onClick={onNew}>New order</Button>
          <Link to='/orders/queue' className={buttonVariants({ variant: 'ghost' })}>
            Go to order queue
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
