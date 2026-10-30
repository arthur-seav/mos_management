import type { OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/types'

/** The store's zone (application.properties mos.store.zone). Dates on screen are store-local. */
export const STORE_ZONE = 'Asia/Phnom_Penh'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** "$4.60" */
export function money(value: number): string {
  return usd.format(value)
}

/** "+$0.50", "-$0.50", "+$0.00" */
export function moneySigned(value: number): string {
  return value < 0 ? `-${usd.format(-value)}` : `+${usd.format(value)}`
}

const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: STORE_ZONE, hour: 'numeric', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: STORE_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

/** "10:12 AM" in the store's zone. U+202F (narrow space before AM) is turned into a normal space. */
export function time(iso: string): string {
  return timeFmt.format(new Date(iso)).replace(/\u202f/g, ' ')
}

/** "Thu, Oct 29, 2026" */
export function date(iso: string): string {
  return dateFmt.format(new Date(iso))
}

/** "Thu, Oct 29, 2026 · 10:12 AM" */
export function dateTime(iso: string): string {
  return `${date(iso)} · ${time(iso)}`
}

/** Store-local calendar date "2026-10-29" for a moment (default: now). */
export function storeDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STORE_ZONE }).format(at)
}

/** "just now", "4 min ago", "2 h ago" from the server's clock. */
export function ago(iso: string, now: string | Date = new Date()): string {
  const ms = new Date(now).getTime() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  return `${Math.floor(min / 60)} h ago`
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Pending payment',
  placed: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  abandoned: 'Abandoned'
}

/** What the one-tap button says for the order's next status (NFR-04). */
export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm',
  preparing: 'Start preparing',
  ready: 'Mark ready',
  completed: 'Picked up'
}

export const SOURCE_LABEL: Record<OrderSource, string> = { online: 'Online', walk_in: 'Walk-in' }

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { khqr: 'KHQR', card: 'Card', cash: 'Cash' }

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refund_pending: 'Refund pending',
  refunded: 'Refunded'
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
