import { useState, type ReactNode } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/common/ConfirmDialog'
import { OrderStatusBadge, PaymentStatusBadge, SourceBadge } from '@/components/common/StatusBadge'
import { optionSummary, orderTimeline, pickupLabel } from '@/components/orders/orderDetails'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import { dateTime, money, PAYMENT_METHOD_LABEL, time } from '@/lib/format'
import type { Order, Payment } from '@/lib/types'

/**
 * FR-32 / FR-33: everything kept about one order, read-only, except marking a
 * refund as handed back. Opened from the records table and from the queue.
 */
export default function OrderDetailSheet({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => api.get<Order>(`/api/admin/orders/${orderId}`)
  })

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-md' aria-label='Order details'>
        {error ? <div className='p-4'><SheetTitle>Order details</SheetTitle><p role='alert' className='text-destructive'>{errorMessage(error)}</p></div> : isLoading || !order ? (
          <div className='grid gap-3 p-4'>
            <Skeleton className='h-6 w-32' />
            <Skeleton className='h-24 w-full' />
          </div>
        ) : (
          <OrderDetail order={order} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function OrderDetail({ order }: { order: Order }) {
  return (
    <>
      <SheetHeader className='pr-12'>
        <SheetTitle className='text-heading'>{order.pickupCode ?? `Order #${order.id}`}</SheetTitle>
        <SheetDescription>Placed {dateTime(order.placedAt ?? order.createdAt)}</SheetDescription>
        <div className='flex flex-wrap items-center gap-2 pt-1'>
          <OrderStatusBadge status={order.status} />
          <SourceBadge source={order.source} />
        </div>
      </SheetHeader>
      <div className='grid gap-6 px-4 pb-6'>
        <Section title='Pickup'>
          <Row label='When'>{pickupLabel(order)}</Row>
          <Row label='Handled by'>{order.handledBy?.name ?? 'Not assigned'}</Row>
        </Section>

        <Section title='Customer'>
          {order.customer ? (
            <>
              <Row label='Name'>{order.customer.name}</Row>
              <Row label='Email'>{order.customer.email ?? '—'}</Row>
              <Row label='Phone'>{order.customer.phone ?? '—'}</Row>
            </>
          ) : (
            <p className='text-muted-foreground'>Walk-in customer</p>
          )}
        </Section>

        <Section title='Drinks'>
          <ul className='grid gap-3'>
            {order.items.map((item, i) => (
              <li key={i} className='flex items-start justify-between gap-3'>
                <div>
                  <p className='font-medium'>
                    {item.quantity} × {item.productName}
                  </p>
                  {item.optionNames.length > 0 && (
                    <p className='text-muted-foreground text-xs'>{optionSummary(item.optionNames)}</p>
                  )}
                </div>
                <span className='text-price whitespace-nowrap'>{money(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <Separator className='my-3' />
          <div className='flex items-center justify-between'>
            <span className='text-section'>Total</span>
            <span className='text-price'>{money(order.totalAmount)}</span>
          </div>
        </Section>

        {order.note && (
          <Section title='Note'>
            <p>{order.note}</p>
          </Section>
        )}

        {order.rejectReason && (
          <Section title='Reject reason'>
            <p className='text-destructive'>{order.rejectReason}</p>
          </Section>
        )}

        <Section title='Payments'>
          {order.payments.length === 0 ? (
            <p className='text-muted-foreground'>No payment recorded.</p>
          ) : (
            <ul className='grid gap-4'>
              {order.payments.map(payment => (
                <PaymentRow key={payment.id} payment={payment} orderId={order.id} />
              ))}
            </ul>
          )}
        </Section>

        <Section title='Timeline'>
          <ul className='grid gap-2'>
            {orderTimeline(order).map(step => (
              <li key={step.label} className='flex items-center justify-between gap-3'>
                <span className='text-muted-foreground'>{step.label}</span>
                <span>{time(step.at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}

function PaymentRow({ payment, orderId }: { payment: Payment; orderId: number }) {
  const client = useQueryClient()
  const [asking, setAsking] = useState(false)

  const markRefunded = useMutation({
    mutationFn: () => api.post<Order>(`/api/admin/payments/${payment.id}/refunded`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-orders'] })
      client.invalidateQueries({ queryKey: ['admin-order', orderId] })
      toast.success('Refund marked as returned.')
      setAsking(false)
    },
    onError: e => toast.error(errorMessage(e))
  })

  return (
    <li className='grid gap-1.5'>
      <div className='flex items-center justify-between gap-3'>
        <span className='font-medium'>
          {PAYMENT_METHOD_LABEL[payment.method]} {money(payment.amount)}
        </span>
        <PaymentStatusBadge status={payment.status} />
      </div>
      {payment.paidAt && <p className='text-muted-foreground text-xs'>Paid {dateTime(payment.paidAt)}</p>}
      {payment.failureReason && <p className='text-destructive text-xs'>{payment.failureReason}</p>}
      {payment.recordedBy && <p className='text-muted-foreground text-xs'>Recorded by {payment.recordedBy}</p>}
      {payment.status === 'refund_pending' && (
        <>
          <Button variant='outline' size='sm' className='w-fit' onClick={() => setAsking(true)}>
            Mark refunded
          </Button>
          <ConfirmDialog
            open={asking}
            onOpenChange={setAsking}
            title='Mark refunded'
            description='Confirm the money has been returned to the customer.'
            confirmLabel='Mark refunded'
            busy={markRefunded.isPending}
            onConfirm={() => markRefunded.mutate()}
          />
        </>
      )}
    </li>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='grid gap-1.5'>
      <h3 className='text-section text-muted-foreground'>{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='text-right'>{children}</span>
    </div>
  )
}
