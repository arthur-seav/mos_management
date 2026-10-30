import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, SOURCE_LABEL } from '@/lib/format'
import type { OrderSource, OrderStatus, PaymentStatus } from '@/lib/types'

/** SA colours: Caramel for "needs attention", Success for done, Danger for ended early, Muted otherwise. */
const ORDER_TONE: Record<OrderStatus, string> = {
  pending_payment: 'bg-muted text-muted-foreground',
  placed: 'bg-caramel text-primary-foreground',
  confirmed: 'bg-accent text-accent-foreground',
  preparing: 'bg-accent text-accent-foreground',
  ready: 'bg-success-bg text-success',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
  rejected: 'bg-destructive/10 text-destructive',
  abandoned: 'bg-muted text-muted-foreground'
}

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  paid: 'bg-success-bg text-success',
  failed: 'bg-destructive/10 text-destructive',
  refund_pending: 'bg-caramel/15 text-mocha',
  refunded: 'bg-muted text-muted-foreground'
}

const base = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap'

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <span className={cn(base, ORDER_TONE[status], className)}>{ORDER_STATUS_LABEL[status]}</span>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn(base, PAYMENT_TONE[status])}>{PAYMENT_STATUS_LABEL[status]}</span>
}

/** FR-24: where the order came from. */
export function SourceBadge({ source }: { source: OrderSource }) {
  return (
    <span
      className={cn(
        base,
        source === 'online' ? 'bg-primary text-primary-foreground' : 'border-border text-foreground border bg-white'
      )}
    >
      {SOURCE_LABEL[source]}
    </span>
  )
}

/** Active / inactive, sold out / on sale... */
export function FlagBadge({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span className={cn(base, on ? 'bg-success-bg text-success' : 'bg-destructive/10 text-destructive')}>
      {on ? onLabel : offLabel}
    </span>
  )
}
